import { supabase } from './supabase';
import { listLocalSessions, updateLocalSessionSyncStatus } from './db';
import { getDeviceUUID } from './license';
import { loadKioskConfig } from './config';

/**
 * Pushes all pending local sessions to Supabase sessions table and updates booth state.
 * Uses upserts to handle retries and prevent duplicates.
 */
export async function syncPendingSessions(): Promise<{ successCount: number; failedCount: number }> {
  let successCount = 0;
  let failedCount = 0;

  if (!navigator.onLine) {
    console.log('[Sync] Device is offline. Skipping sync.');
    return { successCount, failedCount };
  }

  try {
    const deviceId = await getDeviceUUID();
    const config = loadKioskConfig();
    const allSessions = await listLocalSessions();
    const pending = allSessions.filter(s => s.syncStatus === 'pending');

    console.log(`[Sync] Found ${pending.length} pending sessions to upload.`);

    // 1. Ensure booth exists in Supabase first
    await updateBoothTelemetry(deviceId);

    // 2. Upload sessions one by one
    for (const session of pending) {
      try {
        const profitShare = config.profitSharePercent !== undefined ? config.profitSharePercent : 50.00;
        
        // Calculate shares
        const snapShare = parseFloat(((session.totalAmount * profitShare) / 100).toFixed(2));
        const partnerShare = parseFloat((session.totalAmount - snapShare).toFixed(2));

        const { error } = await supabase
          .from('sessions')
          .upsert({
            id: session.id,
            booth_id: deviceId,
            created_at: session.createdAt,
            layout_type: session.layoutType,
            template_id: session.templateId,
            prints_count: session.printsCount,
            additional_prints: session.additionalPrints,
            total_amount: session.totalAmount,
            snapceipt_share: snapShare,
            partner_share: partnerShare,
            share_id: session.shareId,
            synced_at: new Date().toISOString(),
            package_name: session.packageName,
            package_price: session.packagePrice,
            completion_status: session.completionStatus || 'completed'
          });

        if (error) {
          console.error(`[Sync] Error uploading session ${session.id}:`, error);
          failedCount++;
        } else {
          await updateLocalSessionSyncStatus(session.id, 'synced');
          successCount++;
        }
      } catch (err) {
        console.error(`[Sync] Exception uploading session ${session.id}:`, err);
        failedCount++;
      }
    }

    console.log(`[Sync] Completed: ${successCount} synced, ${failedCount} failed.`);
  } catch (err) {
    console.error('[Sync] Failed to run syncPendingSessions:', err);
  }

  return { successCount, failedCount };
}

/**
 * Updates booth details and last sync time in Supabase.
 */
export async function updateBoothTelemetry(deviceId: string): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const config = loadKioskConfig();
    const appVersion = '1.5.0'; // Snapceipt platform version
    const pricing = config.sessionPrice !== undefined ? config.sessionPrice : 5.00;
    const profitShare = config.profitSharePercent !== undefined ? config.profitSharePercent : 50.00;

    const { error } = await supabase
      .from('booths')
      .upsert({
        id: deviceId,
        name: config.cafeName || 'Unnamed Booth',
        assigned_cafe: config.cafeName || 'Unnamed Café',
        booth_type: config.enableComfortCards ? 'comfort-enabled' : 'classic',
        pricing_per_session: pricing,
        profit_share_percent: profitShare,
        app_version: appVersion,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('[Sync] Failed to update booth telemetry:', error);
    } else {
      console.log('[Sync] Booth telemetry successfully updated.');
    }
  } catch (err) {
    console.error('[Sync] Failed to update booth telemetry exception:', err);
  }
}

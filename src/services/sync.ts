import { supabase } from './supabase';
import { listLocalSessions, updateLocalSessionSyncStatus } from './db';
import { getDeviceUUID } from './license';
import { loadKioskConfig, saveKioskConfig } from './config';

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

    // Query remote configuration sync-down
    try {
      const { data: remoteBooth, error: fetchErr } = await supabase
        .from('booths')
        .select('pricing_per_session, profit_share_percent, paper_prints_remaining, last_collected_at, paper_refilled_at')
        .eq('id', deviceId)
        .single();
      
      if (!fetchErr && remoteBooth) {
        let localChanged = false;
        
        if (remoteBooth.pricing_per_session !== undefined && remoteBooth.pricing_per_session !== null) {
          const remotePrice = parseFloat(remoteBooth.pricing_per_session);
          if (remotePrice !== config.sessionPrice) {
            config.sessionPrice = remotePrice;
            localChanged = true;
          }
        }
        
        if (remoteBooth.profit_share_percent !== undefined && remoteBooth.profit_share_percent !== null) {
          const remoteShare = parseFloat(remoteBooth.profit_share_percent);
          if (remoteShare !== config.profitSharePercent) {
            config.profitSharePercent = remoteShare;
            localChanged = true;
          }
        }
        
        if (remoteBooth.paper_refilled_at) {
          const localRefilledAt = config.paperRefilledAt ? new Date(config.paperRefilledAt) : new Date(0);
          const remoteRefilledAt = new Date(remoteBooth.paper_refilled_at);
          
          if (remoteRefilledAt > localRefilledAt) {
            config.paperPrintsRemaining = remoteBooth.paper_prints_remaining !== undefined ? remoteBooth.paper_prints_remaining : 150;
            config.paperRefilledAt = remoteBooth.paper_refilled_at;
            localChanged = true;
            console.log('[Sync] Remote paper refill detected. Syncing down paper count:', config.paperPrintsRemaining);
          }
        }

        if (remoteBooth.last_collected_at) {
          const cached = localStorage.getItem('kiosk_last_collected_at');
          if (!cached || new Date(remoteBooth.last_collected_at) > new Date(cached)) {
            localStorage.setItem('kiosk_last_collected_at', remoteBooth.last_collected_at);
            localChanged = true;
          }
        }
        
        if (localChanged) {
          saveKioskConfig(config);
          console.log('[Sync] Remote configuration sync-down completed successfully.');
          window.dispatchEvent(new CustomEvent('kiosk-config-updated'));
        }
      }
    } catch (err) {
      console.warn('[Sync] Failed to query remote config for sync-down:', err);
    }

    const pricing = config.sessionPrice !== undefined ? config.sessionPrice : 5.00;
    const profitShare = config.profitSharePercent !== undefined ? config.profitSharePercent : 50.00;
    const cachedLastCollected = localStorage.getItem('kiosk_last_collected_at');
    const location = config.cafeAddress || 'Unknown Location';

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
        updated_at: new Date().toISOString(),
        location: location,
        paper_max_prints: config.paperMaxPrints || 150,
        paper_prints_remaining: config.paperPrintsRemaining !== undefined ? config.paperPrintsRemaining : 150,
        paper_refilled_at: config.paperRefilledAt || new Date(2026, 0, 1).toISOString(),
        ...(cachedLastCollected ? { last_collected_at: cachedLastCollected } : {})
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

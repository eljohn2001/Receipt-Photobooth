import { supabase } from './supabase';

export interface PaymentVerificationResult {
  success: boolean;
  error?: string;
  isOffline?: boolean;
  refNo?: string;
  amount?: number;
}

/**
 * Verifies a customer's GCash Mobile Number (last 4 digits) against the Supabase `verified_payments` table.
 * @param refNo The last 4 digits of the sender's mobile number entered by the customer (e.g. "5222")
 * @param expectedAmount The total amount due for the session (e.g. 30.0)
 */
export async function verifyPaymentRefOnline(
  refNo: string,
  expectedAmount?: number
): Promise<PaymentVerificationResult> {
  const cleanedRef = refNo.replace(/[^0-9]/g, '').trim();

  if (!cleanedRef || cleanedRef.length !== 4) {
    return {
      success: false,
      error: 'Please enter exactly the last 4 digits of your GCash mobile number.'
    };
  }

  try {
    // 1. Query Supabase verified_payments table
    const { data: records, error } = await supabase
      .from('verified_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('Supabase query error for verified_payments:', error);
      // Table might not exist yet or offline
      return {
        success: false,
        isOffline: true,
        error: 'Payment database table not found or offline. Staff can use Admin PIN to unlock.'
      };
    }

    if (!records || records.length === 0) {
      return {
        success: false,
        error: 'No GCash payment notification detected yet. Please wait 5 seconds and try again.'
      };
    }

    // 2. Search for matching GCash mobile number ending (or ref_no)
    const match = records.find((rec: any) => {
      const recRef = String(rec.ref_no || rec.phone_no || '').replace(/[^0-9]/g, '').trim();
      const isRefMatch = recRef === cleanedRef || recRef.endsWith(cleanedRef) || cleanedRef.endsWith(recRef);
      const isNotUsed = !rec.is_used;
      return isRefMatch && isNotUsed;
    });

    if (!match) {
      return {
        success: false,
        error: 'GCash payment not detected for this mobile number. Please check the digits entered or ask staff.'
      };
    }

    // 3. Mark the payment record as used so it cannot be claimed twice
    await supabase
      .from('verified_payments')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', match.id);

    return {
      success: true,
      refNo: match.ref_no || cleanedRef,
      amount: match.amount || expectedAmount
    };

  } catch (err) {
    console.error('Exception verifying payment reference:', err);
    return {
      success: false,
      isOffline: true,
      error: 'Network connection issue. Ask staff to assist with Admin PIN bypass.'
    };
  }
}

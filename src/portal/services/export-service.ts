import type { SessionRecord } from '../types';

export function exportSessionsToCsv(sessions: SessionRecord[], orgName: string): void {
  if (!sessions || sessions.length === 0) {
    alert('No sessions available to export.');
    return;
  }

  const headers = ['Transaction ID', 'Date & Time', 'Booth Name', 'Location', 'Package', 'Amount (PHP)', 'Snap Share', 'Partner Share', 'Payment Method', 'Status'];
  
  const rows = sessions.map(s => [
    s.id,
    `"${new Date(s.createdAt).toLocaleString()}"`,
    `"${s.boothName}"`,
    `"${s.location}"`,
    `"${s.packageName || 'Standard'}"`,
    s.totalAmount,
    s.snapShare,
    s.partnerShare,
    s.paymentMethod,
    s.completionStatus
  ]);

  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${orgName.toLowerCase().replace(/\s+/g, '_')}_transactions_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

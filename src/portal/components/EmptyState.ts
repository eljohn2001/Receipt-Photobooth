export function renderEmptyState(
  icon: string,
  title: string,
  message: string,
  actionButtonText?: string,
  actionButtonId?: string
): string {
  return `
    <div class="card-panel" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; text-align: center; margin: 20px 0;">
      <div style="font-size: 42px; margin-bottom: 12px;">${icon}</div>
      <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">${title}</h3>
      <p style="font-size: 13px; color: var(--text-secondary); max-width: 400px; margin-bottom: 20px; line-height: 1.5;">${message}</p>
      ${actionButtonText && actionButtonId ? `
        <button class="btn-portal btn-portal-primary" id="${actionButtonId}">
          ${actionButtonText}
        </button>
      ` : ''}
    </div>
  `;
}

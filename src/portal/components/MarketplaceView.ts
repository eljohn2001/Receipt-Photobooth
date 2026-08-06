export function renderMarketplaceView(): string {
  return `
    <div class="marketplace-view">
      <div class="page-header">
        <div class="page-title-group">
          <h1>Scalability Hub & Template Store</h1>
          <p>Extend your photobooth experience with seasonal templates, AI predictive maintenance, and loyalty programs.</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
        <!-- Card 1: Template Store -->
        <div class="card-panel" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 28px; margin-bottom: 12px;">🎨</div>
            <h2 style="font-size: 16px; font-weight: 700; color: var(--text-primary);">Template Store & Themes</h2>
            <p style="font-size: 12.5px; color: var(--text-secondary); margin-top: 6px;">
              Access 50+ seasonal photobooth design templates (Christmas, Weddings, Summer Palms, Cyberpunk). Remote push to kiosks in 1-click.
            </p>
          </div>
          <button class="btn-portal btn-portal-primary btn-portal-sm" style="margin-top: 16px;">
            Browse Store (Coming Soon)
          </button>
        </div>

        <!-- Card 2: AI Predictive Maintenance -->
        <div class="card-panel" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 28px; margin-bottom: 12px;">🤖</div>
            <h2 style="font-size: 16px; font-weight: 700; color: var(--text-primary);">AI Predictive Maintenance</h2>
            <p style="font-size: 12.5px; color: var(--text-secondary); margin-top: 6px;">
              AI algorithms analyze session velocity to accurately predict exact paper roll depletion dates and forecast peak weekend revenue.
            </p>
          </div>
          <button class="btn-portal btn-portal-secondary btn-portal-sm" style="margin-top: 16px;">
            Enable AI Insights (Beta)
          </button>
        </div>

        <!-- Card 3: OTA Firmware Updater -->
        <div class="card-panel" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 28px; margin-bottom: 12px;">🚀</div>
            <h2 style="font-size: 16px; font-weight: 700; color: var(--text-primary);">Over-The-Air Firmware Push</h2>
            <p style="font-size: 12.5px; color: var(--text-secondary); margin-top: 6px;">
              Remotely update kiosk application software v1.5.0 across your entire booth network without physical site visits.
            </p>
          </div>
          <button class="btn-portal btn-portal-secondary btn-portal-sm" style="margin-top: 16px;">
            Check System Updates
          </button>
        </div>

        <!-- Card 4: Customer Loyalty -->
        <div class="card-panel" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 28px; margin-bottom: 12px;">❤️</div>
            <h2 style="font-size: 16px; font-weight: 700; color: var(--text-primary);">Digital Scrapbook & Loyalty</h2>
            <p style="font-size: 12.5px; color: var(--text-secondary); margin-top: 6px;">
              Reward repeat café customers who collect digital receipt scans on their mobile devices with free coffee perks.
            </p>
          </div>
          <button class="btn-portal btn-portal-secondary btn-portal-sm" style="margin-top: 16px;">
            Configure Loyalty
          </button>
        </div>
      </div>
    </div>
  `;
}

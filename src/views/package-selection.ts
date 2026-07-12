import { BaseView } from './base';
import type { AppSession, PrintPackage } from '../types';
import { loadKioskConfig } from '../services/config';
import { audioManager } from '../services/audio';

export class PackageSelectionView extends BaseView {
  private activeSession: AppSession;

  constructor(
    element: HTMLElement,
    navigateTo: (state: any, params?: any) => void,
    session: AppSession
  ) {
    super(element, navigateTo);
    this.activeSession = session;
  }

  mount(): void {
    this.element.innerHTML = `
      <div class="template-screen-content">
        <div class="template-screen-header">
          <h2 class="template-choose-title">CHOOSE A <span class="script-title">Package</span></h2>
          <p style="margin-top: -10px; font-size: 14px; color: var(--text-secondary);">Select the number of prints for your receipt photo strip.</p>
        </div>

        <div class="packages-grid-wrapper" style="width: 100%; max-width: 800px; margin: 30px auto; padding: 0 20px; box-sizing: border-box;">
          <div class="packages-list-grid" id="packages-list-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <div class="template-screen-footer">
          <button class="btn-tmpl-back-minimal-center" id="btn-pkg-back">← BACK TO LAYOUT</button>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  unmount(): void {}

  onEnter(): void {
    this.renderPackages();
  }

  private setupEvents(): void {
    const backBtn = this.element.querySelector('#btn-pkg-back');
    backBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      audioManager.playBeep();
      this.navigateTo('template-selection');
    });
  }

  private renderPackages(): void {
    const gridContainer = this.element.querySelector('#packages-list-grid');
    if (!gridContainer) return;

    const config = loadKioskConfig();
    const currency = config.currencySymbol || '₱';

    // Get enabled packages, fallback if empty
    let pkgs: PrintPackage[] = (config.packages || []).filter(p => p.isEnabled);
    if (pkgs.length === 0) {
      pkgs = [
        { id: 'pkg-1', name: '1 Print', printsCount: 1, price: 30, isEnabled: true },
        { id: 'pkg-2', name: '2 Prints', printsCount: 2, price: 40, isEnabled: true },
        { id: 'pkg-3', name: '3 Prints', printsCount: 3, price: 50, isEnabled: true },
        { id: 'pkg-4', name: '4 Prints', printsCount: 4, price: 60, isEnabled: true }
      ];
    }

    gridContainer.innerHTML = pkgs.map((pkg) => {
      const formattedPrice = `${currency}${pkg.price.toFixed(2)}`;
      return `
        <div class="package-card-option" data-pkg-id="${pkg.id}" style="
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
        ">
          <div style="font-size: 32px; margin-bottom: 12px;">🖨️</div>
          <h3 style="font-size: 20px; font-weight: 700; margin: 0 0 4px; font-family: var(--font-ui); color: var(--text-primary);">${pkg.name}</h3>
          <p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 16px;">Prints ${pkg.printsCount} photo strip copies</p>
          <div style="
            font-size: 24px;
            font-weight: 800;
            color: var(--text-primary);
            font-family: var(--font-ui);
            background: var(--bg-tertiary);
            padding: 8px 16px;
            border-radius: 8px;
            display: inline-block;
          ">${formattedPrice}</div>
        </div>
      `;
    }).join('');

    // Wire up clicks
    const cards = this.element.querySelectorAll('.package-card-option');
    cards.forEach((card) => {
      // Add hover styles dynamically via JS for simplicity and consistency
      card.addEventListener('mouseenter', () => {
        (card as HTMLElement).style.transform = 'translateY(-4px)';
        (card as HTMLElement).style.boxShadow = '0 8px 16px rgba(0,0,0,0.06)';
        (card as HTMLElement).style.borderColor = 'var(--text-primary)';
      });
      card.addEventListener('mouseleave', () => {
        (card as HTMLElement).style.transform = 'none';
        (card as HTMLElement).style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)';
        (card as HTMLElement).style.borderColor = 'var(--border-primary)';
      });

      card.addEventListener('click', () => {
        const pkgId = card.getAttribute('data-pkg-id');
        const selected = pkgs.find(p => p.id === pkgId);
        if (selected) {
          audioManager.playBeep();
          this.activeSession.selectedPackage = selected;
          this.navigateTo('order-summary');
        }
      });
    });
  }
}

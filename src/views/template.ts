import { BaseView } from './base';
import { TEMPLATES } from '../templates';
import type { AppSession } from '../types';
import { loadKioskConfig } from '../services/config';

import template1 from '../assets/template 1.png';
import template2 from '../assets/template 2.png';
import template3 from '../assets/template 3.png';
import template4 from '../assets/template 4.png';

export class TemplateView extends BaseView {
  private currentSession: AppSession;

  constructor(
    element: HTMLElement,
    navigateTo: (state: any, params?: any) => void,
    session: AppSession
  ) {
    super(element, navigateTo);
    this.currentSession = session;
  }

  mount(): void {
    this.element.innerHTML = `
      <div class="template-screen-content">
        <div class="template-screen-header">
          <button class="btn-tmpl-back-minimal" id="btn-tmpl-back">← BACK</button>
          <h2 class="template-choose-title">CHOOSE A <span class="script-title">Layout</span></h2>
          <div style="width: 80px;"></div> <!-- Spacer to center title -->
        </div>

        <!-- Static 2x2 Grid Layout for the 4 Mockup Cards -->
        <div class="templates-grid-wrapper">
          <div class="templates-static-grid">
            <!-- Populated dynamically by renderTemplatesGrid in onEnter -->
          </div>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  unmount(): void {}

  onEnter(): void {
    this.renderTemplatesGrid();
  }

  private setupEvents(): void {
    // Back button to Welcome Screen
    const backBtn = this.element.querySelector('#btn-tmpl-back');
    backBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigateTo('idle');
    });
  }

  private renderTemplatesGrid(): void {
    const gridContainer = this.element.querySelector('.templates-static-grid');
    if (!gridContainer) return;

    const config = loadKioskConfig();

    gridContainer.innerHTML = TEMPLATES.map((tmpl) => `
      <div class="template-selection-item">
        <div class="template-card-mockup-png-wrapper" data-template-id="${tmpl.id}">
          <img class="template-mockup-png-bg" src="${this.getMockupImgSrc(tmpl.id)}" alt="${tmpl.name}" />
          <div class="template-card-logo-overlay">
            ${this.renderOverlayLogo(config)}
          </div>
        </div>
        <h3 class="template-mockup-name">${tmpl.name}</h3>
      </div>
    `).join('');

    // Wire up card clicks
    const cards = this.element.querySelectorAll('.template-card-mockup-png-wrapper');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-template-id');
        if (id) {
          this.currentSession.selectedTemplateId = id;
          this.navigateTo('camera-capture');
        }
      });
    });
  }

  private renderOverlayLogo(config: any): string {
    if (config.logoDataUrl) {
      return `<img class="overlay-cafe-logo" src="${config.logoDataUrl}" alt="${config.cafeName}" />`;
    }
    return `<span class="overlay-cafe-name">${config.cafeName}</span>`;
  }

  private getMockupImgSrc(id: string): string {
    switch (id) {
      case 'classic-solo':
        return template1;
      case 'duet-grid':
        return template2;
      case 'film-stack':
        return template3;
      case 'hex-grid':
        return template4;
      default:
        return '';
    }
  }
}

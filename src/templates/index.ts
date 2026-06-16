import type { ReceiptTemplate } from '../types';
import { classicSoloTemplate } from './classic-solo';
import { duetGridTemplate } from './duet-grid';
import { filmStackTemplate } from './film-stack';
import { hexGridTemplate } from './hex-grid';

// Registry of all available templates
export const TEMPLATES: ReceiptTemplate[] = [
  classicSoloTemplate,
  duetGridTemplate,
  filmStackTemplate,
  hexGridTemplate
];

export function getTemplateById(id: string): ReceiptTemplate | undefined {
  return TEMPLATES.find(template => template.id === id);
}

export interface ThemeOption {
  id: string;
  name: string;
  src: string;
}

export const THEMES_BY_TEMPLATE: Record<string, ThemeOption[]> = {
  'classic-solo': [
    { id: 'default', name: 'Default Plain', src: '' },
    { id: 'classic-1', name: 'Vintage Frame 1', src: '' },
    { id: 'classic-2', name: 'Vintage Frame 2', src: '' }
  ],
  'duet-grid': [
    { id: 'default', name: 'Default Plain', src: '' },
    { id: 'duet-1', name: 'Grid Frame', src: '' }
  ],
  'film-stack': [
    { id: 'default', name: 'Default Plain', src: '' },
    { id: 'film-1', name: 'Cinema Frame', src: '' }
  ],
  'hex-grid': [
    { id: 'default', name: 'Default Plain', src: '' }
  ]
};

export function getThemeById(templateId: string, themeId: string): ThemeOption | undefined {
  const list = THEMES_BY_TEMPLATE[templateId] || [];
  return list.find(t => t.id === themeId);
}

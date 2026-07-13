import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const hapticService = {
  async impactLight() {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Ignored
    }
  },

  async impactMedium() {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      // Ignored
    }
  },

  async impactHeavy() {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      // Ignored
    }
  },

  async selection() {
    try {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } catch (e) {
      // Ignored
    }
  }
};

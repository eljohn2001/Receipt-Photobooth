import type { AppState } from '../types';

export abstract class BaseView {
  protected element: HTMLElement;
  protected navigateTo: (state: AppState, params?: any) => void;

  constructor(
    element: HTMLElement,
    navigateTo: (state: AppState, params?: any) => void
  ) {
    this.element = element;
    this.navigateTo = navigateTo;
  }

  /**
   * Run once when the view is initialized (e.g. setting up structural HTML).
   */
  abstract mount(): void;

  /**
   * Clean up event listeners, intervals, streams etc. when view is destroyed.
   */
  abstract unmount(): void;

  /**
   * Called when the view becomes active.
   */
  onEnter?(params?: any): void | Promise<void>;

  /**
   * Called when navigating away from this view.
   */
  onLeave?(): void | Promise<void>;
}

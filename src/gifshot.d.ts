declare module 'gifshot' {
  export interface GIFOptions {
    images?: string[] | HTMLImageElement[] | HTMLElement[];
    gifWidth?: number;
    gifHeight?: number;
    interval?: number;
    numWorkers?: number;
    sampleInterval?: number;
    frameDuration?: number;
  }

  export interface GIFResult {
    error: boolean;
    errorCode?: string;
    errorMsg?: string;
    image: string;
  }

  export function createGIF(
    options: GIFOptions,
    callback: (result: GIFResult) => void
  ): void;
}

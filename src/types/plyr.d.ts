// Ambient override to fix Plyr's mixed export = / export default in bundler moduleResolution.
declare module 'plyr' {
  export { Plyr as default };
  namespace Plyr {
    interface Options {
      controls?: string[];
      settings?: string[];
      youtube?: Record<string, unknown>;
      vimeo?: Record<string, unknown>;
      resetOnEnd?: boolean;
      tooltips?: { controls?: boolean; seek?: boolean };
      [key: string]: unknown;
    }
  }
  class Plyr {
    constructor(target: string | Element, options?: Plyr.Options);
    destroy(): void;
    play(): Promise<void> | void;
    pause(): void;
    stop(): void;
    on(event: string, callback: (event: Event) => void): void;
    readonly source: string;
  }
}

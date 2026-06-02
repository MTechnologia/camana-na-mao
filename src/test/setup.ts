import "@testing-library/jest-dom/vitest";

globalThis.ResizeObserver = class ResizeObserver implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element) {
    const rect = new DOMRectReadOnly(0, 0, 480, 320);
    this.callback(
      [
        {
          target,
          contentRect: rect,
          borderBoxSize: [{ inlineSize: 480, blockSize: 320 }],
          contentBoxSize: [{ inlineSize: 480, blockSize: 320 }],
          devicePixelContentBoxSize: [{ inlineSize: 480, blockSize: 320 }],
        } as ResizeObserverEntry,
      ],
      this,
    );
  }

  unobserve() {}

  disconnect() {}
};

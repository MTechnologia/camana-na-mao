import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Test runners in CI don't load the app's local .env files.
// Stub the public Supabase envs so modules that import the shared client
// can be loaded safely and mocked by individual tests.
vi.stubEnv("CAMARA_URL", "http://127.0.0.1:54321");
vi.stubEnv("CAMARA_PUBLISHABLE_KEY", "test-publishable-key");

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
      this
    );
  }

  unobserve() {}

  disconnect() {}
};

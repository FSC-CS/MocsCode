/// <reference types="@testing-library/jest-dom" />

import { afterEach, vi, expect } from 'vitest';
import { cleanup } from '@testing-library/react';

// Extend window interface for test environment
declare global {
  interface Window {
    ResizeObserver: ResizeObserverConstructor;
  }
}

interface ResizeObserverConstructor {
  new (callback: ResizeObserverCallback): ResizeObserver;
  prototype: ResizeObserver;
}

// Extend matchers
expect.extend({});

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

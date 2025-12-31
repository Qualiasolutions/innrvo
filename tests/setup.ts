import '@testing-library/jest-dom';
import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

// Mock AudioContext for audio tests
class MockAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 24000;

  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: () => new Float32Array(length),
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
  }

  decodeAudioData(arrayBuffer: ArrayBuffer) {
    return Promise.resolve(this.createBuffer(1, 48000, 24000));
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }

  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }

  get destination() {
    return {};
  }
}

// @ts-ignore
globalThis.AudioContext = MockAudioContext;
// @ts-ignore
globalThis.webkitAudioContext = MockAudioContext;

// Mock Audio constructor for background music tests
class MockHTMLAudioElement {
  src = '';
  volume = 1;
  loop = false;
  paused = true;
  currentTime = 0;
  preload = '';
  private listeners: Map<string, ((e?: Event) => void)[]> = new Map();

  constructor(src?: string) {
    if (src) this.src = src;
  }

  addEventListener(event: string, callback: (e?: Event) => void, _options?: any) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    // Auto-trigger canplaythrough for tests
    if (event === 'canplaythrough') {
      setTimeout(() => callback(), 0);
    }
  }

  removeEventListener(event: string, callback: (e?: Event) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) eventListeners.splice(index, 1);
    }
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  load() {
    // Simulate canplaythrough after load
    const canPlayCallbacks = this.listeners.get('canplaythrough') || [];
    canPlayCallbacks.forEach(cb => setTimeout(() => cb(), 0));
  }
}

// @ts-ignore
globalThis.Audio = MockHTMLAudioElement;

// Mock MediaRecorder
class MockMediaRecorder {
  static isTypeSupported = () => true;
  state = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((e: Error) => void) | null = null;

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['test'], { type: 'audio/webm' }) });
    }
    if (this.onstop) {
      this.onstop();
    }
  }
}

// @ts-ignore
globalThis.MediaRecorder = MockMediaRecorder;

// Mock fetch for API tests
globalThis.fetch = vi.fn();

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Console error spy to catch React warnings
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

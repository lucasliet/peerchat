import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePeerChat } from '../usePeerChat';
import { ChatState, PeerUser } from '../../types';

// Mock PeerJS (Copied from existing tests to ensure isolation)
let mockPeerInstance: any;
vi.mock('peerjs', () => {
  const handlers: Record<string, Function[]> = {};

  const MockPeer = vi.fn(function (this: any, id?: string) {
    this.id = id || 'test-peer-id';
    this.handlers = handlers;
    this.on = vi.fn((event: string, handler: Function) => {
      if (!this.handlers[event]) this.handlers[event] = [];
      this.handlers[event].push(handler);
    });
    this.connect = vi.fn(() => ({
      on: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      peer: 'mock-peer',
      open: true,
    }));
    this.call = vi.fn(() => ({
      on: vi.fn(),
      close: vi.fn(),
      peer: 'mock-peer',
      answer: vi.fn(),
      peerConnection: {
        getSenders: vi.fn(() => []),
      },
    }));
    this.destroy = vi.fn();
    this._trigger = (event: string, ...args: any[]) => {
      if (this.handlers[event]) {
        this.handlers[event].forEach((h: Function) => h(...args));
      }
    };
    mockPeerInstance = this;
    return this;
  });

  return {
    default: MockPeer,
  };
});

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
if (typeof globalThis.navigator === 'undefined') {
  (globalThis as any).navigator = {};
}
Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
});

// Mock crypto.randomUUID
if (!globalThis.crypto) {
  (globalThis as any).crypto = {};
}
if (!globalThis.crypto.randomUUID) {
  let sequenceNum = 0;
  globalThis.crypto.randomUUID = () => {
    const seg1 = (sequenceNum++).toString(16).padStart(8, '0');
    return `${seg1}-0000-0000-0000-000000000000`;
  };
}

describe('usePeerChat - Protocol Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle unknown message type gracefully', async () => {
    const { result } = renderHook(() => usePeerChat());

    act(() => {
      result.current.createRoom();
    });
    act(() => {
      mockPeerInstance._trigger('open', 'host-peer-id');
    });

    // Simulate incoming connection
    const mockConn = {
      peer: 'guest-peer',
      on: vi.fn(),
      send: vi.fn(),
      open: true,
      close: vi.fn(),
    };

    // Trigger connection event
    await act(async () => {
      mockPeerInstance._trigger('connection', mockConn);
    });

    // Simulate unknown message type
    const unknownDataHandler = (mockConn.on as any).mock.calls.find((call: any) => call[0] === 'data')[1];

    act(() => {
      unknownDataHandler({ type: 'UNKNOWN_TYPE', payload: {} });
    });

    // Should not crash and state should remain stable
    expect(result.current.error).toBeNull();
  });

  it('should ignore malformed payload', async () => {
    const { result } = renderHook(() => usePeerChat());

    act(() => {
      result.current.createRoom();
    });
    act(() => {
      mockPeerInstance._trigger('open', 'host-peer-id');
    });

    const mockConn = {
      peer: 'guest-peer',
      on: vi.fn(),
      send: vi.fn(),
      open: true,
      close: vi.fn(),
    };

    await act(async () => {
      mockPeerInstance._trigger('connection', mockConn);
    });

    const dataHandler = (mockConn.on as any).mock.calls.find((call: any) => call[0] === 'data')[1];

    // Simulate malformed payload for chat
    act(() => {
      dataHandler({ type: 'chat', payload: null });
    });

    // Should not crash, might throw error in console but test should pass if no exception
    expect(result.current.error).toBeNull();
  });

  it('should handle user_list_sync correctly', async () => {
    const { result } = renderHook(() => usePeerChat());

    // Setup as Guest
    act(() => {
      result.current.joinRoom('1234');
    });

    // TRIGGER OPEN EVENT TO CAUSE CONNECT
    act(() => {
      mockPeerInstance._trigger('open', 'guest-id');
    });

    // Get connection from joinRoom
    const hostConnMock = (mockPeerInstance.connect as any).mock.results[0].value;

    // Simulate connection open
    const openHandler = (hostConnMock.on as any).mock.calls.find((call: any) => call[0] === 'open')[1];
    act(() => {
      openHandler();
    });

    const dataHandler = (hostConnMock.on as any).mock.calls.find((call: any) => call[0] === 'data')[1];

    const newUsers: PeerUser[] = [
      { id: '1', name: 'User 1', color: '#000', isMuted: false, isVideoOff: false },
      { id: '2', name: 'User 2', color: '#FFF', isMuted: true, isVideoOff: true }
    ];

    act(() => {
      dataHandler({ type: 'user_list_sync', payload: newUsers });
    });

    expect(result.current.users).toHaveLength(2);
    expect(result.current.users[0].name).toBe('User 1');
  });

  it('should handle room_update', async () => {
    const { result } = renderHook(() => usePeerChat());

    act(() => {
      result.current.joinRoom('1234');
    });

    // TRIGGER OPEN EVENT TO CAUSE CONNECT
    act(() => {
      mockPeerInstance._trigger('open', 'guest-id');
    });

    const hostConnMock = (mockPeerInstance.connect as any).mock.results[0].value;
    const openHandler = (hostConnMock.on as any).mock.calls.find((call: any) => call[0] === 'open')[1];
    act(() => { openHandler(); });

    const dataHandler = (hostConnMock.on as any).mock.calls.find((call: any) => call[0] === 'data')[1];

    act(() => {
      dataHandler({ type: 'room_update', payload: { name: 'New Room Name' } });
    });

    expect(result.current.roomName).toBe('New Room Name');
  });
});

describe('usePeerChat - Broadcast Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should broadcast messages to all connected peers but exclude sender for chat messages', async () => {
    const { result } = renderHook(() => usePeerChat());

    act(() => { result.current.createRoom(); });
    act(() => { mockPeerInstance._trigger('open', 'host-peer-id'); });

    // Connect Peer A
    const connA = { peer: 'peer-A', on: vi.fn(), send: vi.fn(), open: true, close: vi.fn() };
    await act(async () => { mockPeerInstance._trigger('connection', connA); });
    const connAOpen = (connA.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => connAOpen());

    // Connect Peer B
    const connB = { peer: 'peer-B', on: vi.fn(), send: vi.fn(), open: true, close: vi.fn() };
    await act(async () => { mockPeerInstance._trigger('connection', connB); });
    const connBOpen = (connB.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => connBOpen());

    // Peer A sends a message
    const dataHandlerA = (connA.on as any).mock.calls.find((call: any) => call[0] === 'data')[1];
    const chatMsg = {
      type: 'chat',
      payload: { id: 'msg1', content: 'Hi', senderId: 'peer-A', type: 'text' }
    };

    act(() => {
      dataHandlerA(chatMsg);
    });

    // Should broadcast to B, but NOT back to A
    expect(connB.send).toHaveBeenCalledWith(chatMsg);
    expect(connA.send).not.toHaveBeenCalledWith(chatMsg);
  });
});

describe('usePeerChat - Edge Cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should allow joining room with 0000 code', () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.joinRoom('0000'); });
    expect(result.current.status).toBe('connecting');
    expect(result.current.roomId).toBe('0000');
  });

  it('should NOT allow joining room with empty code', () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.joinRoom(''); });
    expect(result.current.status).toBe('idle');
  });

  it('should handle sending message with empty string (allowed by hook, UI should prevent)', () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.sendMessage(''); });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('');
  });

  it('should handle very long messages', () => {
    const { result } = renderHook(() => usePeerChat());
    const longText = 'a'.repeat(10000);
    act(() => { result.current.sendMessage(longText); });
    expect(result.current.messages[0].content).toHaveLength(10000);
  });
});

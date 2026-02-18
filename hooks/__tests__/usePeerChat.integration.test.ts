import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePeerChat } from '../usePeerChat';

let mockPeerInstance: any;
vi.mock('peerjs', () => {
  const MockPeer = vi.fn(function (this: any, id?: string) {
    const handlers: Record<string, Function[]> = {};
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
      peerConnection: { getSenders: vi.fn(() => []) },
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
  return { default: MockPeer };
});

const mockGetUserMedia = vi.fn();
if (typeof globalThis.navigator === 'undefined') {
  (globalThis as any).navigator = {};
}
Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  writable: true,
  value: { getUserMedia: mockGetUserMedia },
});

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillStyle: '',
  fillRect: vi.fn(),
})) as any;
HTMLCanvasElement.prototype.captureStream = vi.fn(() => ({
  getVideoTracks: () => [{ kind: 'video', stop: vi.fn(), enabled: true }],
})) as any;

if (typeof globalThis.MediaStream === 'undefined') {
  (globalThis as any).MediaStream = class MediaStream {
    tracks: any[];
    constructor(tracks?: any[]) { this.tracks = tracks || []; }
    getTracks() { return this.tracks; }
    getAudioTracks() { return this.tracks.filter((t: any) => t.kind === 'audio'); }
    getVideoTracks() { return this.tracks.filter((t: any) => t.kind === 'video'); }
    addTrack(t: any) { this.tracks.push(t); }
    removeTrack(t: any) { this.tracks = this.tracks.filter((x: any) => x !== t); }
  };
}

/**
 * Wires two hook instances together so that messages sent by one side
 * are delivered to the data handler of the other side, simulating
 * the PeerJS signalling layer without a real network.
 */
async function connectHostAndGuest() {
  const { result: host } = renderHook(() => usePeerChat());
  act(() => { host.current.createRoom(); });
  const hostPeer = mockPeerInstance;
  act(() => { hostPeer._trigger('open', 'peerchat-1234'); });

  const { result: guest } = renderHook(() => usePeerChat());
  act(() => { guest.current.joinRoom('1234'); });
  const guestPeer = mockPeerInstance;

  act(() => { guestPeer._trigger('open', 'guest-peer-id'); });
  const guestHostConn = guestPeer.connect.mock.results[0].value;

  const hostGuestConn = {
    peer: 'guest-peer-id',
    on: vi.fn(),
    send: vi.fn(),
    open: true,
    close: vi.fn(),
  };

  await act(async () => { hostPeer._trigger('connection', hostGuestConn); });

  (hostGuestConn.send as any).mockImplementation((msg: any) => {
    const guestDataH = (guestHostConn.on as any).mock.calls.find((c: any) => c[0] === 'data')?.[1];
    if (guestDataH) guestDataH(msg);
  });

  (guestHostConn.send as any).mockImplementation((msg: any) => {
    const hostDataH = (hostGuestConn.on as any).mock.calls.find((c: any) => c[0] === 'data')?.[1];
    if (hostDataH) hostDataH(msg);
  });

  const guestSideOpenH = (guestHostConn.on as any).mock.calls.find((c: any) => c[0] === 'open')?.[1];
  const hostSideOpenH = (hostGuestConn.on as any).mock.calls.find((c: any) => c[0] === 'open')?.[1];

  act(() => { if (guestSideOpenH) guestSideOpenH(); });
  act(() => { if (hostSideOpenH) hostSideOpenH(); });

  return { host, guest, hostPeer, guestPeer, hostGuestConn, guestHostConn };
}

describe('usePeerChat – Integration: host-guest connection', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should reflect guest in host user list after connection', async () => {
    const { host, guest } = await connectHostAndGuest();

    await waitFor(() => {
      expect(host.current.users).toHaveLength(2);
      expect(guest.current.users).toHaveLength(2);
    });
  });

  it('should give guest the correct room name via room_update', async () => {
    const { guest, host } = await connectHostAndGuest();

    await waitFor(() => {
      expect(guest.current.roomName).toBe(host.current.roomName);
      expect(guest.current.roomName).toMatch(/^Room \d{4}$/);
    });
  });

  it('should set both sides to status connected after handshake', async () => {
    const { host, guest } = await connectHostAndGuest();

    await waitFor(() => {
      expect(host.current.status).toBe('connected');
      expect(guest.current.status).toBe('connected');
    });
  });

  it('should mark host as isHost and guest as not isHost', async () => {
    const { host, guest } = await connectHostAndGuest();

    expect(host.current.isHost).toBe(true);
    expect(guest.current.isHost).toBe(false);
  });

  it('should emit system message on host when guest connects', async () => {
    const { host } = await connectHostAndGuest();

    await waitFor(() => {
      expect(
        host.current.messages.some(m => m.type === 'system' && m.content.includes('joined'))
      ).toBe(true);
    });
  });
});

describe('usePeerChat – Integration: message relay', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should relay a chat message from guest to host', async () => {
    const { guest, host } = await connectHostAndGuest();

    await waitFor(() => { expect(host.current.users).toHaveLength(2); });

    act(() => { guest.current.sendMessage('Hello from guest'); });

    await waitFor(() => {
      expect(
        host.current.messages.some(m => m.content === 'Hello from guest')
      ).toBe(true);
    });
  });

  it('should relay a chat message from host to guest', async () => {
    const { host, guest } = await connectHostAndGuest();

    await waitFor(() => { expect(guest.current.users).toHaveLength(2); });

    act(() => { host.current.sendMessage('Hello from host'); });

    await waitFor(() => {
      expect(
        guest.current.messages.some(m => m.content === 'Hello from host')
      ).toBe(true);
    });
  });

  it('should mark received messages as isSelf: false on the receiving end', async () => {
    const { guest, host } = await connectHostAndGuest();

    await waitFor(() => { expect(host.current.users).toHaveLength(2); });

    act(() => { guest.current.sendMessage('Check isSelf'); });

    await waitFor(() => {
      const received = host.current.messages.find(m => m.content === 'Check isSelf');
      expect(received).toBeDefined();
      expect(received!.isSelf).toBe(false);
    });
  });

  it('should mark sent messages as isSelf: true on the sender', async () => {
    const { guest } = await connectHostAndGuest();

    act(() => { guest.current.sendMessage('My own message'); });

    const sent = guest.current.messages.find(m => m.content === 'My own message');
    expect(sent?.isSelf).toBe(true);
  });
});

describe('usePeerChat – Integration: user list sync', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should sync guest user list from host on join', async () => {
    const { guest } = await connectHostAndGuest();

    await waitFor(() => {
      expect(guest.current.users).toHaveLength(2);
    });
  });

  it('should include guest peerId in the user list after connection', async () => {
    const { host } = await connectHostAndGuest();

    await waitFor(() => {
      const guestUser = host.current.users.find(u => u.peerId === 'guest-peer-id');
      expect(guestUser).toBeDefined();
    });
  });

  it('should sync renamed user across both sides', async () => {
    const { host, guest } = await connectHostAndGuest();

    await waitFor(() => { expect(host.current.users).toHaveLength(2); });

    act(() => { guest.current.renameUser('GuestRenamed'); });

    await waitFor(() => {
      expect(
        host.current.users.some(u => u.name === 'GuestRenamed')
      ).toBe(true);
    });
  });
});

describe('usePeerChat – Integration: room rename propagation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should propagate room rename from host to guest', async () => {
    const { host, guest } = await connectHostAndGuest();

    await waitFor(() => { expect(guest.current.users).toHaveLength(2); });

    act(() => { host.current.renameRoom('My Renamed Room'); });

    await waitFor(() => {
      expect(guest.current.roomName).toBe('My Renamed Room');
    });
  });

  it('should not change room name when guest attempts to rename', async () => {
    const { host, guest } = await connectHostAndGuest();

    await waitFor(() => { expect(guest.current.users).toHaveLength(2); });

    const originalName = host.current.roomName;
    act(() => { guest.current.renameRoom('Unauthorised Rename'); });

    await new Promise(r => setTimeout(r, 50));
    expect(host.current.roomName).toBe(originalName);
  });
});

describe('usePeerChat – Integration: guest disconnect', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should remove guest from host user list when guest leaves', async () => {
    const { host, guest, hostGuestConn } = await connectHostAndGuest();

    await waitFor(() => { expect(host.current.users).toHaveLength(2); });

    const guestName = guest.current.myUser.name;
    const hostCloseH = (hostGuestConn.on as any).mock.calls.find((c: any) => c[0] === 'close')?.[1];
    act(() => { if (hostCloseH) hostCloseH(); });

    await waitFor(() => {
      expect(host.current.users).toHaveLength(1);
      expect(
        host.current.messages.some(
          m => m.type === 'system' && m.content.includes(guestName) && m.content.includes('left')
        )
      ).toBe(true);
    });
  });

  it('should set guest status to error when host connection closes', async () => {
    const { guest, guestHostConn } = await connectHostAndGuest();

    await waitFor(() => { expect(guest.current.status).toBe('connected'); });

    const guestCloseH = (guestHostConn.on as any).mock.calls.find((c: any) => c[0] === 'close')?.[1];
    act(() => { if (guestCloseH) guestCloseH(); });

    await waitFor(() => {
      expect(guest.current.status).toBe('error');
      expect(guest.current.error).toBe('Disconnected from host.');
    });
  });

  it('should allow host to continue chatting after guest disconnects', async () => {
    const { host, hostGuestConn } = await connectHostAndGuest();

    await waitFor(() => { expect(host.current.users).toHaveLength(2); });

    const hostCloseH = (hostGuestConn.on as any).mock.calls.find((c: any) => c[0] === 'close')?.[1];
    act(() => { if (hostCloseH) hostCloseH(); });

    await waitFor(() => { expect(host.current.users).toHaveLength(1); });

    expect(() => {
      act(() => { host.current.sendMessage('Still here'); });
    }).not.toThrow();
    expect(host.current.messages.some(m => m.content === 'Still here')).toBe(true);
  });
});

describe('usePeerChat – Integration: leaveRoom resets state', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should reset host to idle status after leaveRoom', async () => {
    const { host } = await connectHostAndGuest();

    await waitFor(() => { expect(host.current.status).toBe('connected'); });

    act(() => { host.current.leaveRoom(); });

    await waitFor(() => {
      expect(host.current.status).toBe('idle');
      expect(host.current.users).toHaveLength(0);
      expect(host.current.roomId).toBeNull();
    });
  });

  it('should allow host to create a new room after leaving', async () => {
    const { host } = await connectHostAndGuest();

    await waitFor(() => { expect(host.current.status).toBe('connected'); });

    act(() => { host.current.leaveRoom(); });
    await waitFor(() => { expect(host.current.status).toBe('idle'); });

    act(() => { host.current.createRoom(); });
    expect(host.current.status).toBe('generating_code');
  });
});

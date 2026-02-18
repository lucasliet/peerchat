import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePeerChat } from '../usePeerChat';

// Mock PeerJS - must be hoisted, so can't reference external variables
let mockPeerInstance: any;
vi.mock('peerjs', () => {
  const MockPeer = vi.fn(function(this: any, id?: string) {
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

// Mock HTMLCanvasElement for jsdom (canvas npm package not installed)
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillStyle: '',
  fillRect: vi.fn(),
})) as any;
HTMLCanvasElement.prototype.captureStream = vi.fn(() => ({
  getVideoTracks: () => [{ kind: 'video', stop: vi.fn(), enabled: true }],
})) as any;

// Mock MediaStream for jsdom environment
if (typeof globalThis.MediaStream === 'undefined') {
  (globalThis as any).MediaStream = class MediaStream {
    tracks: any[];
    constructor(tracks?: any[]) {
      this.tracks = tracks || [];
    }
    getTracks() {
      return this.tracks;
    }
    getAudioTracks() {
      return this.tracks.filter((t: any) => t.kind === 'audio');
    }
    getVideoTracks() {
      return this.tracks.filter((t: any) => t.kind === 'video');
    }
    addTrack(track: any) {
      this.tracks.push(track);
    }
    removeTrack(track: any) {
      this.tracks = this.tracks.filter((t: any) => t !== track);
    }
  };
}

// Mock crypto.randomUUID with proper UUID format
if (!globalThis.crypto) {
  (globalThis as any).crypto = {};
}
if (!globalThis.crypto.randomUUID) {
  let sequenceNum = 0;
  globalThis.crypto.randomUUID = () => {
    const seg1 = (sequenceNum++).toString(16).padStart(8, '0');
    const seg2 = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
    const seg3 = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
    const seg4 = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
    const seg5 = Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0');
    return `${seg1}-${seg2}-${seg3}-${seg4}-${seg5}` as `${string}-${string}-${string}-${string}-${string}`;
  };
}

describe('usePeerChat - Initial State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => usePeerChat());
    
    expect(result.current.status).toBe('idle');
    expect(result.current.roomId).toBeNull();
    expect(result.current.roomName).toBe('');
    expect(result.current.users).toEqual([]);
    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isHost).toBe(false);
    expect(result.current.isInCall).toBe(false);
    expect(result.current.localStream).toBeNull();
    expect(result.current.remoteStreams).toEqual([]);
  });

  it('should initialize with a random user', () => {
    const { result } = renderHook(() => usePeerChat());
    
    expect(result.current.myUser).toBeDefined();
    expect(result.current.myUser.id).toBeTruthy();
    expect(result.current.myUser.name).toBeTruthy();
    expect(result.current.myUser.color).toBeTruthy();
    expect(result.current.myUser.isMuted).toBe(false);
    expect(result.current.myUser.isVideoOff).toBe(false);
  });
});

describe('usePeerChat - Room Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a room and update status to generating_code', () => {
    const { result } = renderHook(() => usePeerChat());
    
    act(() => {
      result.current.createRoom();
    });
    
    expect(result.current.status).toBe('generating_code');
  });

  it('should set isHost to true when creating a room', async () => {
    const { result } = renderHook(() => usePeerChat());
    
    act(() => {
      result.current.createRoom();
    });
    
    // Simulate peer open event
    act(() => {
      mockPeerInstance._trigger('open', 'test-peer-id');
    });
    
    await waitFor(() => {
      expect(result.current.isHost).toBe(true);
      expect(result.current.status).toBe('connected');
    });
  });

  it('should generate a 4-digit room code when creating a room', async () => {
    const { result } = renderHook(() => usePeerChat());
    
    act(() => {
      result.current.createRoom();
    });
    
    act(() => {
      mockPeerInstance._trigger('open', 'test-peer-id');
    });
    
    await waitFor(() => {
      expect(result.current.roomId).toMatch(/^\d{4}$/);
    });
  });

  it('should join a room with valid code', () => {
    const { result } = renderHook(() => usePeerChat());
    
    act(() => {
      result.current.joinRoom('1234');
    });
    
    expect(result.current.status).toBe('connecting');
    expect(result.current.roomId).toBe('1234');
  });

  it('should not join a room with invalid code', () => {
    const { result } = renderHook(() => usePeerChat());
    
    act(() => {
      result.current.joinRoom('12'); // Too short
    });
    
    expect(result.current.status).toBe('idle');
    expect(result.current.roomId).toBeNull();
  });

  it('should set isHost to false when joining a room', () => {
    const { result } = renderHook(() => usePeerChat());
    
    act(() => {
      result.current.joinRoom('1234');
    });
    
    expect(result.current.isHost).toBe(false);
  });
});

describe('usePeerChat - Exit Chat Button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should reset state to idle when leaving room', async () => {
    const { result } = renderHook(() => usePeerChat());
    
    // Initially, status should be idle
    expect(result.current.status).toBe('idle');
    
    // Simulate creating a room (this would normally trigger PeerJS events)
    act(() => {
      result.current.createRoom();
    });
    
    // Status should change from idle
    expect(result.current.status).not.toBe('idle');
    
    // Call leaveRoom
    act(() => {
      result.current.leaveRoom();
    });
    
    // After leaving, status should be reset to idle
    expect(result.current.status).toBe('idle');
    expect(result.current.roomId).toBeNull();
    expect(result.current.roomName).toBe('');
    expect(result.current.users).toEqual([]);
    expect(result.current.messages).toEqual([]);
    expect(result.current.isHost).toBe(false);
  });

  it('should cleanup all connections when leaving', async () => {
    const { result } = renderHook(() => usePeerChat());
    
    // Simulate having an active connection
    act(() => {
      result.current.createRoom();
    });
    
    // Leave the room
    act(() => {
      result.current.leaveRoom();
    });
    
    // Verify cleanup
    expect(result.current.isInCall).toBe(false);
    expect(result.current.localStream).toBeNull();
    expect(result.current.remoteStreams).toEqual([]);
  });
});

describe('usePeerChat - Component Unmount Cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should stop all media tracks when component unmounts', async () => {
    const mockAudioTrackStop = vi.fn();
    const mockVideoTrackStop = vi.fn();
    
    const mockAudioTrack = {
      stop: mockAudioTrackStop,
      enabled: true,
      kind: 'audio',
      id: 'audio-1',
    };
    
    const mockVideoTrack = {
      stop: mockVideoTrackStop,
      kind: 'video',
      id: 'video-1',
      enabled: true,
    };
    
    let currentTracks = [mockAudioTrack];
    const mockStream = {
      getTracks: vi.fn(() => currentTracks.slice()),
      getAudioTracks: vi.fn(() => currentTracks.filter(t => t.kind === 'audio')),
      getVideoTracks: vi.fn(() => currentTracks.filter(t => t.kind === 'video')),
      addTrack: vi.fn((track) => {
        currentTracks.push(track);
      }),
      removeTrack: vi.fn(),
    } as any;
    
    const mockVideoStream = {
      getTracks: vi.fn(() => [mockVideoTrack]),
      getVideoTracks: vi.fn(() => [mockVideoTrack]),
    } as any;
    
    mockGetUserMedia.mockResolvedValueOnce(mockStream);
    
    const { result, unmount } = renderHook(() => usePeerChat());
    
    // Start a call
    await act(async () => {
      await result.current.toggleCall();
    });
    
    await waitFor(() => {
      expect(result.current.isInCall).toBe(true);
    });
    
    // Turn on video
    mockGetUserMedia.mockResolvedValueOnce(mockVideoStream);
    await act(async () => {
      await result.current.toggleVideo();
    });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Tracks should not be stopped yet
    expect(mockAudioTrackStop).not.toHaveBeenCalled();
    expect(mockVideoTrackStop).not.toHaveBeenCalled();
    
    // Unmount the component (simulating user navigating away)
    unmount();
    
    // Verify all tracks were stopped on unmount
    expect(mockAudioTrackStop).toHaveBeenCalled();
    expect(mockVideoTrackStop).toHaveBeenCalled();
  });

  it('should close all peer connections on unmount', async () => {
    const mockStream = {
      getTracks: vi.fn(() => []),
      getAudioTracks: vi.fn(() => [{ enabled: true, stop: vi.fn() }]),
      getVideoTracks: vi.fn(() => []),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as any;
    
    mockGetUserMedia.mockResolvedValue(mockStream);
    
    const { result, unmount } = renderHook(() => usePeerChat());
    
    // Create room and start call
    act(() => {
      result.current.createRoom();
    });
    
    await act(async () => {
      await result.current.toggleCall();
    });
    
    await waitFor(() => {
      expect(result.current.isInCall).toBe(true);
    });
    
    // Spy on peer destroy
    const mockPeerDestroy = vi.fn();
    if (mockPeerInstance) {
      mockPeerInstance.destroy = mockPeerDestroy;
    }
    
    // Unmount
    unmount();
    
    // Verify peer was destroyed
    expect(mockPeerDestroy).toHaveBeenCalled();
  });
});

describe('usePeerChat - Camera Disabled on Call Start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should start call with audio only (camera uses canvas placeholder)', async () => {
    const mockStream = {
      getTracks: vi.fn(() => []),
      getAudioTracks: vi.fn(() => [{ enabled: true }]),
      getVideoTracks: vi.fn(() => []),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as any;
    
    mockGetUserMedia.mockResolvedValue(mockStream);
    
    const { result } = renderHook(() => usePeerChat());
    
    act(() => {
      result.current.createRoom();
    });
    
    await act(async () => {
      await result.current.toggleCall();
    });
    
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });
  });

  it('should set isVideoOff to true when starting a call', async () => {
    // Mock getUserMedia to return a stream
    const mockStream = {
      getTracks: vi.fn(() => []),
      getAudioTracks: vi.fn(() => [{ enabled: true }]),
      getVideoTracks: vi.fn(() => []),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as any;
    
    mockGetUserMedia.mockResolvedValue(mockStream);
    
    const { result } = renderHook(() => usePeerChat());
    
    // Initially, isVideoOff should be false
    expect(result.current.myUser.isVideoOff).toBe(false);
    
    // Simulate creating a room
    act(() => {
      result.current.createRoom();
    });
    
    // Toggle call (start call)
    await act(async () => {
      await result.current.toggleCall();
    });
    
    // After starting call, isVideoOff should be true
    await waitFor(() => {
      expect(result.current.myUser.isVideoOff).toBe(true);
    });
  });

  it('should set isInCall to true when starting a call', async () => {
    // Mock getUserMedia to return a stream
    const mockStream = {
      getTracks: vi.fn(() => []),
      getAudioTracks: vi.fn(() => [{ enabled: true }]),
      getVideoTracks: vi.fn(() => []),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as any;
    
    mockGetUserMedia.mockResolvedValue(mockStream);
    
    const { result } = renderHook(() => usePeerChat());
    
    // Initially, isInCall should be false
    expect(result.current.isInCall).toBe(false);
    
    // Simulate creating a room
    act(() => {
      result.current.createRoom();
    });
    
    // Toggle call (start call)
    await act(async () => {
      await result.current.toggleCall();
    });
    
    // After starting call, isInCall should be true
    await waitFor(() => {
      expect(result.current.isInCall).toBe(true);
    });
  });
});

describe('usePeerChat - Message Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send a text message', () => {
    const { result } = renderHook(() => usePeerChat());
    
    act(() => {
      result.current.sendMessage('Hello, world!');
    });
    
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Hello, world!');
    expect(result.current.messages[0].type).toBe('text');
    expect(result.current.messages[0].isSelf).toBe(true);
  });

  it('should include sender information in messages', () => {
    const { result } = renderHook(() => usePeerChat());
    const userName = result.current.myUser.name;
    const userId = result.current.myUser.id;
    
    act(() => {
      result.current.sendMessage('Test message');
    });
    
    expect(result.current.messages[0].senderId).toBe(userId);
    expect(result.current.messages[0].senderName).toBe(userName);
  });

  it('should add timestamp to messages', () => {
    const { result } = renderHook(() => usePeerChat());
    const beforeTime = Date.now();
    
    act(() => {
      result.current.sendMessage('Test message');
    });
    
    const afterTime = Date.now();
    const messageTime = result.current.messages[0].timestamp;
    
    expect(messageTime).toBeGreaterThanOrEqual(beforeTime);
    expect(messageTime).toBeLessThanOrEqual(afterTime);
  });

  it('should maintain message order', () => {
    const { result } = renderHook(() => usePeerChat());
    
    act(() => {
      result.current.sendMessage('First message');
      result.current.sendMessage('Second message');
      result.current.sendMessage('Third message');
    });
    
    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[0].content).toBe('First message');
    expect(result.current.messages[1].content).toBe('Second message');
    expect(result.current.messages[2].content).toBe('Third message');
  });
});

describe('usePeerChat - User Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should rename current user', () => {
    const { result } = renderHook(() => usePeerChat());
    const originalName = result.current.myUser.name;
    
    act(() => {
      result.current.renameUser('NewName');
    });
    
    expect(result.current.myUser.name).toBe('NewName');
    expect(result.current.myUser.name).not.toBe(originalName);
  });

  it('should rename room when user is host', async () => {
    const { result } = renderHook(() => usePeerChat());
    
    act(() => {
      result.current.createRoom();
    });
    
    act(() => {
      mockPeerInstance._trigger('open', 'test-peer-id');
    });
    
    await waitFor(() => {
      expect(result.current.isHost).toBe(true);
    });
    
    act(() => {
      result.current.renameRoom('My Custom Room');
    });
    
    expect(result.current.roomName).toBe('My Custom Room');
  });

  it('should not rename room when user is not host', () => {
    const { result } = renderHook(() => usePeerChat());
    const originalRoomName = result.current.roomName;
    
    // User is not host (isHost is false by default)
    act(() => {
      result.current.renameRoom('Attempted New Name');
    });
    
    expect(result.current.roomName).toBe(originalRoomName);
  });

  it('should include host in users list when creating room', async () => {
    const { result } = renderHook(() => usePeerChat());
    
    act(() => {
      result.current.createRoom();
    });
    
    act(() => {
      mockPeerInstance._trigger('open', 'test-peer-id');
    });
    
    await waitFor(() => {
      expect(result.current.users).toHaveLength(1);
      expect(result.current.users[0].id).toBe(result.current.myUser.id);
    });
  });
});

describe('usePeerChat - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should clear error when clearError is called', () => {
    const { result } = renderHook(() => usePeerChat());
    
    // Manually set an error
    act(() => {
      result.current.createRoom();
    });
    
    act(() => {
      mockPeerInstance._trigger('error', { 
        type: 'network',
        message: 'Network error'
      });
    });
    
    // Clear the error
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
  });

  it('should handle media access error when starting call', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));
    
    const { result } = renderHook(() => usePeerChat());
    
    await act(async () => {
      await result.current.toggleCall();
    });
    
    expect(result.current.error).toBeTruthy();
    expect(result.current.isInCall).toBe(false);
  });

  it('should handle peer error event', () => {
    const { result } = renderHook(() => usePeerChat());
    
    act(() => {
      result.current.createRoom();
    });
    
    act(() => {
      mockPeerInstance._trigger('error', { 
        type: 'peer-unavailable',
        message: 'Peer not found'
      });
    });
    
    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('Room not found');
  });
});

describe('usePeerChat - Call Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should toggle audio state', () => {
    const { result } = renderHook(() => usePeerChat());
    
    expect(result.current.myUser.isMuted).toBe(false);
    
    act(() => {
      result.current.toggleAudio();
    });
    
    expect(result.current.myUser.isMuted).toBe(true);
    
    act(() => {
      result.current.toggleAudio();
    });
    
    expect(result.current.myUser.isMuted).toBe(false);
  });

  it('should end call when toggling off', async () => {
    const mockStream = {
      getTracks: vi.fn(() => [
        { stop: vi.fn(), kind: 'audio' },
        { stop: vi.fn(), kind: 'video' }
      ]),
      getAudioTracks: vi.fn(() => [{ enabled: true }]),
      getVideoTracks: vi.fn(() => []),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as any;
    
    mockGetUserMedia.mockResolvedValue(mockStream);
    
    const { result } = renderHook(() => usePeerChat());
    
    // Start call
    await act(async () => {
      await result.current.toggleCall();
    });
    
    await waitFor(() => {
      expect(result.current.isInCall).toBe(true);
    });
    
    // End call
    await act(async () => {
      await result.current.toggleCall();
    });
    
    expect(result.current.isInCall).toBe(false);
    expect(result.current.localStream).toBeNull();
  });

  it('should maintain call state correctly', async () => {
    const mockStream = {
      getTracks: vi.fn(() => []),
      getAudioTracks: vi.fn(() => [{ enabled: true }]),
      getVideoTracks: vi.fn(() => []),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as any;
    
    mockGetUserMedia.mockResolvedValue(mockStream);
    
    const { result } = renderHook(() => usePeerChat());
    
    expect(result.current.isInCall).toBe(false);
    
    await act(async () => {
      await result.current.toggleCall();
    });
    
    await waitFor(() => {
      expect(result.current.isInCall).toBe(true);
      expect(result.current.localStream).toBeTruthy();
    });
  });
});

describe('usePeerChat - Video Toggle and Camera Hardware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should stop video tracks when toggling video off', async () => {
    const mockVideoTrackStop = vi.fn();
    const mockVideoTrack = { 
      stop: mockVideoTrackStop, 
      kind: 'video',
      id: 'video-track-1',
      enabled: true,
    };
    
    const mockAudioTrack = { 
      enabled: true, 
      kind: 'audio',
      id: 'audio-track-1',
      stop: vi.fn(),
    };
    
    // Create stream with dynamic track management
    let currentTracks = [mockAudioTrack];
    const mockStream = {
      getTracks: vi.fn(() => currentTracks.slice()),
      getAudioTracks: vi.fn(() => currentTracks.filter(t => t.kind === 'audio')),
      getVideoTracks: vi.fn(() => currentTracks.filter(t => t.kind === 'video')),
      addTrack: vi.fn((track) => {
        currentTracks.push(track);
      }),
      removeTrack: vi.fn((track) => {
        currentTracks = currentTracks.filter(t => t !== track);
      }),
    } as any;
    
    const mockVideoStream = {
      getTracks: vi.fn(() => [mockVideoTrack]),
      getVideoTracks: vi.fn(() => [mockVideoTrack]),
    } as any;
    
    // Start call with audio only
    mockGetUserMedia.mockResolvedValueOnce(mockStream);
    
    const { result } = renderHook(() => usePeerChat());
    
    await act(async () => {
      await result.current.toggleCall();
    });
    
    await waitFor(() => {
      expect(result.current.isInCall).toBe(true);
    });
    
    // Turn video ON
    mockGetUserMedia.mockResolvedValueOnce(mockVideoStream);
    
    await act(async () => {
      await result.current.toggleVideo();
    });
    
    // Wait a bit for state updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify video track was added
    expect(mockStream.addTrack).toHaveBeenCalledWith(mockVideoTrack);
    
    // Turn video OFF
    await act(async () => {
      await result.current.toggleVideo();
    });
    
    // Wait for state updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify video track was stopped and removed - this is the critical fix
    expect(mockVideoTrackStop).toHaveBeenCalled();
    expect(mockStream.removeTrack).toHaveBeenCalledWith(mockVideoTrack);
  });

  it('should cleanup temporary video stream tracks after extracting video track', async () => {
    const mockVideoTrackStop = vi.fn();
    const mockExtraTrackStop = vi.fn();
    
    const mockVideoTrack = { 
      stop: mockVideoTrackStop, 
      kind: 'video',
      id: 'video-track-main',
      enabled: true,
    };
    
    // This simulates extra tracks that might be in the temporary stream
    const mockExtraTrack = {
      stop: mockExtraTrackStop,
      kind: 'audio',
      id: 'extra-track',
      enabled: true,
    };
    
    const mockAudioTrack = { 
      enabled: true, 
      kind: 'audio',
      id: 'audio-track-1',
      stop: vi.fn(),
    };
    
    let currentTracks = [mockAudioTrack];
    const mockCallStream = {
      getTracks: vi.fn(() => currentTracks.slice()),
      getAudioTracks: vi.fn(() => currentTracks.filter(t => t.kind === 'audio')),
      getVideoTracks: vi.fn(() => currentTracks.filter(t => t.kind === 'video')),
      addTrack: vi.fn((track) => {
        currentTracks.push(track);
      }),
      removeTrack: vi.fn(),
    } as any;
    
    // The temporary stream from getUserMedia has multiple tracks
    const mockTempVideoStream = {
      getTracks: vi.fn(() => [mockVideoTrack, mockExtraTrack]),
      getVideoTracks: vi.fn(() => [mockVideoTrack]),
    } as any;
    
    // Start call
    mockGetUserMedia.mockResolvedValueOnce(mockCallStream);
    
    const { result } = renderHook(() => usePeerChat());
    
    await act(async () => {
      await result.current.toggleCall();
    });
    
    await waitFor(() => {
      expect(result.current.isInCall).toBe(true);
    });
    
    // Turn video ON - this creates the temporary stream with extra tracks
    mockGetUserMedia.mockResolvedValueOnce(mockTempVideoStream);
    
    await act(async () => {
      await result.current.toggleVideo();
    });
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Critical test: verify that extra tracks from temp stream are stopped
    // This prevents the camera hardware from staying active
    expect(mockExtraTrackStop).toHaveBeenCalled();
    
    // The main video track should NOT be stopped yet (it's being used)
    expect(mockVideoTrackStop).not.toHaveBeenCalled();
  });

  it('should handle camera access errors gracefully', async () => {
    const mockAudioTrack = { enabled: true, kind: 'audio', stop: vi.fn() };
    const mockCallStream = {
      getTracks: vi.fn(() => [mockAudioTrack]),
      getAudioTracks: vi.fn(() => [mockAudioTrack]),
      getVideoTracks: vi.fn(() => []),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as any;
    
    mockGetUserMedia.mockResolvedValueOnce(mockCallStream);
    
    const { result } = renderHook(() => usePeerChat());
    
    await act(async () => {
      await result.current.toggleCall();
    });
    
    await waitFor(() => {
      expect(result.current.isInCall).toBe(true);
    });
    
    // Mock camera access failure
    mockGetUserMedia.mockRejectedValueOnce(new Error('Camera not available'));
    
    await act(async () => {
      await result.current.toggleVideo();
    });
    
    // Wait for error to be set
    await waitFor(() => {
      expect(result.current.error).toBe('Failed to access camera');
    });
  });
});

describe('usePeerChat - Connection Status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update status throughout room creation flow', async () => {
    const { result } = renderHook(() => usePeerChat());
    
    expect(result.current.status).toBe('idle');
    
    act(() => {
      result.current.createRoom();
    });
    
    expect(result.current.status).toBe('generating_code');
    
    act(() => {
      mockPeerInstance._trigger('open', 'test-peer-id');
    });
    
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });
  });

  it('should update status when joining room', () => {
    const { result } = renderHook(() => usePeerChat());
    
    expect(result.current.status).toBe('idle');
    
    act(() => {
      result.current.joinRoom('1234');
    });
    
    expect(result.current.status).toBe('connecting');
  });

  it('should reset status to idle after leaving room', () => {
    const { result } = renderHook(() => usePeerChat());
    
    act(() => {
      result.current.createRoom();
    });
    
    expect(result.current.status).not.toBe('idle');
    
    act(() => {
      result.current.leaveRoom();
    });
    
    expect(result.current.status).toBe('idle');
  });
});

describe('usePeerChat - handleData Protocol', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should rebroadcast chat to all peers except sender when host', async () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.createRoom(); });
    act(() => { mockPeerInstance._trigger('open', 'host-id'); });

    const connA = { peer: 'peer-A', on: vi.fn(), send: vi.fn(), open: true, close: vi.fn() };
    await act(async () => { mockPeerInstance._trigger('connection', connA); });
    const connAOpen = (connA.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => connAOpen());

    const connB = { peer: 'peer-B', on: vi.fn(), send: vi.fn(), open: true, close: vi.fn() };
    await act(async () => { mockPeerInstance._trigger('connection', connB); });
    const connBOpen = (connB.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => connBOpen());

    const dataHandlerA = (connA.on as any).mock.calls.find((c: any) => c[0] === 'data')[1];
    const chatMsg = { type: 'chat', payload: { id: 'msg1', content: 'Hello', senderId: 'peer-A', senderName: 'A', timestamp: Date.now(), type: 'text', isSelf: false } };
    act(() => { dataHandlerA(chatMsg); });

    expect(connB.send).toHaveBeenCalledWith(chatMsg);
    expect(connA.send).not.toHaveBeenCalledWith(chatMsg);
    expect(result.current.messages.some(m => m.content === 'Hello')).toBe(true);
  });

  it('should only add chat to state without broadcast when guest', async () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.joinRoom('1234'); });
    act(() => { mockPeerInstance._trigger('open', 'guest-id'); });

    const hostConn = (mockPeerInstance.connect as any).mock.results[0].value;
    const openHandler = (hostConn.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => openHandler());
    const dataHandler = (hostConn.on as any).mock.calls.find((c: any) => c[0] === 'data')[1];

    const chatMsg = { type: 'chat', payload: { id: 'msg1', content: 'From host', senderId: 'host', senderName: 'Host', timestamp: Date.now(), type: 'text', isSelf: false } };
    act(() => { dataHandler(chatMsg); });

    expect(result.current.messages.some(m => m.content === 'From host')).toBe(true);
    const chatSentByGuest = (hostConn.send as any).mock.calls.filter((c: any[]) => c[0]?.type === 'chat');
    expect(chatSentByGuest).toHaveLength(0);
  });

  it('should add new user + broadcast user_list_sync when host receives user_info', async () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.createRoom(); });
    act(() => { mockPeerInstance._trigger('open', 'host-id'); });

    const conn = { peer: 'guest-peer', on: vi.fn(), send: vi.fn(), open: true, close: vi.fn() };
    await act(async () => { mockPeerInstance._trigger('connection', conn); });
    const openHandler = (conn.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => openHandler());

    const dataHandler = (conn.on as any).mock.calls.find((c: any) => c[0] === 'data')[1];
    const guestUser = { id: 'guest-id', name: 'GuestUser', color: 'bg-red-500', isMuted: false, isVideoOff: false, peerId: 'guest-peer' };
    act(() => { dataHandler({ type: 'user_info', payload: guestUser }); });

    await waitFor(() => {
      expect(result.current.users.some(u => u.id === 'guest-id')).toBe(true);
      expect(conn.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'user_list_sync' }));
      expect(result.current.messages.some(m => m.content.includes('GuestUser'))).toBe(true);
    });
  });

  it('should not duplicate user when host receives user_info for existing user', async () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.createRoom(); });
    act(() => { mockPeerInstance._trigger('open', 'host-id'); });

    const conn = { peer: 'guest-peer', on: vi.fn(), send: vi.fn(), open: true, close: vi.fn() };
    await act(async () => { mockPeerInstance._trigger('connection', conn); });
    const openHandler = (conn.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => openHandler());

    const dataHandler = (conn.on as any).mock.calls.find((c: any) => c[0] === 'data')[1];
    const guestUser = { id: 'guest-id', name: 'GuestUser', color: 'bg-red-500', isMuted: false, isVideoOff: false, peerId: 'guest-peer' };
    act(() => { dataHandler({ type: 'user_info', payload: guestUser }); });
    act(() => { dataHandler({ type: 'user_info', payload: guestUser }); });

    await waitFor(() => {
      expect(result.current.users.filter(u => u.id === 'guest-id')).toHaveLength(1);
    });
  });

  it('should replace full user list on user_list_sync as guest', async () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.joinRoom('1234'); });
    act(() => { mockPeerInstance._trigger('open', 'guest-id'); });

    const hostConn = (mockPeerInstance.connect as any).mock.results[0].value;
    const openHandler = (hostConn.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => openHandler());
    const dataHandler = (hostConn.on as any).mock.calls.find((c: any) => c[0] === 'data')[1];

    const users = [
      { id: 'host', name: 'Host', color: 'bg-green-500', isMuted: false, isVideoOff: false, peerId: 'host-peer' },
      { id: 'guest-id', name: 'Guest', color: 'bg-blue-500', isMuted: false, isVideoOff: false, peerId: 'guest-peer' },
    ];
    act(() => { dataHandler({ type: 'user_list_sync', payload: users }); });

    await waitFor(() => {
      expect(result.current.users).toHaveLength(2);
      expect(result.current.users[0].id).toBe('host');
      expect(result.current.users[1].id).toBe('guest-id');
    });
  });

  it('should update user + rebroadcast on user_update as host', async () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.createRoom(); });
    act(() => { mockPeerInstance._trigger('open', 'host-id'); });

    const connA = { peer: 'peer-A', on: vi.fn(), send: vi.fn(), open: true, close: vi.fn() };
    const connB = { peer: 'peer-B', on: vi.fn(), send: vi.fn(), open: true, close: vi.fn() };
    await act(async () => { mockPeerInstance._trigger('connection', connA); });
    await act(async () => { mockPeerInstance._trigger('connection', connB); });

    const openA = (connA.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    const openB = (connB.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => { openA(); openB(); });

    const dataA = (connA.on as any).mock.calls.find((c: any) => c[0] === 'data')[1];
    const userA = { id: 'user-a', name: 'UserA', color: 'bg-red-500', isMuted: false, isVideoOff: false, peerId: 'peer-A' };
    act(() => { dataA({ type: 'user_info', payload: userA }); });

    await waitFor(() => { expect(result.current.users.some(u => u.id === 'user-a')).toBe(true); });

    act(() => { dataA({ type: 'user_update', payload: { ...userA, name: 'UpdatedA' } }); });

    await waitFor(() => {
      expect(result.current.users.find(u => u.id === 'user-a')?.name).toBe('UpdatedA');
      expect(connB.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'user_list_sync' }));
    });
  });

  it('should update roomName on room_update', async () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.joinRoom('1234'); });
    act(() => { mockPeerInstance._trigger('open', 'guest-id'); });

    const hostConn = (mockPeerInstance.connect as any).mock.results[0].value;
    const openHandler = (hostConn.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => openHandler());
    const dataHandler = (hostConn.on as any).mock.calls.find((c: any) => c[0] === 'data')[1];

    act(() => { dataHandler({ type: 'room_update', payload: { name: 'New Room Name' } }); });

    await waitFor(() => {
      expect(result.current.roomName).toBe('New Room Name');
    });
  });

  it('should not crash on unknown message type', async () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.joinRoom('1234'); });
    act(() => { mockPeerInstance._trigger('open', 'guest-id'); });

    const hostConn = (mockPeerInstance.connect as any).mock.results[0].value;
    const openHandler = (hostConn.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => openHandler());
    const dataHandler = (hostConn.on as any).mock.calls.find((c: any) => c[0] === 'data')[1];

    expect(() => { act(() => { dataHandler({ type: 'UNKNOWN_TYPE', payload: {} }); }); }).not.toThrow();
    expect(result.current.error).toBeNull();
  });

  it('should not crash on malformed payload', async () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.joinRoom('1234'); });
    act(() => { mockPeerInstance._trigger('open', 'guest-id'); });

    const hostConn = (mockPeerInstance.connect as any).mock.results[0].value;
    const openHandler = (hostConn.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => openHandler());
    const dataHandler = (hostConn.on as any).mock.calls.find((c: any) => c[0] === 'data')[1];

    expect(() => { act(() => { dataHandler({ type: 'chat', payload: null }); }); }).not.toThrow();
    expect(() => { act(() => { dataHandler(null); }); }).not.toThrow();
  });
});

describe('usePeerChat - Broadcast', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should send to all open connections', async () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.createRoom(); });
    act(() => { mockPeerInstance._trigger('open', 'host-id'); });

    const connA = { peer: 'peer-A', on: vi.fn(), send: vi.fn(), open: true, close: vi.fn() };
    const connB = { peer: 'peer-B', on: vi.fn(), send: vi.fn(), open: true, close: vi.fn() };
    await act(async () => { mockPeerInstance._trigger('connection', connA); });
    await act(async () => { mockPeerInstance._trigger('connection', connB); });
    const openA = (connA.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    const openB = (connB.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => { openA(); openB(); });

    act(() => { result.current.sendMessage('broadcast test'); });

    expect(connA.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'chat' }));
    expect(connB.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'chat' }));
  });

  it('should skip closed connections (conn.open === false)', async () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.createRoom(); });
    act(() => { mockPeerInstance._trigger('open', 'host-id'); });

    const connA = { peer: 'peer-A', on: vi.fn(), send: vi.fn(), open: false, close: vi.fn() };
    const connB = { peer: 'peer-B', on: vi.fn(), send: vi.fn(), open: true, close: vi.fn() };
    await act(async () => { mockPeerInstance._trigger('connection', connA); });
    await act(async () => { mockPeerInstance._trigger('connection', connB); });
    const openB = (connB.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => { openB(); });

    act(() => { result.current.sendMessage('skip closed'); });

    const chatCallsA = (connA.send as any).mock.calls.filter((c: any[]) => c[0]?.type === 'chat');
    expect(chatCallsA).toHaveLength(0);
    expect(connB.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'chat' }));
  });
});

describe('usePeerChat - Host-Guest Connection Flow', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should send user_info + user_list_sync + room_update on guest conn.open', async () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.createRoom(); });
    act(() => { mockPeerInstance._trigger('open', 'host-id'); });

    const conn = { peer: 'guest-peer', on: vi.fn(), send: vi.fn(), open: true, close: vi.fn() };
    await act(async () => { mockPeerInstance._trigger('connection', conn); });
    const openHandler = (conn.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => openHandler());

    expect(conn.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'user_info' }));
    expect(conn.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'user_list_sync' }));
    expect(conn.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'room_update' }));
  });

  it('should set status to error when guest connection to host closes', async () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.joinRoom('1234'); });
    act(() => { mockPeerInstance._trigger('open', 'guest-id'); });

    const hostConn = (mockPeerInstance.connect as any).mock.results[0].value;
    const openHandler = (hostConn.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => openHandler());
    const closeHandler = (hostConn.on as any).mock.calls.find((c: any) => c[0] === 'close')[1];
    act(() => closeHandler());

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Disconnected from host.');
    });
  });

  it('should remove guest and emit system message when guest disconnects from host', async () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.createRoom(); });
    act(() => { mockPeerInstance._trigger('open', 'host-id'); });

    const conn = { peer: 'guest-peer', on: vi.fn(), send: vi.fn(), open: true, close: vi.fn() };
    await act(async () => { mockPeerInstance._trigger('connection', conn); });
    const openHandler = (conn.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => openHandler());
    const dataHandler = (conn.on as any).mock.calls.find((c: any) => c[0] === 'data')[1];
    const guestUser = { id: 'guest-id', name: 'Departing', color: 'bg-red-500', isMuted: false, isVideoOff: false, peerId: 'guest-peer' };
    act(() => { dataHandler({ type: 'user_info', payload: guestUser }); });

    await waitFor(() => { expect(result.current.users.some(u => u.id === 'guest-id')).toBe(true); });

    const closeHandler = (conn.on as any).mock.calls.find((c: any) => c[0] === 'close')[1];
    act(() => closeHandler());

    await waitFor(() => {
      expect(result.current.users.some(u => u.id === 'guest-id')).toBe(false);
      expect(result.current.messages.some(m => m.content.includes('Departing') && m.content.includes('left'))).toBe(true);
    });
  });
});

describe('usePeerChat - joinRoom Edge Cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should accept code "0000" (4 digits)', () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.joinRoom('0000'); });
    expect(result.current.status).toBe('connecting');
    expect(result.current.roomId).toBe('0000');
  });

  it('should reject code "12345" (5 chars)', () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.joinRoom('12345'); });
    expect(result.current.status).toBe('idle');
  });

  it('should reject empty code', () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.joinRoom(''); });
    expect(result.current.status).toBe('idle');
  });

  it('should accept code "abcd" (4 chars, hook only validates length)', () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.joinRoom('abcd'); });
    expect(result.current.status).toBe('connecting');
  });
});

describe('usePeerChat - sendMessage Edge Cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should add empty string to messages (no hook validation)', () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.sendMessage(''); });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('');
  });

  it('should handle emoji and unicode characters', () => {
    const { result } = renderHook(() => usePeerChat());
    const msg = '🚀 héllo wörld 你好 🎉';
    act(() => { result.current.sendMessage(msg); });
    expect(result.current.messages[0].content).toBe(msg);
  });

  it('should handle 10000-char message', () => {
    const { result } = renderHook(() => usePeerChat());
    const longMsg = 'x'.repeat(10000);
    act(() => { result.current.sendMessage(longMsg); });
    expect(result.current.messages[0].content.length).toBe(10000);
  });

  it('should add message locally even without connections', () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.sendMessage('no peers'); });
    expect(result.current.messages[0].isSelf).toBe(true);
    expect(result.current.messages[0].content).toBe('no peers');
  });
});

describe('usePeerChat - Rename Edge Cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should broadcast room_update when host renames room', async () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.createRoom(); });
    act(() => { mockPeerInstance._trigger('open', 'host-id'); });

    const conn = { peer: 'guest-peer', on: vi.fn(), send: vi.fn(), open: true, close: vi.fn() };
    await act(async () => { mockPeerInstance._trigger('connection', conn); });
    const openHandler = (conn.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
    act(() => openHandler());

    act(() => { result.current.renameRoom('My New Room'); });

    expect(result.current.roomName).toBe('My New Room');
    expect(conn.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'room_update', payload: { name: 'My New Room' } }));
  });

  it('should not change state or broadcast when guest tries to rename room', () => {
    const { result } = renderHook(() => usePeerChat());
    const originalName = result.current.roomName;
    act(() => { result.current.renameRoom('Attempted Name'); });
    expect(result.current.roomName).toBe(originalName);
  });
});

describe('usePeerChat - Media Edge Cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should return early without crash when toggleVideo called without localStream', async () => {
    const { result } = renderHook(() => usePeerChat());
    expect(result.current.localStream).toBeNull();
    await act(async () => { await result.current.toggleVideo(); });
    expect(result.current.localStream).toBeNull();
    expect(mockGetUserMedia).not.toHaveBeenCalled();
  });

  it('should call replaceTrack on all peer senders when toggling video ON', async () => {
    const mockSender = { track: { kind: 'video', stop: vi.fn() }, replaceTrack: vi.fn() };
    const mockMediaConn = {
      on: vi.fn(),
      close: vi.fn(),
      peer: 'peer-A',
      answer: vi.fn(),
      peerConnection: { getSenders: vi.fn(() => [mockSender]) },
    };

    const audioTrack = { enabled: true, kind: 'audio', stop: vi.fn() };
    const mockStream = {
      getTracks: vi.fn(() => [audioTrack]),
      getAudioTracks: vi.fn(() => [audioTrack]),
      getVideoTracks: vi.fn(() => []),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as any;
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.createRoom(); });
    act(() => { mockPeerInstance._trigger('open', 'host-id'); });
    await act(async () => { await result.current.toggleCall(); });
    await waitFor(() => { expect(result.current.isInCall).toBe(true); });

    mockPeerInstance.call.mockReturnValue(mockMediaConn);

    const newVideoTrack = { kind: 'video', stop: vi.fn(), enabled: true, id: 'new-video' };
    mockGetUserMedia.mockResolvedValueOnce({
      getTracks: vi.fn(() => [newVideoTrack]),
      getVideoTracks: vi.fn(() => [newVideoTrack]),
    });

    mockPeerInstance._trigger('call', mockMediaConn);
    const streamH = (mockMediaConn.on as any).mock.calls.find((c: any) => c[0] === 'stream');
    if (streamH) act(() => streamH[1](new MediaStream()));

    await act(async () => { await result.current.toggleVideo(); });

    await waitFor(() => {
      expect(mockSender.replaceTrack).toHaveBeenCalledWith(newVideoTrack);
    }, { timeout: 3000 });
  });

  it('should call each peer with call() when starting a call with multiple peers', async () => {
    const mockStream = {
      getTracks: vi.fn(() => []),
      getAudioTracks: vi.fn(() => []),
      getVideoTracks: vi.fn(() => []),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as any;
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.createRoom(); });
    act(() => { mockPeerInstance._trigger('open', 'host-id'); });

    for (const peerName of ['peer-A', 'peer-B']) {
      const conn = { peer: peerName, on: vi.fn(), send: vi.fn(), open: true, close: vi.fn() };
      await act(async () => { mockPeerInstance._trigger('connection', conn); });
      const openH = (conn.on as any).mock.calls.find((c: any) => c[0] === 'open')[1];
      act(() => openH());
      const dataH = (conn.on as any).mock.calls.find((c: any) => c[0] === 'data')[1];
      const user = { id: peerName, name: peerName, color: 'bg-red-500', isMuted: false, isVideoOff: false, peerId: peerName };
      act(() => { dataH({ type: 'user_info', payload: user }); });
    }

    await waitFor(() => { expect(result.current.users).toHaveLength(3); });

    await act(async () => { await result.current.toggleCall(); });

    await waitFor(() => {
      const callArgs = (mockPeerInstance.call as any).mock.calls.map((c: any[]) => c[0]);
      expect(callArgs).toContain('peer-A');
      expect(callArgs).toContain('peer-B');
    });
  });
});

describe('usePeerChat - Cleanup Edge Cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should stop tracks and close all connections on leaveRoom during call', async () => {
    const stopTrack = vi.fn();
    const mockStream = {
      getTracks: vi.fn(() => [{ stop: stopTrack, kind: 'audio' }]),
      getAudioTracks: vi.fn(() => [{ stop: stopTrack, enabled: true }]),
      getVideoTracks: vi.fn(() => []),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as any;
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.createRoom(); });
    act(() => { mockPeerInstance._trigger('open', 'host-id'); });
    await act(async () => { await result.current.toggleCall(); });

    await waitFor(() => { expect(result.current.isInCall).toBe(true); });

    const destroySpy = vi.spyOn(mockPeerInstance, 'destroy');

    act(() => { result.current.leaveRoom(); });

    await waitFor(() => {
      expect(stopTrack).toHaveBeenCalled();
      expect(destroySpy).toHaveBeenCalled();
      expect(result.current.isInCall).toBe(false);
      expect(result.current.localStream).toBeNull();
      expect(result.current.status).toBe('idle');
    });
  });

  it('should not crash on multiple consecutive leaveRoom calls', async () => {
    const { result } = renderHook(() => usePeerChat());
    act(() => { result.current.createRoom(); });
    expect(() => {
      act(() => {
        result.current.leaveRoom();
        result.current.leaveRoom();
        result.current.leaveRoom();
      });
    }).not.toThrow();
    expect(result.current.status).toBe('idle');
  });

  it('should be a safe no-op when leaveRoom called without connecting', () => {
    const { result } = renderHook(() => usePeerChat());
    expect(() => { act(() => { result.current.leaveRoom(); }); }).not.toThrow();
    expect(result.current.status).toBe('idle');
  });
});


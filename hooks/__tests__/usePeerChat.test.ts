import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePeerChat } from '../usePeerChat';

// Mock PeerJS
vi.mock('peerjs', () => {
  const mockPeer = vi.fn();
  mockPeer.prototype.on = vi.fn();
  mockPeer.prototype.connect = vi.fn();
  mockPeer.prototype.call = vi.fn();
  mockPeer.prototype.destroy = vi.fn();
  return { default: mockPeer };
});

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
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

describe('usePeerChat - Camera Disabled on Call Start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should start call with camera disabled (video: false)', async () => {
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
    
    // Simulate creating a room and getting connected
    act(() => {
      result.current.createRoom();
    });
    
    // Toggle call (start call)
    await act(async () => {
      await result.current.toggleCall();
    });
    
    // Verify getUserMedia was called with video: false
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
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

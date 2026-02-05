import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { ChatState, Message, PeerUser, ConnectionStatus } from '../types';
import { APP_PREFIX } from '../constants';
import { generateRandomName, generateRandomColor, generateRoomCode } from '../utils';

interface UsePeerChatReturn extends ChatState {
  createRoom: () => void;
  joinRoom: (code: string) => void;
  sendMessage: (content: string) => void;
  leaveRoom: () => void;
  renameUser: (name: string) => void;
  renameRoom: (name: string) => void;
  clearError: () => void;
  myUser: PeerUser;
  toggleCall: () => Promise<void>;
  isInCall: boolean;
  localStream: MediaStream | null;
  remoteStreams: { peerId: string; stream: MediaStream }[];
  toggleAudio: () => void;
  toggleVideo: () => Promise<void>;
}

interface NetworkMessage {
  type: 'chat' | 'user_info' | 'user_list_sync' | 'user_update' | 'room_update';
  payload: any;
}

export const usePeerChat = (): UsePeerChatReturn => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    status: 'idle',
    roomId: null,
    roomName: '',
    users: [],
    error: null,
    isHost: false,
  });

  const [myUser, setMyUser] = useState<PeerUser>(() => ({
    id: crypto.randomUUID(),
    name: generateRandomName(),
    color: generateRandomColor(),
    isMuted: false,
    isVideoOff: false,
  }));

  const [isInCall, setIsInCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ peerId: string; stream: MediaStream }[]>([]);

  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const mediaConnectionsRef = useRef<Map<string, MediaConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  
  const stateRef = useRef(state);
  const myUserRef = useRef(myUser);
  const isInCallRef = useRef(isInCall);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { myUserRef.current = myUser; }, [myUser]);
  useEffect(() => { isInCallRef.current = isInCall; }, [isInCall]);

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    mediaConnectionsRef.current.forEach(c => c.close());
    mediaConnectionsRef.current.clear();
    connectionsRef.current.forEach(c => c.close());
    connectionsRef.current.clear();
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setIsInCall(false);
    setRemoteStreams([]);
  }, []);

  const broadcast = useCallback((msg: NetworkMessage, excludePeerId?: string) => {
    connectionsRef.current.forEach((conn, peerId) => {
      if (peerId !== excludePeerId && conn.open) {
        conn.send(msg);
      }
    });
  }, []);

  const sendSystemMessage = useCallback((content: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      senderId: 'system',
      senderName: 'System',
      content,
      timestamp: Date.now(),
      type: 'system',
      isSelf: false
    };
    setState(prev => ({ ...prev, messages: [...prev.messages, msg] }));
    broadcast({ type: 'chat', payload: msg });
  }, [broadcast]);

  const setupMediaCall = useCallback((call: MediaConnection) => {
    call.on('stream', (remoteStream) => {
      setRemoteStreams(prev => {
        const filtered = prev.filter(p => p.peerId !== call.peer);
        return [...filtered, { peerId: call.peer, stream: remoteStream }];
      });
    });
    call.on('close', () => {
      setRemoteStreams(prev => prev.filter(p => p.peerId !== call.peer));
      mediaConnectionsRef.current.delete(call.peer);
    });
    call.on('error', () => {
      setRemoteStreams(prev => prev.filter(p => p.peerId !== call.peer));
      mediaConnectionsRef.current.delete(call.peer);
    });
    mediaConnectionsRef.current.set(call.peer, call);
  }, []);

  const updateMyUser = useCallback((updates: Partial<PeerUser>) => {
    const updated = { ...myUserRef.current, ...updates };
    setMyUser(updated);
    
    setState(prev => {
      const newUsers = prev.users.map(u => u.id === updated.id ? updated : u);
      const msg: NetworkMessage = stateRef.current.isHost 
        ? { type: 'user_list_sync', payload: newUsers }
        : { type: 'user_update', payload: updated };
      
      broadcast(msg);
      return { ...prev, users: newUsers };
    });
  }, [broadcast]);

  const handleData = useCallback((data: unknown, conn: DataConnection) => {
    const msg = data as NetworkMessage;
    switch (msg.type) {
      case 'chat':
        if (stateRef.current.isHost) broadcast(msg, conn.peer);
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, { ...(msg.payload as Message), isSelf: false }]
        }));
        break;
      case 'user_info':
        const newUser = msg.payload as PeerUser;
        if (isInCallRef.current && localStreamRef.current && newUser.peerId) {
           const call = peerRef.current?.call(newUser.peerId, localStreamRef.current);
           if (call) setupMediaCall(call);
        }
        
        setState(prev => {
          const exists = prev.users.find(u => u.id === newUser.id);
          if (exists) return prev;
          if (stateRef.current.isHost) {
            sendSystemMessage(`${newUser.name} joined the room`);
          }
          const updated = [...prev.users, newUser];
          if (stateRef.current.isHost) broadcast({ type: 'user_list_sync', payload: updated });
          return { ...prev, users: updated };
        });
        break;
      case 'user_list_sync':
        const incomingUsers = msg.payload as PeerUser[];
        setState(prev => ({ ...prev, users: incomingUsers }));
        if (isInCallRef.current && localStreamRef.current) {
          incomingUsers.forEach(u => {
            if (u.peerId && u.peerId !== peerRef.current?.id && !mediaConnectionsRef.current.has(u.peerId)) {
              const call = peerRef.current?.call(u.peerId, localStreamRef.current!);
              if (call) setupMediaCall(call);
            }
          });
        }
        break;
      case 'user_update':
        const updatedUser = msg.payload as PeerUser;
        setState(prev => {
          const newUsers = prev.users.map(u => u.id === updatedUser.id ? updatedUser : u);
          if (stateRef.current.isHost) broadcast({ type: 'user_list_sync', payload: newUsers });
          return { ...prev, users: newUsers };
        });
        break;
      case 'room_update':
        setState(prev => ({ ...prev, roomName: (msg.payload as any).name }));
        break;
    }
  }, [broadcast, setupMediaCall, sendSystemMessage]);

  const initPeerListeners = (peer: Peer) => {
    peer.on('call', (call) => {
      call.answer(localStreamRef.current || undefined);
      setupMediaCall(call);
    });

    peer.on('error', err => {
      console.error('PeerJS Error:', err.type, err.message);
      if (err.type === 'peer-unavailable') {
         setState(prev => ({ ...prev, status: 'error', error: `Room not found or host disconnected.` }));
      } else if (err.type === 'unavailable-id' && stateRef.current.isHost) {
         // Silently handle ID collision for host
      } else {
         setState(prev => ({ ...prev, status: 'error', error: `Connection error: ${err.message}` }));
      }
    });
  };

  const createRoom = useCallback(() => {
    setState(prev => ({ ...prev, status: 'generating_code', error: null }));
    const code = generateRoomCode();
    const peerId = `${APP_PREFIX}${code}`;
    const peer = new Peer(peerId);
    peerRef.current = peer;
    initPeerListeners(peer);

    peer.on('open', (id) => {
      setState(prev => ({
        ...prev,
        status: 'connected',
        roomId: code,
        roomName: `Room ${code}`,
        isHost: true,
        users: [{ ...myUserRef.current, peerId: id }]
      }));
    });

    peer.on('connection', (conn) => {
      connectionsRef.current.set(conn.peer, conn);
      conn.on('data', d => handleData(d, conn));
      conn.on('open', () => {
        conn.send({ type: 'user_info', payload: { ...myUserRef.current, peerId: peer.id } });
        conn.send({ type: 'user_list_sync', payload: [...stateRef.current.users] });
        conn.send({ type: 'room_update', payload: { name: stateRef.current.roomName } });
      });
      conn.on('close', () => {
        const disconnectedUser = stateRef.current.users.find(u => u.peerId === conn.peer);
        if (disconnectedUser) {
          sendSystemMessage(`${disconnectedUser.name} left the room`);
        }
        connectionsRef.current.delete(conn.peer);
        setState(prev => {
          const remaining = prev.users.filter(u => u.peerId !== conn.peer);
          broadcast({ type: 'user_list_sync', payload: remaining });
          return { ...prev, users: remaining };
        });
      });
    });
  }, [handleData, broadcast, sendSystemMessage]);

  const joinRoom = useCallback((code: string) => {
    if (code.length !== 4) return;
    setState(prev => ({ ...prev, status: 'connecting', error: null, roomId: code }));
    const peer = new Peer();
    peerRef.current = peer;
    initPeerListeners(peer);

    peer.on('open', (id) => {
      const hostId = `${APP_PREFIX}${code}`;
      const conn = peer.connect(hostId);
      conn.on('open', () => {
        connectionsRef.current.set(hostId, conn);
        const user = { ...myUserRef.current, peerId: id };
        setMyUser(user);
        setState(prev => ({ ...prev, status: 'connected', isHost: false, users: [user] }));
        conn.send({ type: 'user_info', payload: user });
      });
      conn.on('data', d => handleData(d, conn));
      conn.on('close', () => {
        setState(prev => ({ ...prev, status: 'error', error: 'Disconnected from host.' }));
        cleanup();
      });
    });
  }, [handleData, cleanup]);

  const toggleCall = async () => {
    if (isInCall) {
      sendSystemMessage(`${myUser.name} left the call`);
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
      mediaConnectionsRef.current.forEach(c => c.close());
      mediaConnectionsRef.current.clear();
      setRemoteStreams([]);
      setIsInCall(false);
      updateMyUser({ isMuted: false, isVideoOff: false });
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsInCall(true);
        sendSystemMessage(`${myUser.name} started a call`);
        
        stateRef.current.users.forEach(u => {
          if (u.peerId && u.peerId !== peerRef.current?.id) {
            const call = peerRef.current?.call(u.peerId, stream);
            if (call) setupMediaCall(call);
          }
        });
      } catch (e) {
        setState(prev => ({ ...prev, error: 'Could not access camera/mic.' }));
      }
    }
  };

  const toggleAudio = () => {
    const val = !myUser.isMuted;
    if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !val);
    updateMyUser({ isMuted: val });
  };

  const toggleVideo = async () => {
    if (!localStreamRef.current) return;
    
    const turningOff = !myUser.isVideoOff;
    
    if (turningOff) {
      // Turn OFF: Stop the tracks to turn off the hardware light
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.stop();
        localStreamRef.current?.removeTrack(track);
      });

      // Notify peers via WebRTC sender replacement
      mediaConnectionsRef.current.forEach(conn => {
        const sender = (conn.peerConnection as any).getSenders().find((s: any) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(null);
        }
      });
      
      // Update local state (triggers re-render)
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      updateMyUser({ isVideoOff: true });

    } else {
      // Turn ON: Get a new video track
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = videoStream.getVideoTracks()[0];
        
        if (localStreamRef.current && newVideoTrack) {
          localStreamRef.current.addTrack(newVideoTrack);
          
          // Send new track to all peers
          mediaConnectionsRef.current.forEach(conn => {
            const sender = (conn.peerConnection as any).getSenders().find((s: any) => s.track === null || s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(newVideoTrack);
            }
          });

          // Update local state
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          updateMyUser({ isVideoOff: false });
        }
      } catch (err) {
        console.error("Failed to restart video", err);
        setState(prev => ({ ...prev, error: 'Failed to access camera' }));
      }
    }
  };

  return {
    ...state,
    myUser,
    createRoom,
    joinRoom,
    sendMessage: (content: string) => {
      const msg: Message = { id: crypto.randomUUID(), senderId: myUser.id, senderName: myUser.name, content, timestamp: Date.now(), type: 'text', isSelf: true };
      setState(prev => ({ ...prev, messages: [...prev.messages, msg] }));
      broadcast({ type: 'chat', payload: msg });
    },
    leaveRoom: cleanup,
    renameUser: (n) => updateMyUser({ name: n }),
    renameRoom: (n) => { if (state.isHost) { setState(prev => ({ ...prev, roomName: n })); broadcast({ type: 'room_update', payload: { name: n } }); } },
    clearError: () => setState(prev => ({ ...prev, error: null })),
    toggleCall, isInCall, localStream, remoteStreams, toggleAudio, toggleVideo
  };
};
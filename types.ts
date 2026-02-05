export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system';
  isSelf: boolean;
}

export type ConnectionStatus = 
  | 'idle' 
  | 'generating_code' 
  | 'waiting_for_host' 
  | 'connecting' 
  | 'connected' 
  | 'error';

export interface PeerUser {
  id: string;
  peerId?: string; // The PeerJS ID used for connection
  name: string;
  color: string;
  isMuted: boolean;
  isVideoOff: boolean;
}

export interface ChatState {
  messages: Message[];
  status: ConnectionStatus;
  roomId: string | null;
  roomName: string;
  users: PeerUser[];
  error: string | null;
  isHost: boolean;
}

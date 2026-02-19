import React, { useState, useRef, useEffect } from 'react';
import { Send, LogOut, Copy, Check, Users, Menu, X, Phone, PhoneOff, Mic, MicOff, Video, VideoOff, AlertCircle, Edit } from 'lucide-react';
import { Message, PeerUser } from '../types';
import { formatTime } from '../utils';

interface ChatRoomProps {
  roomId: string; roomName: string; isHost: boolean; messages: Message[]; users: PeerUser[]; currentUser: PeerUser;
  error: string | null; onClearError: () => void; onSendMessage: (text: string) => void; onLeave: () => void;
  onRename: (newName: string) => void; onRenameRoom: (newName: string) => void; isInCall: boolean;
  onToggleCall: () => void; localStream: MediaStream | null; remoteStreams: { peerId: string; stream: MediaStream }[];
  onToggleAudio: () => void; onToggleVideo: () => void;
}

const UserAvatar: React.FC<{ user?: PeerUser; size?: 'sm' | 'md' | 'lg' }> = ({ user, size = 'md' }) => {
  const sizeClasses = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-16 h-16 text-xl' };
  const fallbackColor = 'bg-gray-600';
  const fallbackName = '??';
  return (
    <div className={`${sizeClasses[size]} rounded-full ${user?.color || fallbackColor} flex items-center justify-center font-bold text-white shadow-lg shrink-0 transition-transform`}>
      {(user?.name || fallbackName).substring(0, 2).toUpperCase()}
    </div>
  );
};

const VideoTile: React.FC<{ stream: MediaStream | null; user?: PeerUser; isLocal?: boolean }> = ({ stream, user, isLocal = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // We determine if we should show the camera video or the fallback avatar.
  // 1. If user says video is off (isVideoOff) -> Avatar
  // 2. If no stream provided -> Avatar
  // 3. If stream exists but has no video tracks (tracks stopped/removed) -> Avatar
  const hasVideoTrack = stream && stream.getVideoTracks().length > 0;
  const shouldShowVideo = !user?.isVideoOff && hasVideoTrack;

  useEffect(() => {
    if (videoRef.current && stream && shouldShowVideo) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, shouldShowVideo]);

  return (
    <div className="relative group bg-gray-950 rounded-xl overflow-hidden aspect-video border border-gray-800 shadow-xl flex items-center justify-center transition-all">
      {!shouldShowVideo ? (
        <div className="flex flex-col items-center gap-2 animate-in fade-in duration-300">
          <UserAvatar user={user} size="md" />
          <span className="text-[10px] text-gray-500 font-medium">Camera Off</span>
        </div>
      ) : (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted={isLocal} 
          className="w-full h-full object-cover" 
        />
      )}
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-medium text-white flex items-center gap-1.5 z-10">
        <span className="truncate max-w-[80px]">{user?.name || (isLocal ? 'You' : 'Unknown')}</span>
        {user?.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
      </div>
    </div>
  );
};

const ChatRoom: React.FC<ChatRoomProps> = (props) => {
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleStartEditUser = (user: PeerUser) => {
    if (user.id === props.currentUser.id) {
      setEditingUserId(user.id);
      setNewUserName(user.name);
    }
  };

  const handleSaveUser = () => {
    const trimmed = newUserName.trim();
    if (editingUserId === props.currentUser.id && trimmed.length > 0 && trimmed.length <= 10) {
      props.onRename(trimmed);
      setEditingUserId(null);
    }
  };

  const handleStartEditRoom = () => {
    if (props.isHost) {
      setEditingRoom(true);
      setNewRoomName(props.roomName);
    }
  };

  const handleSaveRoom = () => {
    const trimmed = newRoomName.trim();
    if (props.isHost && trimmed.length > 0 && trimmed.length <= 30) {
      props.onRenameRoom(trimmed);
      setEditingRoom(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingRoom(false);
    setNewUserName('');
    setNewRoomName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editingUserId) handleSaveUser();
      if (editingRoom) handleSaveRoom();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Determine if video grid should be shown: if local user started call OR if there are incoming streams
  const showVideoGrid = props.isInCall || props.remoteStreams.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [props.messages, props.remoteStreams, showVideoGrid]);

  return (
    <div className="flex h-[100dvh] bg-gray-900 text-gray-100 overflow-hidden font-sans">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />}
      
      <aside className={`fixed md:relative z-30 w-72 h-full bg-gray-950 flex flex-col border-r border-gray-800 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-gray-800 flex justify-between items-center gap-2">
          {editingRoom ? (
            <input
              type="text"
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={30}
              className="flex-1 bg-gray-900 px-2 py-1 rounded border border-gray-700 text-sm font-bold outline-none focus:border-blue-500"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2 truncate flex-1">
              <Users className="w-5 h-5 text-emerald-500 shrink-0" />
              <h2 className="font-bold truncate">{props.roomName}</h2>
            </div>
          )}
          <div className="flex gap-1 shrink-0">
            {editingRoom ? (
              <>
                <button onClick={handleSaveRoom} className="p-1 hover:bg-gray-800 rounded-full text-green-500"><Check className="w-4 h-4" /></button>
                <button onClick={handleCancelEdit} className="p-1 hover:bg-gray-800 rounded-full text-red-500"><X className="w-4 h-4" /></button>
              </>
            ) : (
              props.isHost && <button aria-label="Edit room name" onClick={handleStartEditRoom} className="p-1 hover:bg-gray-800 rounded-full text-gray-500"><Edit className="w-4 h-4" /></button>
            )}
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 hover:bg-gray-800 rounded-full"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-800">
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-widest">Room Code</p>
          <button aria-label="Copy room code" onClick={() => { navigator.clipboard.writeText(props.roomId); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="w-full flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors group">
            <span data-testid="room-code" className="text-xl font-mono font-bold text-emerald-400">{props.roomId}</span>
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400 group-hover:text-white" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Online ({props.users.length})</p>
          {props.users.map(u => (
            <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-900 transition-colors group">
              <UserAvatar user={u} size="sm" />
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {editingUserId === u.id ? (
                  <input
                    type="text"
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    maxLength={10}
                    className="flex-1 bg-gray-800 px-2 py-1 rounded border border-gray-700 text-sm outline-none focus:border-blue-500"
                    autoFocus
                  />
                ) : (
                  <p className="text-sm font-medium truncate">{u.name} {u.id === props.currentUser.id && '(You)'}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {editingUserId === u.id ? (
                  <>
                 <button aria-label="Save name" onClick={handleSaveUser} className="p-1 hover:bg-gray-800 rounded-full text-green-500"><Check className="w-3 h-3" /></button>
                     <button aria-label="Cancel" onClick={handleCancelEdit} className="p-1 hover:bg-gray-800 rounded-full text-red-500"><X className="w-3 h-3" /></button>
                  </>
                ) : (
                  u.id === props.currentUser.id && (
                    <button aria-label="Edit your name" onClick={() => handleStartEditUser(u)} className="p-1 hover:bg-gray-800 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"><Edit className="w-3 h-3" /></button>
                  )
                )}
              </div>
              <div className="flex gap-1 mt-0.5">
                {u.isMuted && <MicOff className="w-3 h-3 text-red-500" />}
                {u.isVideoOff && <VideoOff className="w-3 h-3 text-red-500" />}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800">
          <button onClick={props.onLeave} className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"><LogOut className="w-4 h-4 mr-2" />Leave Room</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-gray-900 w-full">
        <header className="h-16 border-b border-gray-800 flex items-center px-4 justify-between bg-gray-900/50 backdrop-blur-md z-10 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 hover:bg-gray-800 rounded-full"><Menu className="w-5 h-5" /></button>
          <div className="hidden md:block">
            <h1 className="font-bold text-sm">{props.roomName}</h1>
            <p data-testid="user-count" className="text-[10px] text-gray-500 uppercase tracking-widest">{props.users.length} Active Users</p>
          </div>
          
          <div className="flex gap-2">
            {!props.isInCall ? (
              <button onClick={props.onToggleCall} className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-full transition-all shadow-lg shadow-emerald-600/20 active:scale-95"><Phone className="w-3.5 h-3.5" /> Start Call</button>
            ) : (
              <div className="flex items-center gap-1.5 p-1 bg-gray-850 border border-gray-700 rounded-full shadow-xl">
                 <button aria-label={props.currentUser.isMuted ? 'Unmute' : 'Mute'} onClick={props.onToggleAudio} className={`p-2 rounded-full transition-all ${props.currentUser.isMuted ? 'bg-red-500 text-white' : 'hover:bg-gray-800 text-gray-400'}`}>{props.currentUser.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}</button>
                 <button aria-label={props.currentUser.isVideoOff ? 'Turn camera on' : 'Turn camera off'} onClick={props.onToggleVideo} className={`p-2 rounded-full transition-all ${props.currentUser.isVideoOff ? 'bg-red-500 text-white' : 'hover:bg-gray-800 text-gray-400'}`}>{props.currentUser.isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}</button>
                 <button aria-label="End call" onClick={props.onToggleCall} className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-full active:scale-95"><PhoneOff className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        </header>

        {props.error && (
          <div className="absolute top-16 left-0 right-0 z-20 bg-red-600 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
            <AlertCircle className="w-4 h-4" /> {props.error} <button aria-label="Dismiss error" onClick={props.onClearError} className="ml-2 p-1 hover:bg-red-700 rounded-full"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {showVideoGrid && (
            <div className="bg-black/20 p-4 border-b border-gray-800 overflow-x-auto shrink-0">
              <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-3 max-w-6xl mx-auto min-w-max md:min-w-0">
                {props.localStream && <VideoTile stream={props.localStream} user={props.currentUser} isLocal />}
                {props.remoteStreams.map(rs => (
                  <VideoTile 
                    key={rs.peerId} 
                    stream={rs.stream} 
                    user={props.users.find(u => u.peerId === rs.peerId)} 
                  />
                ))}
              </div>
            </div>
          )}

          <div data-testid="chat-messages" className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {props.messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 opacity-50">
                <Send className="w-8 h-8" />
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            )}
            {props.messages.map(m => {
              if (m.type === 'system') {
                return (
                  <div key={m.id} className="flex justify-center my-2">
                    <span data-testid="system-message" className="px-3 py-1 bg-gray-800/50 text-gray-500 text-[10px] uppercase font-bold tracking-wider rounded-full border border-gray-800">
                      {m.content}
                    </span>
                  </div>
                );
              }

              return (
                <div key={m.id} className={`flex gap-3 ${m.isSelf ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <UserAvatar user={props.users.find(u => u.id === m.senderId) || { name: m.senderName, color: 'bg-gray-600', id: '0' } as any} size="sm" />
                  <div className={`max-w-[80%] md:max-w-[70%] space-y-1 ${m.isSelf ? 'items-end' : ''}`}>
                    <p className="text-[10px] font-bold text-gray-500 px-1">{m.senderName} • {formatTime(m.timestamp)}</p>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-md break-words leading-relaxed ${m.isSelf ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700'}`}>{m.content}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-4 bg-gray-900/80 backdrop-blur-sm border-t border-gray-800 shrink-0">
          <form onSubmit={e => { e.preventDefault(); if (inputText.trim()) { props.onSendMessage(inputText); setInputText(''); } }} className="max-w-4xl mx-auto flex gap-2 bg-gray-850 p-1.5 rounded-2xl border border-gray-700 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all shadow-xl">
            <input 
              type="text" 
              value={inputText} 
              onChange={e => setInputText(e.target.value)} 
              placeholder="Message your peers..." 
              className="flex-1 bg-transparent px-4 py-2 outline-none text-sm placeholder:text-gray-600" 
            />
            <button 
              type="submit" 
              disabled={!inputText.trim()} 
              className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 disabled:grayscale text-white rounded-xl transition-all active:scale-90"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-center text-gray-600 mt-2">End-to-End Encrypted P2P Connection</p>
        </div>
      </main>
    </div>
  );
};

export default ChatRoom;
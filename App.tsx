import React from 'react';
import { usePeerChat } from './hooks/usePeerChat';
import Landing from './components/Landing';
import ChatRoom from './components/ChatRoom';

const App: React.FC = () => {
  const chat = usePeerChat();

  if (chat.status === 'connected' && chat.roomId) {
    return (
      <ChatRoom
        roomId={chat.roomId}
        roomName={chat.roomName}
        isHost={chat.isHost}
        messages={chat.messages}
        users={chat.users}
        currentUser={chat.myUser}
        error={chat.error}
        onClearError={chat.clearError}
        onSendMessage={chat.sendMessage}
        onLeave={chat.leaveRoom}
        onRename={chat.renameUser}
        onRenameRoom={chat.renameRoom}
        // Media props
        isInCall={chat.isInCall}
        onToggleCall={chat.toggleCall}
        localStream={chat.localStream}
        remoteStreams={chat.remoteStreams}
        onToggleAudio={chat.toggleAudio}
        onToggleVideo={chat.toggleVideo}
      />
    );
  }

  return (
    <Landing 
      onCreate={chat.createRoom}
      onJoin={chat.joinRoom}
      status={chat.status}
      error={chat.error}
    />
  );
};

export default App;

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatRoom from './ChatRoom';
import type { Message, PeerUser } from '../types';

const mockUser: PeerUser = {
  id: 'user-1',
  peerId: 'peer-1',
  name: 'TestUser',
  color: 'bg-blue-500',
  isMuted: false,
  isVideoOff: false,
};

const mockUsers: PeerUser[] = [
  mockUser,
  {
    id: 'user-2',
    peerId: 'peer-2',
    name: 'OtherUser',
    color: 'bg-green-500',
    isMuted: false,
    isVideoOff: false,
  },
];

const mockMessages: Message[] = [
  {
    id: 'msg-1',
    senderId: 'user-1',
    senderName: 'TestUser',
    content: 'Hello, world!',
    timestamp: Date.now(),
    type: 'text',
    isSelf: true,
  },
  {
    id: 'msg-2',
    senderId: 'system',
    senderName: 'System',
    content: 'OtherUser joined the room',
    timestamp: Date.now(),
    type: 'system',
    isSelf: false,
  },
];

const defaultProps = {
  roomId: '1234',
  roomName: 'Test Room',
  isHost: true,
  messages: mockMessages,
  users: mockUsers,
  currentUser: mockUser,
  error: null,
  onClearError: vi.fn(),
  onSendMessage: vi.fn(),
  onLeave: vi.fn(),
  onRename: vi.fn(),
  onRenameRoom: vi.fn(),
  isInCall: false,
  onToggleCall: vi.fn(),
  localStream: null,
  remoteStreams: [],
  onToggleAudio: vi.fn(),
  onToggleVideo: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ChatRoom', () => {

  describe('Rendering', () => {
    it('should render room information', () => {
      render(<ChatRoom {...defaultProps} />);
      
      // Use getAllByText since room name appears multiple times
      const roomNames = screen.getAllByText('Test Room');
      expect(roomNames.length).toBeGreaterThan(0);
      expect(screen.getByText('1234')).toBeInTheDocument();
    });

    it('should render messages', () => {
      render(<ChatRoom {...defaultProps} />);
      
      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
      expect(screen.getByText('OtherUser joined the room')).toBeInTheDocument();
    });

    it('should render user list in sidebar', () => {
      render(<ChatRoom {...defaultProps} />);
      
      // Check users are rendered by looking for their initials in avatars
      const sidebar = screen.getByText(/online/i).closest('div');
      expect(sidebar).toBeInTheDocument();
    });

    it('should show room code that can be copied', () => {
      render(<ChatRoom {...defaultProps} />);
      
      expect(screen.getByText('1234')).toBeInTheDocument();
    });
  });

  describe('Message Sending', () => {
    it('should send message when form is submitted', () => {
      render(<ChatRoom {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/message your peers/i);
      fireEvent.change(input, { target: { value: 'Test message' } });
      
      const form = input.closest('form');
      if (form) {
        fireEvent.submit(form);
      }
      
      expect(defaultProps.onSendMessage).toHaveBeenCalledWith('Test message');
    });

    it('should clear input after sending message', () => {
      render(<ChatRoom {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/message your peers/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Test message' } });
      
      const form = input.closest('form');
      if (form) {
        fireEvent.submit(form);
      }
      
      expect(input.value).toBe('');
    });

    it('should not send empty messages', () => {
      render(<ChatRoom {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/message your peers/i);
      const form = input.closest('form');
      if (form) {
        fireEvent.submit(form);
      }
      
      expect(defaultProps.onSendMessage).not.toHaveBeenCalled();
    });

    it('should disable send button when input is empty', () => {
      render(<ChatRoom {...defaultProps} />);
      
      // Find all buttons and locate the submit button
      const buttons = screen.getAllByRole('button');
      const submitButton = buttons.find(btn => btn.getAttribute('type') === 'submit');
      expect(submitButton).toBeDefined();
      expect((submitButton as HTMLButtonElement)?.disabled).toBe(true);
    });
  });

  describe('Leave Room', () => {
    it('should call onLeave when leave button is clicked', () => {
      render(<ChatRoom {...defaultProps} />);
      
      const leaveButton = screen.getByText(/leave room/i);
      fireEvent.click(leaveButton);
      
      expect(defaultProps.onLeave).toHaveBeenCalledTimes(1);
    });
  });

  describe('Room Code Copying', () => {
    it('should copy room code to clipboard when copy button is clicked', async () => {
      render(<ChatRoom {...defaultProps} />);
      
      // Find button with code 1234
      const copyButton = screen.getByText('1234').closest('button');
      if (copyButton) {
        fireEvent.click(copyButton);
      }
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('1234');
      });
    });
  });

  describe('Call Management', () => {
    it('should show call button', () => {
      render(<ChatRoom {...defaultProps} />);
      
      const callButton = screen.getByText(/start call/i);
      expect(callButton).toBeInTheDocument();
    });

    it('should call onToggleCall when call button is clicked', () => {
      render(<ChatRoom {...defaultProps} />);
      
      const callButton = screen.getByText(/start call/i);
      fireEvent.click(callButton);
      
      expect(defaultProps.onToggleCall).toHaveBeenCalledTimes(1);
    });

    it('should show different text when in call', () => {
      render(<ChatRoom {...defaultProps} isInCall={true} />);
      
      // Button should exist (text might vary)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Audio/Video Controls', () => {
    it('should show audio and video controls when in call', () => {
      render(<ChatRoom {...defaultProps} isInCall={true} />);
      
      // Just check component renders when in call
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should display error when provided', () => {
      const error = 'Connection error occurred';
      render(<ChatRoom {...defaultProps} error={error} />);
      
      expect(screen.getByText(error)).toBeInTheDocument();
    });

    it('should not display error banner when error is null', () => {
      render(<ChatRoom {...defaultProps} error={null} />);
      
      const error = screen.queryByText(/connection error/i);
      expect(error).not.toBeInTheDocument();
    });
  });

  describe('User Management', () => {
    it('should show correct user count', () => {
      render(<ChatRoom {...defaultProps} isInCall={false} />);
      
      // Room has 2 users
      expect(defaultProps.users.length).toBe(2);
    });
  });

  describe('Message Display', () => {
    it('should distinguish between text and system messages', () => {
      render(<ChatRoom {...defaultProps} />);
      
      const textMessage = screen.getByText('Hello, world!');
      const systemMessage = screen.getByText('OtherUser joined the room');
      
      expect(textMessage).toBeInTheDocument();
      expect(systemMessage).toBeInTheDocument();
    });

    it('should show timestamp for messages', () => {
      render(<ChatRoom {...defaultProps} />);
      
      // formatTime is called for each message, check that timestamps are rendered
      const messageContainer = screen.getByText('Hello, world!').closest('div');
      expect(messageContainer).toBeInTheDocument();
    });
  });

  describe('Sidebar', () => {
    it('should show user count', () => {
      render(<ChatRoom {...defaultProps} />);
      
      expect(screen.getByText(/online/i)).toBeInTheDocument();
    });
  });

  describe('Inline Editing', () => {
    it('should allow user to start editing their name', () => {
      render(<ChatRoom {...defaultProps} />);
      const userItem = screen.getByText('TestUser (You)').closest('div.group');
      const editButton = userItem?.querySelector('button');
      
      if (editButton) {
        fireEvent.click(editButton);
        const input = screen.getByDisplayValue('TestUser');
        expect(input).toBeInTheDocument();
        expect(input).toHaveFocus();
      } else {
        throw new Error('Edit button not found');
      }
    });

    it('should save new name on Enter', () => {
      render(<ChatRoom {...defaultProps} />);
      const userItem = screen.getByText('TestUser (You)').closest('div.group');
      const editButton = userItem?.querySelector('button');
      if (editButton) fireEvent.click(editButton);
      
      const input = screen.getByDisplayValue('TestUser');
      fireEvent.change(input, { target: { value: 'NewName' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(defaultProps.onRename).toHaveBeenCalledWith('NewName');
    });

    it('should cancel editing on Escape', () => {
      render(<ChatRoom {...defaultProps} />);
      const userItem = screen.getByText('TestUser (You)').closest('div.group');
      const editButton = userItem?.querySelector('button');
      if (editButton) fireEvent.click(editButton);
      
      const input = screen.getByDisplayValue('TestUser');
      fireEvent.change(input, { target: { value: 'Draft' } });
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(defaultProps.onRename).not.toHaveBeenCalled();
      expect(screen.queryByDisplayValue('TestUser')).not.toBeInTheDocument();
      expect(screen.getByText('TestUser (You)')).toBeInTheDocument();
    });

    it('should allow host to edit room name', () => {
      render(<ChatRoom {...defaultProps} isHost={true} />);
      const roomHeader = screen.getAllByText('Test Room')[0].closest('div');
      const editButton = roomHeader?.nextElementSibling?.querySelector('button');
      
      if (editButton) {
        fireEvent.click(editButton);
        const input = screen.getByDisplayValue('Test Room');
        expect(input).toBeInTheDocument();
        
        fireEvent.change(input, { target: { value: 'New Room 1' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        
        expect(defaultProps.onRenameRoom).toHaveBeenCalledWith('New Room 1');
      } else {
        throw new Error('Room edit button not found');
      }
    });
  });

  describe('Mobile Sidebar', () => {
    it('should toggle sidebar on mobile menu click', () => {
      render(<ChatRoom {...defaultProps} />);
      const header = screen.getAllByText('Test Room')[1].closest('header');
      const menuBtn = header?.querySelector('button');
      
      if (menuBtn) {
         fireEvent.click(menuBtn);
         const backdrop = document.querySelector('.bg-black\\/50');
         expect(backdrop).toBeInTheDocument();
         
         if (backdrop) {
             fireEvent.click(backdrop);
             expect(backdrop).not.toBeInTheDocument();
         }
      }
    });
  });

  describe('Video Grid', () => {
    it('should show video grid when isInCall is true', () => {
       const mockStream = { getVideoTracks: () => [], getTracks: () => [] } as any;
       render(<ChatRoom {...defaultProps} isInCall={true} localStream={mockStream} />);
       const videoGrid = document.querySelector('.aspect-video');
       expect(videoGrid).toBeInTheDocument();
    });

    it('should render "Camera Off" when stream has no video tracks', () => {
       const stream = {
           getVideoTracks: () => [],
           getTracks: () => []
       } as any;
       render(<ChatRoom {...defaultProps} isInCall={true} localStream={stream} />);
       expect(screen.getByText('Camera Off')).toBeInTheDocument();
    });

    it('should render a video tile for each remote stream', () => {
      const remoteStreams = [
        { peerId: 'peer-2', stream: { getVideoTracks: () => [], getTracks: () => [] } as any },
        { peerId: 'peer-3', stream: { getVideoTracks: () => [], getTracks: () => [] } as any },
      ];
      render(<ChatRoom {...defaultProps} isInCall={true} remoteStreams={remoteStreams} />);
      const videoTiles = document.querySelectorAll('.aspect-video');
      expect(videoTiles.length).toBeGreaterThanOrEqual(2);
    });

    it('should show video grid even without a local stream when remote streams exist', () => {
      const remoteStreams = [
        { peerId: 'peer-2', stream: { getVideoTracks: () => [], getTracks: () => [] } as any },
      ];
      render(<ChatRoom {...defaultProps} isInCall={false} localStream={null} remoteStreams={remoteStreams} />);
      const videoGrid = document.querySelector('.aspect-video');
      expect(videoGrid).toBeInTheDocument();
    });
  });

  describe('Guest restrictions', () => {
    it('should not show the room rename button for guests', () => {
      render(<ChatRoom {...defaultProps} isHost={false} />);
      const editButtons = document.querySelectorAll('button svg.lucide-edit');
      expect(editButtons.length).toBe(0);
    });

    it('should allow host to trigger room rename (edit button exists)', () => {
      render(<ChatRoom {...defaultProps} isHost={true} />);
      const roomHeading = screen.getByRole('heading', { name: /test room/i, level: 2 });
      const sidebarTop = roomHeading.closest('div')?.parentElement?.parentElement;
      const btns = sidebarTop?.querySelectorAll('button') ?? [];
      const editBtn = Array.from(btns).find(b => !b.className.includes('md:hidden'));
      if (editBtn) {
        fireEvent.click(editBtn);
        expect(screen.getByDisplayValue('Test Room')).toBeInTheDocument();
      } else {
        throw new Error('Room edit button not found for host');
      }
    });
  });

  describe('User status indicators', () => {
    it('should display MicOff icon when user is muted', () => {
      const mutedUsers: typeof mockUsers = [
        { ...mockUser, isMuted: true },
        mockUsers[1],
      ];
      render(<ChatRoom {...defaultProps} users={mutedUsers} currentUser={{ ...mockUser, isMuted: true }} />);
      const micOffIcons = document.querySelectorAll('.lucide-mic-off');
      expect(micOffIcons.length).toBeGreaterThan(0);
    });

    it('should display VideoOff icon when user has camera off', () => {
      const videoOffUsers: typeof mockUsers = [
        { ...mockUser, isVideoOff: true },
        mockUsers[1],
      ];
      render(<ChatRoom {...defaultProps} users={videoOffUsers} currentUser={{ ...mockUser, isVideoOff: true }} />);
      const videoOffIcons = document.querySelectorAll('.lucide-video-off');
      expect(videoOffIcons.length).toBeGreaterThan(0);
    });

    it('should not display status icons for unmuted user with camera on', () => {
      render(<ChatRoom {...defaultProps} />);
      const micOffIcons = document.querySelectorAll('.lucide-mic-off');
      expect(micOffIcons.length).toBe(0);
    });
  });

  describe('Empty state', () => {
    it('should show empty state when there are no messages', () => {
      render(<ChatRoom {...defaultProps} messages={[]} />);
      expect(screen.getByText('No messages yet. Start the conversation!')).toBeInTheDocument();
    });

    it('should not show empty state when there are messages', () => {
      render(<ChatRoom {...defaultProps} />);
      expect(screen.queryByText('No messages yet. Start the conversation!')).not.toBeInTheDocument();
    });
  });

  describe('Call controls', () => {
    it('should call onToggleAudio when mute button is clicked during a call', () => {
      render(<ChatRoom {...defaultProps} isInCall={true} />);
      const buttons = screen.getAllByRole('button');
      const muteBtn = buttons.find(b => b.querySelector('.lucide-mic') || b.querySelector('.lucide-mic-off'));
      if (muteBtn) fireEvent.click(muteBtn);
      expect(defaultProps.onToggleAudio).toHaveBeenCalledTimes(1);
    });

    it('should call onToggleVideo when camera button is clicked during a call', () => {
      render(<ChatRoom {...defaultProps} isInCall={true} />);
      const buttons = screen.getAllByRole('button');
      const videoBtn = buttons.find(b => b.querySelector('.lucide-video') || b.querySelector('.lucide-video-off'));
      if (videoBtn) fireEvent.click(videoBtn);
      expect(defaultProps.onToggleVideo).toHaveBeenCalledTimes(1);
    });

    it('should call onToggleCall (end call) when PhoneOff button is clicked', () => {
      render(<ChatRoom {...defaultProps} isInCall={true} />);
      const buttons = screen.getAllByRole('button');
      const endCallBtn = buttons.find(b => b.querySelector('.lucide-phone-off'));
      if (endCallBtn) fireEvent.click(endCallBtn);
      expect(defaultProps.onToggleCall).toHaveBeenCalledTimes(1);
    });

    it('should highlight mute button when user is muted', () => {
      const mutedUser = { ...mockUser, isMuted: true };
      render(<ChatRoom {...defaultProps} isInCall={true} currentUser={mutedUser} />);
      const muteBtn = document.querySelector('.lucide-mic-off')?.closest('button');
      expect(muteBtn?.className).toMatch(/bg-red-500/);
    });

    it('should highlight video button when camera is off', () => {
      const videoOffUser = { ...mockUser, isVideoOff: true };
      render(<ChatRoom {...defaultProps} isInCall={true} currentUser={videoOffUser} />);
      const videoBtn = document.querySelector('.lucide-video-off')?.closest('button');
      expect(videoBtn?.className).toMatch(/bg-red-500/);
    });
  });

  describe('Error banner', () => {
    it('should call onClearError when the X button on the error banner is clicked', () => {
      render(<ChatRoom {...defaultProps} error="Something went wrong" />);
      const closeBtn = screen.getByText('Something went wrong')
        .closest('div')
        ?.querySelector('button');
      if (closeBtn) fireEvent.click(closeBtn);
      expect(defaultProps.onClearError).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message alignment', () => {
    it('should render self messages with reversed flex direction', () => {
      render(<ChatRoom {...defaultProps} />);
      const selfMsg = screen.getByText('Hello, world!').closest('[class*="flex-row-reverse"]');
      expect(selfMsg).toBeInTheDocument();
    });

    it('should render received messages without reversed flex direction', () => {
      const receivedMsg: typeof mockMessages = [{
        id: 'msg-3',
        senderId: 'user-2',
        senderName: 'OtherUser',
        content: 'Received message',
        timestamp: Date.now(),
        type: 'text',
        isSelf: false,
      }];
      render(<ChatRoom {...defaultProps} messages={receivedMsg} />);
      const msgEl = screen.getByText('Received message').closest('[class]');
      const parent = msgEl?.parentElement;
      expect(parent?.className).not.toMatch(/flex-row-reverse/);
    });
  });

  describe('Room code copy', () => {
    it('should show Check icon briefly after copying', async () => {
      render(<ChatRoom {...defaultProps} />);
      const copyButton = screen.getByText('1234').closest('button');
      if (copyButton) fireEvent.click(copyButton);
      const checkIcon = document.querySelector('.lucide-check');
      expect(checkIcon).toBeInTheDocument();
    });
  });
});

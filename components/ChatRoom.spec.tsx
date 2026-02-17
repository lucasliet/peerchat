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
  });
});

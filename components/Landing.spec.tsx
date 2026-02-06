import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Landing from './Landing';

const mockOnCreate = vi.fn();
const mockOnJoin = vi.fn();

const defaultProps = {
  onCreate: mockOnCreate,
  onJoin: mockOnJoin,
  status: 'idle',
  error: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Landing', () => {

  describe('Rendering', () => {
    it('should render the landing page with title', () => {
      render(<Landing {...defaultProps} />);
      
      expect(screen.getByText('PeerChat')).toBeInTheDocument();
      expect(screen.getByText('Serverless, private, ephemeral.')).toBeInTheDocument();
    });

    it('should render join room section', () => {
      render(<Landing {...defaultProps} />);
      
      expect(screen.getByText('Join a Room')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter 4-digit code')).toBeInTheDocument();
    });

    it('should render create room section', () => {
      render(<Landing {...defaultProps} />);
      
      expect(screen.getByText('Host a Room')).toBeInTheDocument();
      expect(screen.getByText('Generate a code and invite others.')).toBeInTheDocument();
    });

    it('should render footer', () => {
      render(<Landing {...defaultProps} />);
      
      expect(screen.getByText(/Powered by PeerJS/)).toBeInTheDocument();
    });
  });

  describe('Join Room Functionality', () => {
    it('should allow typing only numbers in code input', () => {
      render(<Landing {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter 4-digit code') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: '1234' } });
      expect(input.value).toBe('1234');
      
      fireEvent.change(input, { target: { value: 'abcd' } });
      expect(input.value).toBe('');
    });

    it('should limit code input to 4 digits', () => {
      render(<Landing {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter 4-digit code') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: '123456789' } });
      expect(input.value).toBe('1234');
    });

    it('should disable join button when code is empty', () => {
      render(<Landing {...defaultProps} />);
      
      const button = screen.getByText('Join Room').closest('button');
      expect(button).toBeDisabled();
    });

    it('should disable join button when code is less than 4 digits', () => {
      render(<Landing {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter 4-digit code');
      fireEvent.change(input, { target: { value: '123' } });
      
      const button = screen.getByText('Join Room').closest('button');
      expect(button).toBeDisabled();
    });

    it('should enable join button when code is 4 digits', () => {
      render(<Landing {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter 4-digit code');
      fireEvent.change(input, { target: { value: '1234' } });
      
      const button = screen.getByText('Join Room').closest('button');
      expect(button).toBeEnabled();
    });

    it('should call onJoin with code when form is submitted', () => {
      render(<Landing {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter 4-digit code');
      fireEvent.change(input, { target: { value: '5678' } });
      
      const form = input.closest('form');
      if (form) {
        fireEvent.submit(form);
      }
      
      expect(mockOnJoin).toHaveBeenCalledWith('5678');
    });

    it('should not call onJoin when code is incomplete', () => {
      render(<Landing {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Enter 4-digit code');
      fireEvent.change(input, { target: { value: '123' } });
      
      const form = input.closest('form');
      if (form) {
        fireEvent.submit(form);
      }
      
      expect(mockOnJoin).not.toHaveBeenCalled();
    });
  });

  describe('Create Room Functionality', () => {
    it('should call onCreate when host button is clicked', () => {
      render(<Landing {...defaultProps} />);
      
      const button = screen.getByText('Host a Room').closest('button');
      if (button) {
        fireEvent.click(button);
      }
      
      expect(mockOnCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Status Handling', () => {
    it('should show "Connecting..." when status is connecting', () => {
      render(<Landing {...defaultProps} status="connecting" />);
      
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('should disable inputs when connecting', () => {
      render(<Landing {...defaultProps} status="connecting" />);
      
      const input = screen.getByPlaceholderText('Enter 4-digit code');
      const joinButton = screen.getByText('Connecting...').closest('button');
      const createButton = screen.getByText('Host a Room').closest('button');
      
      expect(input).toBeDisabled();
      expect(joinButton).toBeDisabled();
      expect(createButton).toBeDisabled();
    });

    it('should disable inputs when generating code', () => {
      render(<Landing {...defaultProps} status="generating_code" />);
      
      const input = screen.getByPlaceholderText('Enter 4-digit code');
      const createButton = screen.getByText('Host a Room').closest('button');
      
      expect(input).toBeDisabled();
      expect(createButton).toBeDisabled();
    });

    it('should enable inputs when idle', () => {
      render(<Landing {...defaultProps} status="idle" />);
      
      const input = screen.getByPlaceholderText('Enter 4-digit code');
      const createButton = screen.getByText('Host a Room').closest('button');
      
      expect(input).toBeEnabled();
      expect(createButton).toBeEnabled();
    });
  });

  describe('Error Display', () => {
    it('should not display error when error is null', () => {
      render(<Landing {...defaultProps} error={null} />);
      
      const errorElement = screen.queryByText(/error/i);
      expect(errorElement).not.toBeInTheDocument();
    });

    it('should display error message when error is provided', () => {
      const errorMessage = 'Connection failed';
      render(<Landing {...defaultProps} error={errorMessage} />);
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should apply error styling when error is shown', () => {
      const errorMessage = 'Test error';
      render(<Landing {...defaultProps} error={errorMessage} />);
      
      const errorElement = screen.getByText(errorMessage);
      expect(errorElement).toHaveClass('text-red-200');
    });
  });
});

import { USER_COLORS, RANDOM_NAMES } from './constants';

export const generateRoomCode = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const generateRandomName = (): string => {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
};

export const generateRandomColor = (): string => {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
};

export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
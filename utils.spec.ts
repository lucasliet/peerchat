import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateRoomCode, generateRandomName, generateRandomColor, formatTime } from './utils';
import { USER_COLORS, RANDOM_NAMES } from './constants';

describe('utils', () => {
  describe('generateRoomCode', () => {
    it('should generate a 4-digit code', () => {
      const code = generateRoomCode();
      expect(code).toMatch(/^\d{4}$/);
    });

    it('should generate codes between 1000 and 9999', () => {
      const code = generateRoomCode();
      const numericCode = parseInt(code, 10);
      expect(numericCode).toBeGreaterThanOrEqual(1000);
      expect(numericCode).toBeLessThanOrEqual(9999);
    });

    it('should generate different codes on multiple calls', () => {
      const codes = new Set();
      // Generate 100 codes and expect at least 90% to be unique
      for (let i = 0; i < 100; i++) {
        codes.add(generateRoomCode());
      }
      expect(codes.size).toBeGreaterThan(90);
    });
  });

  describe('generateRandomName', () => {
    it('should return a name from RANDOM_NAMES list', () => {
      const name = generateRandomName();
      expect(RANDOM_NAMES).toContain(name);
    });

    it('should return a valid string', () => {
      const name = generateRandomName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    it('should generate names from the available list', () => {
      const names = new Set();
      // Generate names multiple times
      for (let i = 0; i < 50; i++) {
        names.add(generateRandomName());
      }
      // All generated names should be valid
      names.forEach(name => {
        expect(RANDOM_NAMES).toContain(name);
      });
    });
  });

  describe('generateRandomColor', () => {
    it('should return a color from USER_COLORS list', () => {
      const color = generateRandomColor();
      expect(USER_COLORS).toContain(color);
    });

    it('should return a valid Tailwind CSS class', () => {
      const color = generateRandomColor();
      expect(typeof color).toBe('string');
      expect(color).toMatch(/^bg-\w+-\d+$/);
    });

    it('should generate colors from the available list', () => {
      const colors = new Set();
      // Generate colors multiple times
      for (let i = 0; i < 50; i++) {
        colors.add(generateRandomColor());
      }
      // All generated colors should be valid
      colors.forEach(color => {
        expect(USER_COLORS).toContain(color);
      });
    });
  });

  describe('formatTime', () => {
    beforeEach(() => {
      // Mock toLocaleTimeString to have consistent tests
      vi.spyOn(Date.prototype, 'toLocaleTimeString');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should format timestamp to time string', () => {
      const timestamp = new Date('2024-01-15T14:30:00').getTime();
      formatTime(timestamp);
      expect(Date.prototype.toLocaleTimeString).toHaveBeenCalledWith(
        [],
        { hour: '2-digit', minute: '2-digit' }
      );
    });

    it('should return a string', () => {
      const timestamp = Date.now();
      const result = formatTime(timestamp);
      expect(typeof result).toBe('string');
    });

    it('should handle different timestamps', () => {
      const timestamp1 = new Date('2024-01-15T09:15:00').getTime();
      const timestamp2 = new Date('2024-01-15T22:45:00').getTime();
      
      const time1 = formatTime(timestamp1);
      const time2 = formatTime(timestamp2);
      
      expect(typeof time1).toBe('string');
      expect(typeof time2).toBe('string');
      expect(time1).not.toBe(time2);
    });

    it('should handle current timestamp', () => {
      const now = Date.now();
      const result = formatTime(now);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });
});

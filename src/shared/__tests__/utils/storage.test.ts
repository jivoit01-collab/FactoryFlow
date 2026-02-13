import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage, sessionStorage as appSessionStorage } from '../../utils/storage';

describe('storage (localStorage wrapper)', () => {
  const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('returns parsed JSON value', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ name: 'test' }));
      expect(storage.get('key')).toEqual({ name: 'test' });
    });

    it('returns null when key does not exist', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(storage.get('missing')).toBeNull();
    });

    it('returns defaultValue when key does not exist', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(storage.get('missing', 'default')).toBe('default');
    });

    it('returns defaultValue on JSON parse error', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('parse error');
      });
      expect(storage.get('key', 'fallback')).toBe('fallback');
    });

    it('returns null on error when no defaultValue', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('error');
      });
      expect(storage.get('key')).toBeNull();
    });
  });

  describe('set', () => {
    it('stores JSON stringified value', () => {
      storage.set('key', { value: 42 });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('key', JSON.stringify({ value: 42 }));
    });

    it('stores string value', () => {
      storage.set('key', 'hello');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('key', '"hello"');
    });

    it('handles error gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      storage.set('key', 'value');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('remove', () => {
    it('removes item from localStorage', () => {
      storage.remove('key');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('key');
    });

    it('handles error gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('error');
      });
      storage.remove('key');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('clear', () => {
    it('clears all localStorage', () => {
      storage.clear();
      expect(mockLocalStorage.clear).toHaveBeenCalled();
    });

    it('handles error gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLocalStorage.clear.mockImplementation(() => {
        throw new Error('error');
      });
      storage.clear();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

describe('sessionStorage wrapper', () => {
  const mockSessionStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal('window', { sessionStorage: mockSessionStorage });
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('returns parsed JSON value', () => {
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify('test'));
      expect(appSessionStorage.get('key')).toBe('test');
    });

    it('returns null when key does not exist', () => {
      mockSessionStorage.getItem.mockReturnValue(null);
      expect(appSessionStorage.get('missing')).toBeNull();
    });

    it('returns defaultValue when key does not exist', () => {
      mockSessionStorage.getItem.mockReturnValue(null);
      expect(appSessionStorage.get('missing', 'default')).toBe('default');
    });

    it('returns defaultValue on error', () => {
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error('error');
      });
      expect(appSessionStorage.get('key', 'fallback')).toBe('fallback');
    });
  });

  describe('set', () => {
    it('stores JSON stringified value', () => {
      appSessionStorage.set('key', { data: true });
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'key',
        JSON.stringify({ data: true }),
      );
    });

    it('handles error gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('error');
      });
      appSessionStorage.set('key', 'value');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('remove', () => {
    it('removes item from sessionStorage', () => {
      appSessionStorage.remove('key');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('key');
    });

    it('handles error gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSessionStorage.removeItem.mockImplementation(() => {
        throw new Error('error');
      });
      appSessionStorage.remove('key');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

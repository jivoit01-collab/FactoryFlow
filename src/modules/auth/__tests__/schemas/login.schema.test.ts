import { describe, it, expect } from 'vitest';
import { loginSchema, LOGIN_FORM_DEFAULTS } from '../../schemas/login.schema';

describe('Login Schema', () => {
  // ═══════════════════════════════════════════════════════════════
  // Valid Input
  // ═══════════════════════════════════════════════════════════════

  describe('valid input', () => {
    it('accepts a valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('transforms email to lowercase', () => {
      const result = loginSchema.safeParse({
        email: 'User@Example.COM',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Email Validation
  // ═══════════════════════════════════════════════════════════════

  describe('email validation', () => {
    it('rejects empty email', () => {
      const result = loginSchema.safeParse({ email: '', password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email format', () => {
      const result = loginSchema.safeParse({ email: 'not-an-email', password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('rejects email exceeding 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@b.com';
      const result = loginSchema.safeParse({ email: longEmail, password: 'password123' });
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Password Validation
  // ═══════════════════════════════════════════════════════════════

  describe('password validation', () => {
    it('rejects empty password', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
      expect(result.success).toBe(false);
    });

    it('rejects password shorter than 8 characters', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: 'short' });
      expect(result.success).toBe(false);
    });

    it('rejects password exceeding 128 characters', () => {
      const longPassword = 'a'.repeat(129);
      const result = loginSchema.safeParse({ email: 'user@example.com', password: longPassword });
      expect(result.success).toBe(false);
    });

    it('accepts password at exactly 8 characters', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: 'a'.repeat(8) });
      expect(result.success).toBe(true);
    });

    it('accepts password at exactly 128 characters', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'a'.repeat(128),
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Defaults
  // ═══════════════════════════════════════════════════════════════

  describe('LOGIN_FORM_DEFAULTS', () => {
    it('has empty email and password', () => {
      expect(LOGIN_FORM_DEFAULTS).toEqual({ email: '', password: '' });
    });
  });
});

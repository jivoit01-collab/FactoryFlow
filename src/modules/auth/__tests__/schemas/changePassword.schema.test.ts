import { describe, it, expect } from 'vitest';
import {
  changePasswordSchema,
  CHANGE_PASSWORD_FORM_DEFAULTS,
} from '../../schemas/changePassword.schema';

describe('Change Password Schema', () => {
  // ═══════════════════════════════════════════════════════════════
  // Valid Input
  // ═══════════════════════════════════════════════════════════════

  describe('valid input', () => {
    it('accepts valid old and new passwords that differ', () => {
      const result = changePasswordSchema.safeParse({
        old_password: 'oldpassword1',
        new_password: 'newpassword2',
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Refine Rule (old !== new)
  // ═══════════════════════════════════════════════════════════════

  describe('same password refine', () => {
    it('rejects when old and new passwords are identical', () => {
      const result = changePasswordSchema.safeParse({
        old_password: 'samepassword',
        new_password: 'samepassword',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const newPasswordError = result.error.issues.find((i) => i.path.includes('new_password'));
        expect(newPasswordError).toBeDefined();
        expect(newPasswordError?.message).toBe(
          'New password must be different from current password',
        );
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Old Password Validation
  // ═══════════════════════════════════════════════════════════════

  describe('old_password validation', () => {
    it('rejects empty old password', () => {
      const result = changePasswordSchema.safeParse({
        old_password: '',
        new_password: 'newpassword2',
      });
      expect(result.success).toBe(false);
    });

    it('rejects old password shorter than 8 characters', () => {
      const result = changePasswordSchema.safeParse({
        old_password: 'short',
        new_password: 'newpassword2',
      });
      expect(result.success).toBe(false);
    });

    it('rejects old password exceeding 128 characters', () => {
      const result = changePasswordSchema.safeParse({
        old_password: 'a'.repeat(129),
        new_password: 'newpassword2',
      });
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // New Password Validation
  // ═══════════════════════════════════════════════════════════════

  describe('new_password validation', () => {
    it('rejects empty new password', () => {
      const result = changePasswordSchema.safeParse({
        old_password: 'oldpassword1',
        new_password: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects new password shorter than 8 characters', () => {
      const result = changePasswordSchema.safeParse({
        old_password: 'oldpassword1',
        new_password: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('rejects new password exceeding 128 characters', () => {
      const result = changePasswordSchema.safeParse({
        old_password: 'oldpassword1',
        new_password: 'a'.repeat(129),
      });
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Defaults
  // ═══════════════════════════════════════════════════════════════

  describe('CHANGE_PASSWORD_FORM_DEFAULTS', () => {
    it('has empty old_password and new_password', () => {
      expect(CHANGE_PASSWORD_FORM_DEFAULTS).toEqual({
        old_password: '',
        new_password: '',
      });
    });
  });
});

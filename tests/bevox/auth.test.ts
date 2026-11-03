import { describe, it, expect } from 'vitest';
import { isAllowedAccessUser, ACCESS_HEADER } from '@/lib/bevox/auth';

describe('isAllowedAccessUser', () => {
  it('rejects when header missing', () => {
    const headers = new Headers();
    expect(isAllowedAccessUser(headers, ['you@example.com'])).toBe(false);
  });

  it('rejects when email not in allowlist', () => {
    const headers = new Headers({ [ACCESS_HEADER]: 'mallory@evil.com' });
    expect(isAllowedAccessUser(headers, ['you@example.com'])).toBe(false);
  });

  it('accepts when email is in allowlist (case-insensitive)', () => {
    const headers = new Headers({ [ACCESS_HEADER]: 'you@example.com' });
    expect(isAllowedAccessUser(headers, ['you@example.com'])).toBe(true);
  });

  it('rejects when allowlist is empty (fail closed)', () => {
    const headers = new Headers({ [ACCESS_HEADER]: 'you@example.com' });
    expect(isAllowedAccessUser(headers, [])).toBe(false);
  });
});

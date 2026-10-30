import { describe, it, expect } from 'vitest';
import { validatePayload } from '../src/engine/validator.js';

describe('Schema Validator', () => {
  const userSchema = {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string' },
      age: { type: 'integer' },
      rating: { type: 'number' },
      isActive: { type: 'boolean' },
      status: { type: 'string', enum: ['active', 'inactive', 'banned'] }
    }
  };

  it('should pass on valid payload', () => {
    const payload = {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      age: 36,
      rating: 4.95,
      isActive: true,
      status: 'active'
    };

    const res = validatePayload(payload, userSchema);
    expect(res.valid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it('should detect missing required fields', () => {
    const payload = {
      name: 'Ada Lovelace'
      // missing email
    };

    const res = validatePayload(payload, userSchema);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.field === 'email')).toBe(true);
  });

  it('should detect type mismatches', () => {
    const payload = {
      name: 12345, // should be string
      email: 'ada@example.com',
      age: 'thirty-six', // should be integer
      isActive: 'yes' // should be boolean
    };

    const res = validatePayload(payload, userSchema);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBe(3);
  });

  it('should enforce enum constraints', () => {
    const payload = {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      status: 'unknown_status' // not in enum
    };

    const res = validatePayload(payload, userSchema);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.field === 'status')).toBe(true);
  });

  it('should validate polymorphic oneOf schemas', () => {
    const polymorphicSchema = {
      oneOf: [
        {
          type: 'object',
          required: ['type', 'cardNumber'],
          properties: { type: { type: 'string' }, cardNumber: { type: 'string' } }
        },
        {
          type: 'object',
          required: ['type', 'iban'],
          properties: { type: { type: 'string' }, iban: { type: 'string' } }
        }
      ]
    };

    // Valid card
    expect(validatePayload({ type: 'card', cardNumber: '4111-2222' }, polymorphicSchema).valid).toBe(true);
    // Valid bank
    expect(validatePayload({ type: 'bank', iban: 'DE89370400440532013000' }, polymorphicSchema).valid).toBe(true);
    // Invalid (matches neither)
    expect(validatePayload({ type: 'crypto', wallet: '0x123' }, polymorphicSchema).valid).toBe(false);
  });
});

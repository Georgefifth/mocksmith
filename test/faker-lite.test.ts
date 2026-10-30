import { describe, it, expect } from 'vitest';
import {
  generateValueForProperty,
  generateEntityFromSchema,
  setRandomSeed
} from '../src/engine/faker-lite.js';

describe('FakerLite Extended Generator', () => {
  it('should generate phone, IP, currency, postal, and SKU heuristics', () => {
    setRandomSeed(12345);

    const phone = generateValueForProperty('phoneNumber');
    expect(phone).toMatch(/^\+1-555-\d{3}-\d{4}$/);

    const ip = generateValueForProperty('ip_address');
    expect(ip).toMatch(/^192\.168\.\d+\.\d+$/);

    const currency = generateValueForProperty('currency_code');
    expect(['USD', 'EUR', 'GBP', 'CAD', 'JPY']).toContain(currency);

    const postal = generateValueForProperty('postal_code');
    expect(postal).toMatch(/^\d{5}$/);

    const sku = generateValueForProperty('sku');
    expect(sku).toMatch(/^SKU-\d{4}-[ABX]$/);

    setRandomSeed(null);
  });

  it('should synthesize polymorphic oneOf models with discriminator', () => {
    const allSchemas = {
      CreditCard: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          cardNumber: { type: 'string' },
          brand: { type: 'string' }
        }
      },
      BankTransfer: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          iban: { type: 'string' },
          bic: { type: 'string' }
        }
      }
    };

    const polymorphicSchema = {
      oneOf: [
        { $ref: '#/components/schemas/CreditCard' },
        { $ref: '#/components/schemas/BankTransfer' }
      ],
      discriminator: {
        propertyName: 'type',
        mapping: {
          card: '#/components/schemas/CreditCard',
          bank: '#/components/schemas/BankTransfer'
        }
      }
    };

    const entity = generateEntityFromSchema(polymorphicSchema, 'pay_123', allSchemas);
    expect(entity.id).toBe('pay_123');
    expect(['card', 'bank']).toContain(entity.type);
    if (entity.type === 'card') {
      expect(entity.cardNumber).toBeDefined();
    } else {
      expect(entity.iban).toBeDefined();
    }
  });
});

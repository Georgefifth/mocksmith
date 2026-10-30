import { describe, it, expect } from 'vitest';
import { setRandomSeed, generateUUID, generateValueForProperty } from '../src/engine/faker-lite.js';

describe('Deterministic PRNG Seeding', () => {
  it('should generate 100% identical sequences with the same seed', () => {
    // Run 1 with seed 42
    setRandomSeed(42);
    const uuid1 = generateUUID();
    const name1 = generateValueForProperty('name');
    const email1 = generateValueForProperty('email');
    const price1 = generateValueForProperty('price');

    // Run 2 with same seed 42
    setRandomSeed(42);
    const uuid2 = generateUUID();
    const name2 = generateValueForProperty('name');
    const email2 = generateValueForProperty('email');
    const price2 = generateValueForProperty('price');

    expect(uuid1).toBe(uuid2);
    expect(name1).toBe(name2);
    expect(email1).toBe(email2);
    expect(price1).toBe(price2);

    // Reset seed back to null for non-deterministic default
    setRandomSeed(null);
  });
});

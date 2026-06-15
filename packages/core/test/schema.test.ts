import { describe, it, expect } from 'vitest';
import { validateProfile, parseProfile } from '../src/validate.js';
import { loadExample, exampleNames } from './fixtures.js';

describe('profile schema', () => {
  it('validates all example profiles', () => {
    for (const name of exampleNames) {
      const result = validateProfile(loadExample(name));
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    }
  });

  it('rejects a profile missing required fields', () => {
    const result = validateProfile({ schemaVersion: '1.0' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects an unknown source enum value', () => {
    const bad = {
      ...loadExample('mlops-engineer'),
      identity: { name: 'X', source: 'made-up', confidence: 1 },
    };
    expect(validateProfile(bad).valid).toBe(false);
  });

  it('parseProfile throws a readable error on invalid input', () => {
    expect(() => parseProfile({ schemaVersion: '1.0' })).toThrow(/Invalid Profile/);
  });
});

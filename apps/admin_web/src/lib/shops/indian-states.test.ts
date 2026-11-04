import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INDIAN_STATES, matchIndianState } from './indian-states';

describe('INDIAN_STATES', () => {
  it('has the same codes as the API contract', () => {
    const contract = JSON.parse(
      readFileSync(
        join(__dirname, '../../../../../packages/api_contracts/openapi.json'),
        'utf8',
      ),
    ) as {
      components: {
        schemas: Record<
          string,
          { properties: Record<string, { enum?: string[] }> }
        >;
      };
    };
    const apiCodes =
      contract.components.schemas.ShopAddressInput.properties.stateCode.enum;

    expect([...INDIAN_STATES.map((state) => state.code)].sort()).toEqual(
      [...(apiCodes ?? [])].sort(),
    );
  });
});

describe('matchIndianState', () => {
  it('matches a code or a name, ignoring case', () => {
    expect(matchIndianState('KL')).toBe('KL');
    expect(matchIndianState(' kerala ')).toBe('KL');
    expect(matchIndianState('Tamil Nadu')).toBe('TN');
  });

  it('returns null for anything else', () => {
    expect(matchIndianState('California')).toBeNull();
    expect(matchIndianState('')).toBeNull();
    expect(matchIndianState(undefined)).toBeNull();
  });
});

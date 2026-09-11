import { normalizePartyPurchaseTypes } from './party-purchase-type.util';

describe('normalizePartyPurchaseTypes', () => {
  it('normalizes and deduplicates JSON array values', () => {
    expect(normalizePartyPurchaseTypes(['goods', 'Services', 'Goods', 'unknown'])).toEqual(['Goods', 'Services']);
  });

  it('supports legacy comma-separated values during migration and rollout', () => {
    expect(normalizePartyPurchaseTypes('Goods, Services')).toEqual(['Goods', 'Services']);
  });

  it.each([null, undefined, {}, 1])('returns an empty array for unsupported value %p', (value) => {
    expect(normalizePartyPurchaseTypes(value)).toEqual([]);
  });
});

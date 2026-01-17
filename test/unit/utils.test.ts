/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
  dropsToXrp,
  xrpToDrops,
  weiToEth,
  ethToWei,
  formatRlusdAmount,
  parseRlusdAmount,
  validatePositiveAmount,
  compareAmounts,
  addAmounts,
  subtractAmounts,
} from '../../nodes/Rlusd/utils/amountUtils';

import {
  createRlusdTrustlineConfig,
  parseTrustlineFlags,
  buildTrustSetFlags,
  hasRlusdTrustline,
  validateTrustlineLimit,
  calculateTrustlineReserve,
} from '../../nodes/Rlusd/utils/trustlineUtils';

import {
  buildPaymentFlags,
  validateDestinationTag,
  generateDestinationTag,
  isCrossCurrencyPayment,
} from '../../nodes/Rlusd/utils/paymentUtils';

import {
  buildOfferFlags,
  calculateQuality,
  calculateSpread,
  calculateMidPrice,
} from '../../nodes/Rlusd/utils/dexUtils';

describe('Amount Utilities', () => {
  describe('dropsToXrp', () => {
    it('should convert drops to XRP correctly', () => {
      expect(dropsToXrp('1000000')).toBe('1');
      expect(dropsToXrp('500000')).toBe('0.5');
      expect(dropsToXrp('1')).toBe('0.000001');
    });

    it('should handle zero', () => {
      expect(dropsToXrp('0')).toBe('0');
    });
  });

  describe('xrpToDrops', () => {
    it('should convert XRP to drops correctly', () => {
      expect(xrpToDrops('1')).toBe('1000000');
      expect(xrpToDrops('0.5')).toBe('500000');
    });
  });

  describe('weiToEth', () => {
    it('should convert wei to ETH correctly', () => {
      expect(weiToEth('1000000000000000000')).toBe('1');
    });
  });

  describe('ethToWei', () => {
    it('should convert ETH to wei correctly', () => {
      expect(ethToWei('1')).toBe('1000000000000000000');
    });
  });

  describe('formatRlusdAmount', () => {
    it('should format amounts with commas', () => {
      expect(formatRlusdAmount('1000000')).toContain('1,000,000');
    });
  });

  describe('parseRlusdAmount', () => {
    it('should parse formatted amounts', () => {
      expect(parseRlusdAmount('1,000,000.00')).toBe('1000000');
    });

    it('should throw on invalid amounts', () => {
      expect(() => parseRlusdAmount('invalid')).toThrow();
    });
  });

  describe('validatePositiveAmount', () => {
    it('should return true for positive amounts', () => {
      expect(validatePositiveAmount('100')).toBe(true);
      expect(validatePositiveAmount(100)).toBe(true);
    });

    it('should return false for invalid amounts', () => {
      expect(validatePositiveAmount('0')).toBe(false);
      expect(validatePositiveAmount('-100')).toBe(false);
    });
  });

  describe('compareAmounts', () => {
    it('should compare amounts correctly', () => {
      expect(compareAmounts('100', '200')).toBe(-1);
      expect(compareAmounts('200', '100')).toBe(1);
      expect(compareAmounts('100', '100')).toBe(0);
    });
  });

  describe('addAmounts', () => {
    it('should add amounts correctly', () => {
      expect(addAmounts('100', '200', '300')).toBe('600');
    });
  });

  describe('subtractAmounts', () => {
    it('should subtract amounts correctly', () => {
      expect(subtractAmounts('300', '100')).toBe('200');
    });
  });
});

describe('Trustline Utilities', () => {
  describe('createRlusdTrustlineConfig', () => {
    it('should create config for mainnet', () => {
      const config = createRlusdTrustlineConfig('mainnet');
      expect(config.currency).toBe('RLUSD');
      expect(config.issuer).toBe('rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De');
    });

    it('should throw for unknown network', () => {
      expect(() => createRlusdTrustlineConfig('unknown' as any)).toThrow();
    });
  });

  describe('parseTrustlineFlags', () => {
    it('should parse flags for high node', () => {
      const flags = parseTrustlineFlags(0x00080000, true);
      expect(flags.authorized).toBe(true);
    });
  });

  describe('buildTrustSetFlags', () => {
    it('should build flags correctly', () => {
      const flags = buildTrustSetFlags({ setNoRipple: true });
      expect(flags).toBe(0x00020000);
    });
  });

  describe('hasRlusdTrustline', () => {
    it('should detect RLUSD trustline', () => {
      const lines = [{ currency: 'RLUSD', account: 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De' }];
      expect(hasRlusdTrustline(lines, 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De')).toBe(true);
    });

    it('should return false when no trustline', () => {
      const lines = [{ currency: 'USD', account: 'r...' }];
      expect(hasRlusdTrustline(lines, 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De')).toBe(false);
    });
  });

  describe('validateTrustlineLimit', () => {
    it('should validate positive limits', () => {
      expect(validateTrustlineLimit('1000000')).toBe(true);
    });

    it('should reject invalid limits', () => {
      expect(validateTrustlineLimit('invalid')).toBe(false);
    });
  });

  describe('calculateTrustlineReserve', () => {
    it('should calculate reserve correctly', () => {
      expect(calculateTrustlineReserve(5)).toBe('10');
    });
  });
});

describe('Payment Utilities', () => {
  describe('buildPaymentFlags', () => {
    it('should build partial payment flag', () => {
      const flags = buildPaymentFlags({ partialPayment: true });
      expect(flags).toBe(0x00020000);
    });
  });

  describe('validateDestinationTag', () => {
    it('should validate valid tags', () => {
      expect(validateDestinationTag(0)).toBe(true);
      expect(validateDestinationTag(12345)).toBe(true);
    });

    it('should reject invalid tags', () => {
      expect(validateDestinationTag(-1)).toBe(false);
      expect(validateDestinationTag(4294967296)).toBe(false);
    });
  });

  describe('generateDestinationTag', () => {
    it('should generate valid tag', () => {
      const tag = generateDestinationTag();
      expect(tag).toBeGreaterThanOrEqual(0);
      expect(tag).toBeLessThanOrEqual(4294967295);
    });
  });

  describe('isCrossCurrencyPayment', () => {
    it('should detect cross-currency payment', () => {
      expect(isCrossCurrencyPayment('XRP', undefined, 'RLUSD', 'issuer')).toBe(true);
    });

    it('should detect same-currency payment', () => {
      expect(isCrossCurrencyPayment('XRP', undefined, 'XRP', undefined)).toBe(false);
    });
  });
});

describe('DEX Utilities', () => {
  describe('buildOfferFlags', () => {
    it('should build passive flag', () => {
      expect(buildOfferFlags({ passive: true })).toBe(0x00010000);
    });

    it('should build sell flag', () => {
      expect(buildOfferFlags({ sell: true })).toBe(0x00080000);
    });
  });

  describe('calculateQuality', () => {
    it('should calculate quality correctly', () => {
      expect(calculateQuality('100', '50')).toBe('2');
    });

    it('should handle zero gets', () => {
      expect(calculateQuality('100', '0')).toBe('0');
    });
  });

  describe('calculateSpread', () => {
    it('should calculate spread correctly', () => {
      const spread = calculateSpread('0.95', '1.05');
      expect(parseFloat(spread.absolute)).toBeCloseTo(0.1, 1);
    });
  });

  describe('calculateMidPrice', () => {
    it('should calculate mid price correctly', () => {
      expect(calculateMidPrice('0.95', '1.05')).toBe('1.00000000');
    });
  });
});

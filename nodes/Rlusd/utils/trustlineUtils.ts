/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * RLUSD Trustline Utilities
 */

import { RLUSD_CURRENCY_CODE, XRPL_RLUSD_ISSUERS, RECOMMENDED_TRUSTLINE_LIMIT } from '../constants/issuer';

export interface TrustlineFlags {
  authorized: boolean;
  frozen: boolean;
  noRipple: boolean;
}

export interface TrustlineConfig {
  currency: string;
  issuer: string;
  limit: string;
  qualityIn?: number;
  qualityOut?: number;
  noRipple?: boolean;
}

export const TRUSTLINE_FLAGS = {
  lsfLowAuth: 0x00040000,
  lsfHighAuth: 0x00080000,
  lsfLowNoRipple: 0x00100000,
  lsfHighNoRipple: 0x00200000,
  lsfLowFreeze: 0x00400000,
  lsfHighFreeze: 0x00800000,
};

export const TRUSTSET_FLAGS = {
  tfSetfAuth: 0x00010000,
  tfSetNoRipple: 0x00020000,
  tfClearNoRipple: 0x00040000,
  tfSetFreeze: 0x00100000,
  tfClearFreeze: 0x00200000,
};

export function createRlusdTrustlineConfig(
  network: 'mainnet' | 'testnet' | 'devnet',
  limit: string = RECOMMENDED_TRUSTLINE_LIMIT,
): TrustlineConfig {
  const issuer = XRPL_RLUSD_ISSUERS[network];
  if (!issuer) throw new Error(`Unknown network: ${network}`);

  return {
    currency: RLUSD_CURRENCY_CODE,
    issuer: issuer.address,
    limit,
    noRipple: true,
  };
}

export function parseTrustlineFlags(flags: number, isHighNode: boolean): TrustlineFlags {
  if (isHighNode) {
    return {
      authorized: (flags & TRUSTLINE_FLAGS.lsfHighAuth) !== 0,
      frozen: (flags & TRUSTLINE_FLAGS.lsfHighFreeze) !== 0,
      noRipple: (flags & TRUSTLINE_FLAGS.lsfHighNoRipple) !== 0,
    };
  }
  return {
    authorized: (flags & TRUSTLINE_FLAGS.lsfLowAuth) !== 0,
    frozen: (flags & TRUSTLINE_FLAGS.lsfLowFreeze) !== 0,
    noRipple: (flags & TRUSTLINE_FLAGS.lsfLowNoRipple) !== 0,
  };
}

export function buildTrustSetFlags(options: {
  setAuth?: boolean;
  setNoRipple?: boolean;
  clearNoRipple?: boolean;
  setFreeze?: boolean;
  clearFreeze?: boolean;
}): number {
  let flags = 0;
  if (options.setAuth) flags |= TRUSTSET_FLAGS.tfSetfAuth;
  if (options.setNoRipple) flags |= TRUSTSET_FLAGS.tfSetNoRipple;
  if (options.clearNoRipple) flags |= TRUSTSET_FLAGS.tfClearNoRipple;
  if (options.setFreeze) flags |= TRUSTSET_FLAGS.tfSetFreeze;
  if (options.clearFreeze) flags |= TRUSTSET_FLAGS.tfClearFreeze;
  return flags;
}

export function hasRlusdTrustline(
  accountLines: Array<{ currency: string; account: string }>,
  issuerAddress: string,
): boolean {
  return accountLines.some(
    (line) =>
      line.currency === RLUSD_CURRENCY_CODE &&
      line.account.toLowerCase() === issuerAddress.toLowerCase(),
  );
}

export function validateTrustlineLimit(limit: string): boolean {
  const num = parseFloat(limit);
  return !isNaN(num) && num >= 0 && isFinite(num);
}

export function calculateTrustlineReserve(trustlineCount: number): string {
  return (trustlineCount * 2).toString();
}

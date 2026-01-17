/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * RLUSD Issuer Configuration Constants
 */

export interface IssuerConfig {
  address: string;
  currencyCode: string;
  displayName: string;
  isOfficial: boolean;
}

export const XRPL_RLUSD_ISSUERS: Record<string, IssuerConfig> = {
  mainnet: {
    address: 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De',
    currencyCode: 'RLUSD',
    displayName: 'Ripple RLUSD (Mainnet)',
    isOfficial: true,
  },
  testnet: {
    address: 'rQhWct2fTQgPdDT7Xp9e8Dg2btrKmcG5p',
    currencyCode: 'RLUSD',
    displayName: 'Ripple RLUSD (Testnet)',
    isOfficial: true,
  },
  devnet: {
    address: 'rP9jPyP5kyvFRb6ZiRghAGw5u8SGAmU4bd',
    currencyCode: 'RLUSD',
    displayName: 'Ripple RLUSD (Devnet)',
    isOfficial: true,
  },
};

export const RLUSD_CURRENCY_CODE = 'RLUSD';

export const RLUSD_DECIMALS = {
  xrpl: 15,
  ethereum: 18,
};

export function getIssuerAddress(network: string): string | null {
  return XRPL_RLUSD_ISSUERS[network]?.address || null;
}

export function isOfficialIssuer(address: string): boolean {
  return Object.values(XRPL_RLUSD_ISSUERS).some(
    (issuer) => issuer.address.toLowerCase() === address.toLowerCase() && issuer.isOfficial
  );
}

export const RECOMMENDED_TRUSTLINE_LIMIT = '1000000000';

/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * RLUSD Amount Utilities
 */

export function dropsToXrp(drops: string | number): string {
  const dropsNum = typeof drops === 'string' ? BigInt(drops) : BigInt(Math.floor(drops));
  return (Number(dropsNum) / 1_000_000).toString();
}

export function xrpToDrops(xrp: string | number): string {
  const xrpNum = typeof xrp === 'string' ? parseFloat(xrp) : xrp;
  return Math.floor(xrpNum * 1_000_000).toString();
}

export function weiToEth(wei: string | bigint): string {
  const weiBigInt = typeof wei === 'string' ? BigInt(wei) : wei;
  return (Number(weiBigInt) / 1e18).toString();
}

export function ethToWei(eth: string | number): string {
  const ethNum = typeof eth === 'string' ? parseFloat(eth) : eth;
  return BigInt(Math.floor(ethNum * 1e18)).toString();
}

export function formatRlusdAmount(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(num);
}

export function parseRlusdAmount(displayAmount: string): string {
  const cleaned = displayAmount.replace(/[,\s$]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) throw new Error(`Invalid RLUSD amount: ${displayAmount}`);
  return num.toString();
}

export function validatePositiveAmount(amount: string | number): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0 && isFinite(num);
}

export function compareAmounts(a: string, b: string): number {
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  if (numA < numB) return -1;
  if (numA > numB) return 1;
  return 0;
}

export function addAmounts(...amounts: string[]): string {
  return amounts.reduce((acc, amt) => acc + parseFloat(amt), 0).toString();
}

export function subtractAmounts(a: string, b: string): string {
  return (parseFloat(a) - parseFloat(b)).toString();
}

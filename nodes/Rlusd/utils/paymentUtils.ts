/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * RLUSD Payment Utilities
 */

import { RLUSD_CURRENCY_CODE } from '../constants/issuer';

export enum PaymentType {
  DIRECT = 'direct',
  CROSS_CURRENCY = 'cross_currency',
  PARTIAL = 'partial',
}

export enum PaymentStatus {
  PENDING = 'pending',
  VALIDATED = 'validated',
  FAILED = 'failed',
}

export const PAYMENT_FLAGS = {
  tfNoDirectRipple: 0x00010000,
  tfPartialPayment: 0x00020000,
  tfLimitQuality: 0x00040000,
};

export function buildRlusdAmount(
  value: string,
  issuer: string,
): { currency: string; issuer: string; value: string } {
  return { currency: RLUSD_CURRENCY_CODE, issuer, value };
}

export function buildPaymentFlags(options: {
  noDirectRipple?: boolean;
  partialPayment?: boolean;
  limitQuality?: boolean;
}): number {
  let flags = 0;
  if (options.noDirectRipple) flags |= PAYMENT_FLAGS.tfNoDirectRipple;
  if (options.partialPayment) flags |= PAYMENT_FLAGS.tfPartialPayment;
  if (options.limitQuality) flags |= PAYMENT_FLAGS.tfLimitQuality;
  return flags;
}

export function validateDestinationTag(tag: number): boolean {
  return Number.isInteger(tag) && tag >= 0 && tag <= 4294967295;
}

export function generateDestinationTag(): number {
  return Math.floor(Math.random() * 4294967295);
}

export function isCrossCurrencyPayment(
  sourceCurrency: string,
  sourceIssuer: string | undefined,
  destCurrency: string,
  destIssuer: string | undefined,
): boolean {
  if (sourceCurrency !== destCurrency) return true;
  if (sourceCurrency === 'XRP') return false;
  return sourceIssuer !== destIssuer;
}

export function createMemo(
  type: string,
  data: string,
): { Memo: { MemoType?: string; MemoData?: string } } {
  return {
    Memo: {
      MemoType: Buffer.from(type).toString('hex').toUpperCase(),
      MemoData: Buffer.from(data).toString('hex').toUpperCase(),
    },
  };
}

export function parseMemo(memo: { MemoType?: string; MemoData?: string }): {
  type?: string;
  data?: string;
} {
  return {
    type: memo.MemoType ? Buffer.from(memo.MemoType, 'hex').toString('utf8') : undefined,
    data: memo.MemoData ? Buffer.from(memo.MemoData, 'hex').toString('utf8') : undefined,
  };
}

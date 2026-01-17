/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * RLUSD DEX Utilities
 */

import { RLUSD_CURRENCY_CODE } from '../constants/issuer';

export enum OrderType {
  LIMIT = 'limit',
  MARKET = 'market',
  IOC = 'ioc',
  FOK = 'fok',
}

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export enum OrderStatus {
  OPEN = 'open',
  PARTIALLY_FILLED = 'partially_filled',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
}

export const OFFER_FLAGS = {
  tfPassive: 0x00010000,
  tfImmediateOrCancel: 0x00020000,
  tfFillOrKill: 0x00040000,
  tfSell: 0x00080000,
};

export interface OrderBookEntry {
  price: string;
  amount: string;
  total: string;
  owner: string;
  sequence: number;
}

export function buildOfferFlags(options: {
  passive?: boolean;
  immediateOrCancel?: boolean;
  fillOrKill?: boolean;
  sell?: boolean;
}): number {
  let flags = 0;
  if (options.passive) flags |= OFFER_FLAGS.tfPassive;
  if (options.immediateOrCancel) flags |= OFFER_FLAGS.tfImmediateOrCancel;
  if (options.fillOrKill) flags |= OFFER_FLAGS.tfFillOrKill;
  if (options.sell) flags |= OFFER_FLAGS.tfSell;
  return flags;
}

export function calculateQuality(takerPaysValue: string, takerGetsValue: string): string {
  const pays = parseFloat(takerPaysValue);
  const gets = parseFloat(takerGetsValue);
  if (gets === 0) return '0';
  return (pays / gets).toString();
}

export function calculatePrice(
  takerGets: string | { value: string },
  takerPays: string | { value: string },
  invert: boolean = false,
): string {
  const gets =
    typeof takerGets === 'string'
      ? parseFloat(takerGets) / 1_000_000
      : parseFloat(takerGets.value);
  const pays =
    typeof takerPays === 'string'
      ? parseFloat(takerPays) / 1_000_000
      : parseFloat(takerPays.value);

  if (invert) return gets === 0 ? '0' : (pays / gets).toFixed(8);
  return pays === 0 ? '0' : (gets / pays).toFixed(8);
}

export function calculateSpread(
  bestBid: string,
  bestAsk: string,
): { absolute: string; percentage: string } {
  const bid = parseFloat(bestBid);
  const ask = parseFloat(bestAsk);
  const absolute = (ask - bid).toFixed(8);
  const percentage = bid === 0 ? '0' : (((ask - bid) / bid) * 100).toFixed(4);
  return { absolute, percentage };
}

export function calculateMidPrice(bestBid: string, bestAsk: string): string {
  const bid = parseFloat(bestBid);
  const ask = parseFloat(bestAsk);
  return ((bid + ask) / 2).toFixed(8);
}

export function buildTakerGetsRlusd(
  value: string,
  issuer: string,
): { currency: string; issuer: string; value: string } {
  return { currency: RLUSD_CURRENCY_CODE, issuer, value };
}

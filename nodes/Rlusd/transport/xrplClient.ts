/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * XRPL Client Transport
 */

import { Client, Wallet, xrpToDrops } from 'xrpl';
import { XRPL_NETWORKS, WS_CONNECTION_TIMEOUT } from '../constants/networks';
import { XRPL_RLUSD_ISSUERS, RLUSD_CURRENCY_CODE } from '../constants/issuer';

export interface XrplClientConfig {
  network: 'mainnet' | 'testnet' | 'devnet' | 'custom';
  customUrl?: string;
  timeout?: number;
}

export interface XrplTransactionResult {
  success: boolean;
  hash: string;
  ledgerIndex?: number;
  resultCode: string;
  resultMessage: string;
  fee: string;
  sequence: number;
  validated?: boolean;
}

export class XrplClient {
  private client: Client;
  private wallet: Wallet | null = null;
  private config: XrplClientConfig;
  private isConnected: boolean = false;

  constructor(config: XrplClientConfig) {
    this.config = config;
    const url = this.getWebSocketUrl();
    this.client = new Client(url, { timeout: config.timeout || WS_CONNECTION_TIMEOUT });
  }

  private getWebSocketUrl(): string {
    if (this.config.network === 'custom' && this.config.customUrl) {
      return this.config.customUrl;
    }
    return XRPL_NETWORKS[this.config.network]?.websocketUrl || XRPL_NETWORKS.mainnet.websocketUrl;
  }

  public getIssuerAddress(): string {
    return (
      XRPL_RLUSD_ISSUERS[this.config.network]?.address || XRPL_RLUSD_ISSUERS.mainnet.address
    );
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  setWallet(seed: string): void {
    this.wallet = Wallet.fromSeed(seed);
  }

  getWalletAddress(): string | null {
    return this.wallet?.address || null;
  }

  async getAccountInfo(address: string): Promise<any> {
    await this.connect();
    return this.client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated',
    });
  }

  async getAccountLines(address: string, peer?: string): Promise<any> {
    await this.connect();
    return this.client.request({
      command: 'account_lines',
      account: address,
      ledger_index: 'validated',
      ...(peer && { peer }),
    });
  }

  async getRlusdBalance(address: string): Promise<string> {
    const response = await this.getAccountLines(address, this.getIssuerAddress());
    const rlusdLine = response.result.lines.find(
      (line: any) =>
        line.currency === RLUSD_CURRENCY_CODE && line.account === this.getIssuerAddress(),
    );
    return rlusdLine?.balance || '0';
  }

  async getAccountOffers(address: string): Promise<any> {
    await this.connect();
    return this.client.request({
      command: 'account_offers',
      account: address,
      ledger_index: 'validated',
    });
  }

  async getAccountTransactions(address: string, limit: number = 20, marker?: any): Promise<any> {
    await this.connect();
    return this.client.request({
      command: 'account_tx',
      account: address,
      ledger_index_min: -1,
      ledger_index_max: -1,
      limit,
      ...(marker && { marker }),
    });
  }

  async getOrderBook(
    takerGets: { currency: string; issuer?: string },
    takerPays: { currency: string; issuer?: string },
    limit: number = 20,
  ): Promise<any> {
    await this.connect();
    return this.client.request({
      command: 'book_offers',
      taker_gets:
        takerGets.currency === 'XRP'
          ? { currency: 'XRP' }
          : { currency: takerGets.currency, issuer: takerGets.issuer! },
      taker_pays:
        takerPays.currency === 'XRP'
          ? { currency: 'XRP' }
          : { currency: takerPays.currency, issuer: takerPays.issuer! },
      limit,
    });
  }

  async getRlusdXrpOrderBook(limit: number = 20): Promise<{ bids: any; asks: any }> {
    const issuer = this.getIssuerAddress();
    const [bidsResponse, asksResponse] = await Promise.all([
      this.getOrderBook({ currency: 'XRP' }, { currency: RLUSD_CURRENCY_CODE, issuer }, limit),
      this.getOrderBook({ currency: RLUSD_CURRENCY_CODE, issuer }, { currency: 'XRP' }, limit),
    ]);
    return { bids: bidsResponse.result.offers, asks: asksResponse.result.offers };
  }

  async getServerInfo(): Promise<any> {
    await this.connect();
    return this.client.request({ command: 'server_info' });
  }

  async getLedgerInfo(
    ledgerIndex: 'validated' | 'current' | number = 'validated',
  ): Promise<any> {
    await this.connect();
    return this.client.request({
      command: 'ledger',
      ledger_index: ledgerIndex,
      transactions: false,
      expand: false,
    });
  }

  async getTransaction(hash: string): Promise<any> {
    await this.connect();
    return this.client.request({ command: 'tx', transaction: hash });
  }

  async getFeeEstimate(): Promise<{ base: string; median: string; minimum: string }> {
    const serverInfo = await this.getServerInfo();
    const loadFactor = serverInfo.result.info.load_factor || 1;
    const baseFee = serverInfo.result.info.validated_ledger?.base_fee_xrp || 0.00001;
    return {
      base: (baseFee * 1_000_000).toString(),
      median: Math.ceil(baseFee * loadFactor * 1_000_000).toString(),
      minimum: '10',
    };
  }

  async setTrustline(
    limit: string,
    options: { qualityIn?: number; qualityOut?: number; noRipple?: boolean } = {},
  ): Promise<XrplTransactionResult> {
    if (!this.wallet) throw new Error('Wallet not set');
    await this.connect();

    const tx: any = {
      TransactionType: 'TrustSet',
      Account: this.wallet.address,
      LimitAmount: {
        currency: RLUSD_CURRENCY_CODE,
        issuer: this.getIssuerAddress(),
        value: limit,
      },
      ...(options.qualityIn && { QualityIn: options.qualityIn }),
      ...(options.qualityOut && { QualityOut: options.qualityOut }),
    };
    if (options.noRipple) tx.Flags = 0x00020000;

    return this.submitTransaction(tx);
  }

  async sendRlusd(
    destination: string,
    amount: string,
    options: { destinationTag?: number; memos?: Array<{ type: string; data: string }> } = {},
  ): Promise<XrplTransactionResult> {
    if (!this.wallet) throw new Error('Wallet not set');
    await this.connect();

    const tx: any = {
      TransactionType: 'Payment',
      Account: this.wallet.address,
      Destination: destination,
      Amount: {
        currency: RLUSD_CURRENCY_CODE,
        issuer: this.getIssuerAddress(),
        value: amount,
      },
      ...(options.destinationTag && { DestinationTag: options.destinationTag }),
    };

    if (options.memos) {
      tx.Memos = options.memos.map((m) => ({
        Memo: {
          MemoType: Buffer.from(m.type).toString('hex').toUpperCase(),
          MemoData: Buffer.from(m.data).toString('hex').toUpperCase(),
        },
      }));
    }

    return this.submitTransaction(tx);
  }

  async placeOrder(
    takerGets: string | { currency: string; issuer: string; value: string },
    takerPays: string | { currency: string; issuer: string; value: string },
    options: {
      passive?: boolean;
      immediateOrCancel?: boolean;
      fillOrKill?: boolean;
      sell?: boolean;
      expiration?: number;
    } = {},
  ): Promise<XrplTransactionResult> {
    if (!this.wallet) throw new Error('Wallet not set');
    await this.connect();

    let flags = 0;
    if (options.passive) flags |= 0x00010000;
    if (options.immediateOrCancel) flags |= 0x00020000;
    if (options.fillOrKill) flags |= 0x00040000;
    if (options.sell) flags |= 0x00080000;

    const tx: any = {
      TransactionType: 'OfferCreate',
      Account: this.wallet.address,
      TakerGets: takerGets,
      TakerPays: takerPays,
      ...(flags && { Flags: flags }),
      ...(options.expiration && { Expiration: options.expiration }),
    };

    return this.submitTransaction(tx);
  }

  async cancelOrder(offerSequence: number): Promise<XrplTransactionResult> {
    if (!this.wallet) throw new Error('Wallet not set');
    await this.connect();
    return this.submitTransaction({
      TransactionType: 'OfferCancel',
      Account: this.wallet.address,
      OfferSequence: offerSequence,
    });
  }

  async createEscrow(
    destination: string,
    amount: string,
    options: {
      finishAfter?: number;
      cancelAfter?: number;
      condition?: string;
      destinationTag?: number;
    },
  ): Promise<XrplTransactionResult> {
    if (!this.wallet) throw new Error('Wallet not set');
    await this.connect();

    const tx: any = {
      TransactionType: 'EscrowCreate',
      Account: this.wallet.address,
      Destination: destination,
      Amount: xrpToDrops(amount),
      ...(options.finishAfter && { FinishAfter: options.finishAfter }),
      ...(options.cancelAfter && { CancelAfter: options.cancelAfter }),
      ...(options.condition && { Condition: options.condition }),
      ...(options.destinationTag && { DestinationTag: options.destinationTag }),
    };

    return this.submitTransaction(tx);
  }

  async getAmmInfo(
    asset1: { currency: string; issuer?: string },
    asset2: { currency: string; issuer?: string },
  ): Promise<any> {
    await this.connect();
    return this.client.request({
      command: 'amm_info',
      asset:
        asset1.currency === 'XRP'
          ? { currency: 'XRP' }
          : { currency: asset1.currency, issuer: asset1.issuer },
      asset2:
        asset2.currency === 'XRP'
          ? { currency: 'XRP' }
          : { currency: asset2.currency, issuer: asset2.issuer },
    } as any);
  }

  async getRlusdXrpAmmInfo(): Promise<any> {
    return this.getAmmInfo(
      { currency: RLUSD_CURRENCY_CODE, issuer: this.getIssuerAddress() },
      { currency: 'XRP' },
    );
  }

  async subscribeLedger(callback: (ledger: any) => void): Promise<void> {
    await this.connect();
    await this.client.request({ command: 'subscribe', streams: ['ledger'] });
    this.client.on('ledgerClosed', callback);
  }

  async subscribeAccount(address: string, callback: (tx: any) => void): Promise<void> {
    await this.connect();
    await this.client.request({ command: 'subscribe', accounts: [address] });
    this.client.on('transaction', callback);
  }

  async unsubscribeAll(): Promise<void> {
    await this.client.request({ command: 'unsubscribe', streams: ['ledger'] });
  }

  private async submitTransaction(tx: any): Promise<XrplTransactionResult> {
    if (!this.wallet) throw new Error('Wallet not set');

    const prepared = await this.client.autofill(tx);
    const signed = this.wallet.sign(prepared);
    const result = await this.client.submitAndWait(signed.tx_blob);

    const meta = result.result.meta as any;
    const success = meta?.TransactionResult === 'tesSUCCESS';

    return {
      success,
      hash: result.result.hash,
      ledgerIndex: result.result.ledger_index,
      resultCode: meta?.TransactionResult || 'unknown',
      resultMessage: this.getResultMessage(meta?.TransactionResult),
      fee: prepared.Fee || '0',
      sequence: prepared.Sequence || 0,
      validated: result.result.validated,
    };
  }

  private getResultMessage(code: string): string {
    const messages: Record<string, string> = {
      tesSUCCESS: 'Transaction successful',
      tecUNFUNDED_PAYMENT: 'Insufficient RLUSD balance',
      tecNO_DST: 'Destination account does not exist',
      tecNO_LINE: 'No trustline to RLUSD issuer',
      tecPATH_DRY: 'No valid payment path found',
      tecINSUFF_FEE: 'Insufficient XRP for transaction fee',
      tecFROZEN: 'Trustline is frozen',
      tecNO_PERMISSION: 'Not authorized for this operation',
    };
    return messages[code] || `Transaction result: ${code}`;
  }
}

export function createXrplClient(network: string, customUrl?: string): XrplClient {
  let networkKey: 'mainnet' | 'testnet' | 'devnet' | 'custom' = 'mainnet';
  if (network.includes('testnet')) networkKey = 'testnet';
  else if (network.includes('devnet')) networkKey = 'devnet';
  else if (network.includes('custom')) networkKey = 'custom';
  return new XrplClient({ network: networkKey, customUrl });
}

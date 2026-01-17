/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
  ITriggerFunctions,
  INodeType,
  INodeTypeDescription,
  ITriggerResponse,
} from 'n8n-workflow';
import { XrplClient, createXrplClient } from './transport/xrplClient';
import { EthereumClient, createEthereumClient } from './transport/ethereumClient';
import { RLUSD_CURRENCY_CODE } from './constants/issuer';

// Emit licensing notice once on module load
const LICENSING_NOTICE = `[Velocity BPA Licensing Notice]

This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).

Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.

For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.`;

let licenseNoticeEmitted = false;
function emitLicenseNotice(): void {
  if (!licenseNoticeEmitted) {
    console.warn(LICENSING_NOTICE);
    licenseNoticeEmitted = true;
  }
}

export class RlusdTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'RLUSD Trigger',
    name: 'rlusdTrigger',
    icon: 'file:rlusd.svg',
    group: ['trigger'],
    version: 1,
    subtitle: '={{$parameter["event"]}}',
    description: 'Triggers on RLUSD events on XRPL and Ethereum',
    defaults: { name: 'RLUSD Trigger' },
    inputs: [],
    outputs: ['main'],
    credentials: [{ name: 'rlusdNetwork', required: true }],
    properties: [
      {
        displayName: 'Event',
        name: 'event',
        type: 'options',
        default: 'transfer',
        options: [
          { name: 'RLUSD Transfer', value: 'transfer', description: 'Triggered on RLUSD transfer' },
          { name: 'Large Transfer Alert', value: 'largeTransfer', description: 'Triggered on large transfers' },
          { name: 'Transfer to Address', value: 'transferTo', description: 'Triggered when address receives RLUSD' },
          { name: 'Transfer from Address', value: 'transferFrom', description: 'Triggered when address sends RLUSD' },
          { name: 'New Ledger (XRPL)', value: 'newLedger', description: 'Triggered on new XRPL ledger' },
          { name: 'New Block (Ethereum)', value: 'newBlock', description: 'Triggered on new Ethereum block' },
        ],
      },
      {
        displayName: 'Watch Address',
        name: 'watchAddress',
        type: 'string',
        default: '',
        description: 'Address to watch for transfers',
        displayOptions: { show: { event: ['transferTo', 'transferFrom', 'transfer'] } },
      },
      {
        displayName: 'Minimum Amount',
        name: 'minAmount',
        type: 'number',
        default: 0,
        description: 'Minimum transfer amount to trigger',
        displayOptions: { show: { event: ['transfer', 'transferTo', 'transferFrom'] } },
      },
      {
        displayName: 'Large Transfer Threshold',
        name: 'largeTransferThreshold',
        type: 'number',
        default: 100000,
        description: 'Amount threshold for large transfer alerts',
        displayOptions: { show: { event: ['largeTransfer'] } },
      },
    ],
  };

  async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
    emitLicenseNotice();

    const event = this.getNodeParameter('event') as string;
    const credentials = await this.getCredentials('rlusdNetwork');
    const network = credentials.network as string;

    let xrplClient: XrplClient | null = null;
    let ethClient: EthereumClient | null = null;

    const startTrigger = async () => {
      if (network.startsWith('xrpl') || network === 'custom') {
        const customUrl = network === 'custom' ? (credentials.websocketUrl as string) : undefined;
        xrplClient = createXrplClient(network, customUrl);

        if (event === 'newLedger') {
          await xrplClient.subscribeLedger((ledger) => {
            this.emit([
              this.helpers.returnJsonArray([
                {
                  event: 'newLedger',
                  ledgerIndex: ledger.ledger_index,
                  ledgerHash: ledger.ledger_hash,
                  closeTime: ledger.ledger_time,
                  txnCount: ledger.txn_count,
                },
              ]),
            ]);
          });
        } else if (['transfer', 'transferTo', 'transferFrom', 'largeTransfer'].includes(event)) {
          const watchAddress = this.getNodeParameter('watchAddress', '') as string;
          const minAmount = this.getNodeParameter('minAmount', 0) as number;
          const threshold =
            event === 'largeTransfer'
              ? (this.getNodeParameter('largeTransferThreshold', 100000) as number)
              : minAmount;

          if (watchAddress) {
            await xrplClient.subscribeAccount(watchAddress, (tx) => {
              if (this.isRlusdTransaction(tx)) {
                const amount = this.extractRlusdAmount(tx);
                if (amount >= threshold) {
                  this.emit([
                    this.helpers.returnJsonArray([
                      {
                        event,
                        hash: tx.transaction.hash,
                        from: tx.transaction.Account,
                        to: tx.transaction.Destination,
                        amount: amount.toString(),
                        currency: 'RLUSD',
                        timestamp: new Date().toISOString(),
                      },
                    ]),
                  ]);
                }
              }
            });
          }
        }
      }

      if (network.startsWith('ethereum')) {
        const customUrl = network === 'custom' ? (credentials.rpcUrl as string) : undefined;
        ethClient = createEthereumClient(network, customUrl);

        if (event === 'newBlock') {
          ethClient.onBlock((blockNumber) => {
            this.emit([
              this.helpers.returnJsonArray([
                {
                  event: 'newBlock',
                  blockNumber,
                  timestamp: new Date().toISOString(),
                },
              ]),
            ]);
          });
        } else if (['transfer', 'transferTo', 'transferFrom', 'largeTransfer'].includes(event)) {
          const watchAddress = this.getNodeParameter('watchAddress', '') as string;
          const minAmount = this.getNodeParameter('minAmount', 0) as number;
          const threshold =
            event === 'largeTransfer'
              ? (this.getNodeParameter('largeTransferThreshold', 100000) as number)
              : minAmount;

          ethClient.onTransfer((from, to, value) => {
            const amount = parseFloat(value);
            const matchesAddress =
              !watchAddress ||
              (event === 'transferTo' && to.toLowerCase() === watchAddress.toLowerCase()) ||
              (event === 'transferFrom' && from.toLowerCase() === watchAddress.toLowerCase()) ||
              (event === 'transfer' &&
                (from.toLowerCase() === watchAddress.toLowerCase() ||
                  to.toLowerCase() === watchAddress.toLowerCase()));

            if (matchesAddress && amount >= threshold) {
              this.emit([
                this.helpers.returnJsonArray([
                  {
                    event,
                    from,
                    to,
                    amount: value,
                    currency: 'RLUSD',
                    timestamp: new Date().toISOString(),
                  },
                ]),
              ]);
            }
          });
        }
      }
    };

    const stopTrigger = async () => {
      if (xrplClient) {
        await xrplClient.unsubscribeAll();
        await xrplClient.disconnect();
      }
      if (ethClient) {
        ethClient.removeAllListeners();
      }
    };

    await startTrigger();
    return { closeFunction: stopTrigger };
  }

  private isRlusdTransaction(tx: any): boolean {
    if (tx.transaction.TransactionType !== 'Payment') return false;
    const amount = tx.transaction.Amount;
    return typeof amount === 'object' && amount.currency === RLUSD_CURRENCY_CODE;
  }

  private extractRlusdAmount(tx: any): number {
    const amount = tx.transaction.Amount;
    if (typeof amount === 'object' && amount.currency === RLUSD_CURRENCY_CODE) {
      return parseFloat(amount.value);
    }
    return 0;
  }
}

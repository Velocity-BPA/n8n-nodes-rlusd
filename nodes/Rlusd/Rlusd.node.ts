/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { XrplClient, createXrplClient } from './transport/xrplClient';
import { EthereumClient, createEthereumClient, isValidEthereumAddress } from './transport/ethereumClient';
import { RippleApiClient, createRippleApiClient } from './transport/rippleApi';
import { RLUSD_CURRENCY_CODE, XRPL_RLUSD_ISSUERS } from './constants/issuer';
import { RLUSD_CONTRACT_ADDRESSES } from './constants/contracts';
import { dropsToXrp, xrpToDrops, formatRlusdAmount } from './utils/amountUtils';

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

export class Rlusd implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'RLUSD',
    name: 'rlusd',
    icon: 'file:rlusd.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with Ripple RLUSD stablecoin on XRPL and Ethereum',
    defaults: { name: 'RLUSD' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      { name: 'rlusdNetwork', required: true },
      { name: 'rippleApi', required: false },
      { name: 'custody', required: false },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        default: 'rlusd',
        options: [
          { name: 'RLUSD', value: 'rlusd', description: 'Multi-chain RLUSD operations' },
          { name: 'XRPL', value: 'xrpl', description: 'XRPL-specific operations' },
          { name: 'Ethereum', value: 'ethereum', description: 'Ethereum ERC-20 operations' },
          { name: 'Trustline', value: 'trustline', description: 'XRPL trustline management' },
          { name: 'DEX', value: 'dex', description: 'XRPL DEX trading' },
          { name: 'Payment', value: 'payment', description: 'Payment operations' },
          { name: 'Compliance', value: 'compliance', description: 'Compliance operations' },
          { name: 'Attestation', value: 'attestation', description: 'Reserve attestation' },
          { name: 'Issuer', value: 'issuer', description: 'Issuer information' },
          { name: 'Cross-Chain', value: 'crossChain', description: 'Cross-chain bridging' },
          { name: 'AMM', value: 'amm', description: 'XRPL AMM operations' },
          { name: 'Account', value: 'account', description: 'Account information' },
          { name: 'Transaction', value: 'transaction', description: 'Transaction operations' },
          { name: 'Analytics', value: 'analytics', description: 'Analytics and reporting' },
          { name: 'Utility', value: 'utility', description: 'Utility functions' },
        ],
      },
      // RLUSD Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['rlusd'] } },
        default: 'getBalanceXrpl',
        options: [
          { name: 'Get Balance (XRPL)', value: 'getBalanceXrpl', action: 'Get RLUSD balance on XRPL' },
          { name: 'Get Balance (Ethereum)', value: 'getBalanceEthereum', action: 'Get RLUSD balance on Ethereum' },
          { name: 'Transfer', value: 'transfer', action: 'Transfer RLUSD' },
          { name: 'Get Total Supply', value: 'getTotalSupply', action: 'Get total RLUSD supply' },
          { name: 'Get Price', value: 'getPrice', action: 'Get RLUSD price' },
          { name: 'Get Market Data', value: 'getMarketData', action: 'Get market data' },
        ],
      },
      // XRPL Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['xrpl'] } },
        default: 'getBalance',
        options: [
          { name: 'Get Balance', value: 'getBalance', action: 'Get RLUSD balance' },
          { name: 'Get Trustline Info', value: 'getTrustlineInfo', action: 'Get trustline info' },
          { name: 'Transfer', value: 'transfer', action: 'Transfer RLUSD' },
          { name: 'Get Order Book', value: 'getOrderBook', action: 'Get order book' },
          { name: 'Get Account Info', value: 'getAccountInfo', action: 'Get account info' },
        ],
      },
      // Ethereum Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['ethereum'] } },
        default: 'getBalance',
        options: [
          { name: 'Get Balance', value: 'getBalance', action: 'Get balance' },
          { name: 'Transfer', value: 'transfer', action: 'Transfer RLUSD' },
          { name: 'Approve', value: 'approve', action: 'Approve spending' },
          { name: 'Get Allowance', value: 'getAllowance', action: 'Get allowance' },
          { name: 'Transfer From', value: 'transferFrom', action: 'Transfer from' },
          { name: 'Get Contract Info', value: 'getContractInfo', action: 'Get contract info' },
          { name: 'Estimate Gas', value: 'estimateGas', action: 'Estimate gas' },
        ],
      },
      // Trustline Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['trustline'] } },
        default: 'getInfo',
        options: [
          { name: 'Get Info', value: 'getInfo', action: 'Get trustline info' },
          { name: 'Set Trustline', value: 'set', action: 'Set trustline' },
          { name: 'Modify Limit', value: 'modifyLimit', action: 'Modify limit' },
          { name: 'Remove', value: 'remove', action: 'Remove trustline' },
        ],
      },
      // DEX Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['dex'] } },
        default: 'getOrderBook',
        options: [
          { name: 'Get Order Book', value: 'getOrderBook', action: 'Get order book' },
          { name: 'Get Best Bid/Ask', value: 'getBestBidAsk', action: 'Get best bid ask' },
          { name: 'Place Limit Order', value: 'placeLimitOrder', action: 'Place limit order' },
          { name: 'Cancel Order', value: 'cancelOrder', action: 'Cancel order' },
          { name: 'Get Open Orders', value: 'getOpenOrders', action: 'Get open orders' },
        ],
      },
      // Payment Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['payment'] } },
        default: 'send',
        options: [
          { name: 'Send Payment', value: 'send', action: 'Send payment' },
          { name: 'Get Status', value: 'getStatus', action: 'Get payment status' },
        ],
      },
      // Compliance Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['compliance'] } },
        default: 'checkAddress',
        options: [
          { name: 'Check Address', value: 'checkAddress', action: 'Check address' },
          { name: 'Get KYC Status', value: 'getKycStatus', action: 'Get KYC status' },
          { name: 'Check Sanctions', value: 'checkSanctions', action: 'Check sanctions' },
          { name: 'Get Authorized Institutions', value: 'getAuthorizedInstitutions', action: 'Get institutions' },
        ],
      },
      // Attestation Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['attestation'] } },
        default: 'getLatest',
        options: [
          { name: 'Get Latest', value: 'getLatest', action: 'Get latest attestation' },
          { name: 'Get Historical', value: 'getHistorical', action: 'Get historical' },
          { name: 'Verify', value: 'verify', action: 'Verify attestation' },
        ],
      },
      // Issuer Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['issuer'] } },
        default: 'getInfo',
        options: [
          { name: 'Get Info', value: 'getInfo', action: 'Get issuer info' },
          { name: 'Get XRPL Address', value: 'getXrplAddress', action: 'Get XRPL address' },
          { name: 'Get Ethereum Contract', value: 'getEthereumContract', action: 'Get contract' },
        ],
      },
      // Cross-Chain Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['crossChain'] } },
        default: 'getStatus',
        options: [
          { name: 'Get Bridge Status', value: 'getStatus', action: 'Get bridge status' },
          { name: 'Get Supported Chains', value: 'getSupportedChains', action: 'Get chains' },
        ],
      },
      // AMM Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['amm'] } },
        default: 'getInfo',
        options: [
          { name: 'Get AMM Info', value: 'getInfo', action: 'Get AMM info' },
          { name: 'Get Pool Balance', value: 'getPoolBalance', action: 'Get pool balance' },
        ],
      },
      // Account Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['account'] } },
        default: 'getInfo',
        options: [
          { name: 'Get Info', value: 'getInfo', action: 'Get account info' },
          { name: 'Get Balance', value: 'getBalance', action: 'Get balance' },
          { name: 'Get Transactions', value: 'getTransactions', action: 'Get transactions' },
        ],
      },
      // Transaction Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['transaction'] } },
        default: 'get',
        options: [
          { name: 'Get Transaction', value: 'get', action: 'Get transaction' },
          { name: 'Get Status', value: 'getStatus', action: 'Get status' },
          { name: 'Get Fee Estimate', value: 'getFee', action: 'Get fee estimate' },
        ],
      },
      // Analytics Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['analytics'] } },
        default: 'getVolume',
        options: [
          { name: 'Get Volume', value: 'getVolume', action: 'Get volume' },
          { name: 'Get Market Data', value: 'getMarketData', action: 'Get market data' },
        ],
      },
      // Utility Operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['utility'] } },
        default: 'convertDropsToXrp',
        options: [
          { name: 'Convert Drops to XRP', value: 'convertDropsToXrp', action: 'Convert drops to XRP' },
          { name: 'Convert XRP to Drops', value: 'convertXrpToDrops', action: 'Convert XRP to drops' },
          { name: 'Format RLUSD Amount', value: 'formatAmount', action: 'Format amount' },
          { name: 'Validate XRPL Address', value: 'validateXrplAddress', action: 'Validate XRPL address' },
          { name: 'Validate ETH Address', value: 'validateEthAddress', action: 'Validate ETH address' },
          { name: 'Get Network Status', value: 'getNetworkStatus', action: 'Get network status' },
        ],
      },
      // Common Parameters
      {
        displayName: 'Address',
        name: 'address',
        type: 'string',
        default: '',
        required: true,
        description: 'The wallet address',
        displayOptions: {
          show: {
            resource: ['rlusd', 'xrpl', 'ethereum', 'trustline', 'compliance', 'account'],
            operation: ['getBalanceXrpl', 'getBalanceEthereum', 'getBalance', 'getTrustlineInfo', 'getInfo', 'checkAddress', 'getKycStatus', 'checkSanctions', 'getAllowance', 'getTransactions'],
          },
        },
      },
      {
        displayName: 'Destination Address',
        name: 'destination',
        type: 'string',
        default: '',
        required: true,
        description: 'Destination wallet address',
        displayOptions: { show: { operation: ['transfer', 'send'] } },
      },
      {
        displayName: 'Amount',
        name: 'amount',
        type: 'string',
        default: '',
        required: true,
        description: 'Amount to transfer',
        displayOptions: { show: { operation: ['transfer', 'send', 'approve', 'transferFrom', 'estimateGas', 'placeLimitOrder'] } },
      },
      {
        displayName: 'Spender Address',
        name: 'spender',
        type: 'string',
        default: '',
        required: true,
        description: 'Spender address to approve',
        displayOptions: { show: { operation: ['approve', 'getAllowance'] } },
      },
      {
        displayName: 'Owner Address',
        name: 'owner',
        type: 'string',
        default: '',
        required: true,
        description: 'Owner address',
        displayOptions: { show: { operation: ['getAllowance', 'transferFrom'] } },
      },
      {
        displayName: 'From Address',
        name: 'fromAddress',
        type: 'string',
        default: '',
        required: true,
        description: 'Address to transfer from',
        displayOptions: { show: { operation: ['transferFrom'] } },
      },
      {
        displayName: 'To Address',
        name: 'toAddress',
        type: 'string',
        default: '',
        required: true,
        description: 'Address to transfer to',
        displayOptions: { show: { operation: ['transferFrom', 'estimateGas'] } },
      },
      {
        displayName: 'Trustline Limit',
        name: 'trustlineLimit',
        type: 'string',
        default: '1000000000',
        required: true,
        description: 'Maximum RLUSD to trust',
        displayOptions: { show: { operation: ['set', 'modifyLimit'] } },
      },
      {
        displayName: 'Transaction Hash',
        name: 'transactionHash',
        type: 'string',
        default: '',
        required: true,
        description: 'Transaction hash',
        displayOptions: { show: { operation: ['get', 'getStatus'] } },
      },
      {
        displayName: 'Offer Sequence',
        name: 'offerSequence',
        type: 'number',
        default: 0,
        required: true,
        description: 'Offer sequence to cancel',
        displayOptions: { show: { operation: ['cancelOrder'] } },
      },
      {
        displayName: 'Attestation ID',
        name: 'attestationId',
        type: 'string',
        default: '',
        required: true,
        description: 'Attestation ID to verify',
        displayOptions: { show: { operation: ['verify'] } },
      },
      {
        displayName: 'Drops Amount',
        name: 'dropsAmount',
        type: 'string',
        default: '',
        required: true,
        description: 'Amount in drops',
        displayOptions: { show: { operation: ['convertDropsToXrp'] } },
      },
      {
        displayName: 'XRP Amount',
        name: 'xrpAmount',
        type: 'string',
        default: '',
        required: true,
        description: 'Amount in XRP',
        displayOptions: { show: { operation: ['convertXrpToDrops'] } },
      },
      {
        displayName: 'Format Amount',
        name: 'formatAmount',
        type: 'string',
        default: '',
        required: true,
        description: 'Amount to format',
        displayOptions: { show: { operation: ['formatAmount'] } },
      },
      {
        displayName: 'Validate Address',
        name: 'validateAddress',
        type: 'string',
        default: '',
        required: true,
        description: 'Address to validate',
        displayOptions: { show: { operation: ['validateXrplAddress', 'validateEthAddress'] } },
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 20,
        description: 'Max results',
        displayOptions: { show: { operation: ['getOrderBook', 'getOpenOrders', 'getHistorical', 'getTransactions'] } },
      },
      {
        displayName: 'Chain',
        name: 'chain',
        type: 'options',
        options: [
          { name: 'XRPL', value: 'xrpl' },
          { name: 'Ethereum', value: 'ethereum' },
        ],
        default: 'xrpl',
        description: 'Blockchain to use',
        displayOptions: { show: { resource: ['rlusd'], operation: ['transfer'] } },
      },
      {
        displayName: 'Order Side',
        name: 'orderSide',
        type: 'options',
        options: [
          { name: 'Buy RLUSD', value: 'buy' },
          { name: 'Sell RLUSD', value: 'sell' },
        ],
        default: 'buy',
        description: 'Buy or sell RLUSD',
        displayOptions: { show: { operation: ['placeLimitOrder'] } },
      },
      {
        displayName: 'Price (XRP per RLUSD)',
        name: 'price',
        type: 'string',
        default: '',
        required: true,
        description: 'Price in XRP per RLUSD',
        displayOptions: { show: { operation: ['placeLimitOrder'] } },
      },
      {
        displayName: 'Destination Tag',
        name: 'destinationTag',
        type: 'number',
        default: 0,
        description: 'Optional destination tag',
        displayOptions: { show: { resource: ['xrpl', 'payment', 'rlusd'], operation: ['transfer', 'send'] } },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    emitLicenseNotice();
    
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;
    const credentials = await this.getCredentials('rlusdNetwork');
    const network = credentials.network as string;

    let xrplClient: XrplClient | null = null;
    let ethClient: EthereumClient | null = null;
    let rippleApi: RippleApiClient | null = null;

    try {
      // Initialize clients
      if (network.startsWith('xrpl') || network === 'custom') {
        const customUrl = network === 'custom' ? (credentials.websocketUrl as string) : undefined;
        xrplClient = createXrplClient(network, customUrl);
        if (credentials.walletSeed || credentials.walletSeedCustom) {
          xrplClient.setWallet((credentials.walletSeed || credentials.walletSeedCustom) as string);
        }
      }
      if (network.startsWith('ethereum')) {
        const customUrl = network === 'custom' ? (credentials.rpcUrl as string) : undefined;
        ethClient = createEthereumClient(network, customUrl);
        if (credentials.privateKey || credentials.privateKeyCustom) {
          ethClient.setWallet((credentials.privateKey || credentials.privateKeyCustom) as string);
        }
      }
      try {
        const rippleCreds = await this.getCredentials('rippleApi');
        if (rippleCreds) {
          rippleApi = createRippleApiClient({
            baseUrl: rippleCreds.apiEndpoint as string,
            apiKey: rippleCreds.apiKey as string,
          });
        }
      } catch {
        rippleApi = createRippleApiClient();
      }

      for (let i = 0; i < items.length; i++) {
        try {
          let result: IDataObject = {};

          // RLUSD Resource
          if (resource === 'rlusd') {
            if (operation === 'getBalanceXrpl' && xrplClient) {
              const address = this.getNodeParameter('address', i) as string;
              result = { address, balance: await xrplClient.getRlusdBalance(address), currency: 'RLUSD', chain: 'xrpl' };
            } else if (operation === 'getBalanceEthereum' && ethClient) {
              const address = this.getNodeParameter('address', i) as string;
              result = { address, balance: await ethClient.getBalance(address), currency: 'RLUSD', chain: 'ethereum' };
            } else if (operation === 'transfer') {
              const chain = this.getNodeParameter('chain', i) as string;
              const dest = this.getNodeParameter('destination', i) as string;
              const amt = this.getNodeParameter('amount', i) as string;
              if (chain === 'xrpl' && xrplClient) {
                const tag = this.getNodeParameter('destinationTag', i, 0) as number;
                result = { ...(await xrplClient.sendRlusd(dest, amt, { destinationTag: tag || undefined })), chain: 'xrpl' };
              } else if (chain === 'ethereum' && ethClient) {
                result = { ...(await ethClient.transfer(dest, amt)), chain: 'ethereum' };
              }
            } else if (operation === 'getTotalSupply' && rippleApi) {
              result = await rippleApi.getTotalSupply();
            } else if (operation === 'getPrice' && rippleApi) {
              result = await rippleApi.getPrice();
            } else if (operation === 'getMarketData' && rippleApi) {
              result = await rippleApi.getMarketData();
            }
          }
          // XRPL Resource
          else if (resource === 'xrpl' && xrplClient) {
            if (operation === 'getBalance') {
              const address = this.getNodeParameter('address', i) as string;
              result = { address, balance: await xrplClient.getRlusdBalance(address), currency: 'RLUSD' };
            } else if (operation === 'getTrustlineInfo') {
              const address = this.getNodeParameter('address', i) as string;
              const resp = await xrplClient.getAccountLines(address, xrplClient.getIssuerAddress());
              result = { address, trustlines: resp.result.lines };
            } else if (operation === 'transfer') {
              const dest = this.getNodeParameter('destination', i) as string;
              const amt = this.getNodeParameter('amount', i) as string;
              const tag = this.getNodeParameter('destinationTag', i, 0) as number;
              result = await xrplClient.sendRlusd(dest, amt, { destinationTag: tag || undefined });
            } else if (operation === 'getOrderBook') {
              const limit = this.getNodeParameter('limit', i, 20) as number;
              result = await xrplClient.getRlusdXrpOrderBook(limit);
            } else if (operation === 'getAccountInfo') {
              const address = this.getNodeParameter('address', i) as string;
              const resp = await xrplClient.getAccountInfo(address);
              result = resp.result.account_data;
            }
          }
          // Ethereum Resource
          else if (resource === 'ethereum' && ethClient) {
            if (operation === 'getBalance') {
              const address = this.getNodeParameter('address', i) as string;
              result = { address, balance: await ethClient.getBalance(address), currency: 'RLUSD' };
            } else if (operation === 'transfer') {
              const dest = this.getNodeParameter('destination', i) as string;
              const amt = this.getNodeParameter('amount', i) as string;
              result = await ethClient.transfer(dest, amt);
            } else if (operation === 'approve') {
              const spender = this.getNodeParameter('spender', i) as string;
              const amt = this.getNodeParameter('amount', i) as string;
              result = await ethClient.approve(spender, amt);
            } else if (operation === 'getAllowance') {
              const owner = this.getNodeParameter('owner', i) as string;
              const spender = this.getNodeParameter('spender', i) as string;
              result = { owner, spender, allowance: await ethClient.getAllowance(owner, spender) };
            } else if (operation === 'transferFrom') {
              const from = this.getNodeParameter('fromAddress', i) as string;
              const to = this.getNodeParameter('toAddress', i) as string;
              const amt = this.getNodeParameter('amount', i) as string;
              result = await ethClient.transferFrom(from, to, amt);
            } else if (operation === 'getContractInfo') {
              result = await ethClient.getContractInfo();
            } else if (operation === 'estimateGas') {
              const to = this.getNodeParameter('toAddress', i) as string;
              const amt = this.getNodeParameter('amount', i) as string;
              const gas = await ethClient.estimateTransferGas(to, amt);
              const gasPrice = await ethClient.getGasPrice();
              result = { estimatedGas: gas, ...gasPrice };
            }
          }
          // Trustline Resource
          else if (resource === 'trustline' && xrplClient) {
            if (operation === 'getInfo') {
              const address = this.getNodeParameter('address', i) as string;
              const resp = await xrplClient.getAccountLines(address, xrplClient.getIssuerAddress());
              const line = resp.result.lines.find((l: any) => l.currency === RLUSD_CURRENCY_CODE);
              result = line || { error: 'No RLUSD trustline found' };
            } else if (operation === 'set') {
              const limit = this.getNodeParameter('trustlineLimit', i) as string;
              result = await xrplClient.setTrustline(limit, { noRipple: true });
            } else if (operation === 'modifyLimit') {
              const limit = this.getNodeParameter('trustlineLimit', i) as string;
              result = await xrplClient.setTrustline(limit);
            } else if (operation === 'remove') {
              result = await xrplClient.setTrustline('0');
            }
          }
          // DEX Resource
          else if (resource === 'dex' && xrplClient) {
            if (operation === 'getOrderBook') {
              const limit = this.getNodeParameter('limit', i, 20) as number;
              result = await xrplClient.getRlusdXrpOrderBook(limit);
            } else if (operation === 'getBestBidAsk') {
              const ob = await xrplClient.getRlusdXrpOrderBook(1);
              result = { bestBid: ob.bids[0] || null, bestAsk: ob.asks[0] || null };
            } else if (operation === 'placeLimitOrder') {
              const side = this.getNodeParameter('orderSide', i) as string;
              const amt = this.getNodeParameter('amount', i) as string;
              const price = this.getNodeParameter('price', i) as string;
              const issuer = xrplClient.getIssuerAddress();
              let takerGets: any, takerPays: any;
              if (side === 'buy') {
                takerGets = { currency: RLUSD_CURRENCY_CODE, issuer, value: amt };
                takerPays = xrpToDrops((parseFloat(amt) * parseFloat(price)).toString());
              } else {
                takerGets = xrpToDrops((parseFloat(amt) * parseFloat(price)).toString());
                takerPays = { currency: RLUSD_CURRENCY_CODE, issuer, value: amt };
              }
              result = await xrplClient.placeOrder(takerGets, takerPays);
            } else if (operation === 'cancelOrder') {
              const seq = this.getNodeParameter('offerSequence', i) as number;
              result = await xrplClient.cancelOrder(seq);
            } else if (operation === 'getOpenOrders') {
              const addr = xrplClient.getWalletAddress();
              if (addr) {
                const resp = await xrplClient.getAccountOffers(addr);
                result = { offers: resp.result.offers };
              }
            }
          }
          // Payment Resource
          else if (resource === 'payment') {
            if (operation === 'send') {
              const dest = this.getNodeParameter('destination', i) as string;
              const amt = this.getNodeParameter('amount', i) as string;
              if (xrplClient) {
                const tag = this.getNodeParameter('destinationTag', i, 0) as number;
                result = await xrplClient.sendRlusd(dest, amt, { destinationTag: tag || undefined });
              } else if (ethClient) {
                result = await ethClient.transfer(dest, amt);
              }
            } else if (operation === 'getStatus') {
              const hash = this.getNodeParameter('transactionHash', i) as string;
              if (xrplClient) {
                const resp = await xrplClient.getTransaction(hash);
                result = resp.result;
              } else if (ethClient) {
                const receipt = await ethClient.getTransactionReceipt(hash);
                result = (receipt as any) || { error: 'Transaction not found' };
              }
            }
          }
          // Compliance Resource
          else if (resource === 'compliance' && rippleApi) {
            if (operation === 'checkAddress') {
              const addr = this.getNodeParameter('address', i) as string;
              const chain = network.startsWith('xrpl') ? 'xrpl' : 'ethereum';
              result = await rippleApi.checkCompliance(addr, chain as 'xrpl' | 'ethereum');
            } else if (operation === 'getKycStatus') {
              const addr = this.getNodeParameter('address', i) as string;
              result = await rippleApi.getKycStatus(addr);
            } else if (operation === 'checkSanctions') {
              const addr = this.getNodeParameter('address', i) as string;
              result = await rippleApi.checkSanctions(addr);
            } else if (operation === 'getAuthorizedInstitutions') {
              result = { institutions: await rippleApi.getAuthorizedInstitutions() };
            }
          }
          // Attestation Resource
          else if (resource === 'attestation' && rippleApi) {
            if (operation === 'getLatest') {
              result = await rippleApi.getLatestAttestation();
            } else if (operation === 'getHistorical') {
              const limit = this.getNodeParameter('limit', i, 10) as number;
              result = { attestations: await rippleApi.getHistoricalAttestations(limit) };
            } else if (operation === 'verify') {
              const id = this.getNodeParameter('attestationId', i) as string;
              result = await rippleApi.verifyAttestation(id);
            }
          }
          // Issuer Resource
          else if (resource === 'issuer') {
            if (operation === 'getInfo' && rippleApi) {
              result = await rippleApi.getIssuerInfo();
            } else if (operation === 'getXrplAddress') {
              const key = network.replace('xrpl_', '') as keyof typeof XRPL_RLUSD_ISSUERS;
              result = { address: XRPL_RLUSD_ISSUERS[key]?.address || XRPL_RLUSD_ISSUERS.mainnet.address, network: key };
            } else if (operation === 'getEthereumContract') {
              const key = network.replace('ethereum_', '');
              result = { address: RLUSD_CONTRACT_ADDRESSES[key] || RLUSD_CONTRACT_ADDRESSES.mainnet, network: key };
            }
          }
          // Cross-Chain Resource
          else if (resource === 'crossChain' && rippleApi) {
            if (operation === 'getStatus') {
              result = await rippleApi.getBridgeStatus();
            } else if (operation === 'getSupportedChains') {
              result = { chains: ['xrpl', 'ethereum'], status: 'operational' };
            }
          }
          // AMM Resource
          else if (resource === 'amm' && xrplClient) {
            if (operation === 'getInfo' || operation === 'getPoolBalance') {
              result = await xrplClient.getRlusdXrpAmmInfo();
            }
          }
          // Account Resource
          else if (resource === 'account') {
            const addr = this.getNodeParameter('address', i) as string;
            if (operation === 'getInfo' && xrplClient) {
              const resp = await xrplClient.getAccountInfo(addr);
              result = resp.result.account_data;
            } else if (operation === 'getBalance') {
              if (xrplClient) {
                const rlusd = await xrplClient.getRlusdBalance(addr);
                const info = await xrplClient.getAccountInfo(addr);
                result = { address: addr, xrpBalance: dropsToXrp(info.result.account_data.Balance), rlusdBalance: rlusd };
              } else if (ethClient) {
                result = { address: addr, ethBalance: await ethClient.getEthBalance(addr), rlusdBalance: await ethClient.getBalance(addr) };
              }
            } else if (operation === 'getTransactions' && xrplClient) {
              const limit = this.getNodeParameter('limit', i, 20) as number;
              const resp = await xrplClient.getAccountTransactions(addr, limit);
              result = { transactions: resp.result.transactions };
            }
          }
          // Transaction Resource
          else if (resource === 'transaction') {
            const hash = this.getNodeParameter('transactionHash', i) as string;
            if (operation === 'get') {
              if (xrplClient) {
                const resp = await xrplClient.getTransaction(hash);
                result = resp.result;
              } else if (ethClient) {
                result = (await ethClient.getTransaction(hash) as any) || { error: 'Not found' };
              }
            } else if (operation === 'getStatus') {
              if (xrplClient) {
                const resp = await xrplClient.getTransaction(hash);
                result = { hash, validated: resp.result.validated, result: (resp.result.meta as any)?.TransactionResult };
              } else if (ethClient) {
                const rcpt = await ethClient.getTransactionReceipt(hash);
                result = { hash, status: rcpt?.status === 1 ? 'success' : 'failed', blockNumber: rcpt?.blockNumber };
              }
            } else if (operation === 'getFee' && xrplClient) {
              result = await xrplClient.getFeeEstimate();
            }
          }
          // Analytics Resource
          else if (resource === 'analytics' && rippleApi) {
            result = await rippleApi.getMarketData();
          }
          // Utility Resource
          else if (resource === 'utility') {
            if (operation === 'convertDropsToXrp') {
              const drops = this.getNodeParameter('dropsAmount', i) as string;
              result = { drops, xrp: dropsToXrp(drops) };
            } else if (operation === 'convertXrpToDrops') {
              const xrp = this.getNodeParameter('xrpAmount', i) as string;
              result = { xrp, drops: xrpToDrops(xrp) };
            } else if (operation === 'formatAmount') {
              const amt = this.getNodeParameter('formatAmount', i) as string;
              result = { raw: amt, formatted: formatRlusdAmount(amt) };
            } else if (operation === 'validateXrplAddress') {
              const addr = this.getNodeParameter('validateAddress', i) as string;
              result = { address: addr, valid: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(addr) };
            } else if (operation === 'validateEthAddress') {
              const addr = this.getNodeParameter('validateAddress', i) as string;
              result = { address: addr, valid: isValidEthereumAddress(addr) };
            } else if (operation === 'getNetworkStatus' && xrplClient) {
              const info = await xrplClient.getServerInfo();
              result = { connected: true, serverState: info.result.info.server_state, validatedLedger: info.result.info.validated_ledger?.seq };
            }
          }

          returnData.push({ json: result });
        } catch (error) {
          if (this.continueOnFail()) {
            returnData.push({ json: { error: (error as Error).message } });
            continue;
          }
          throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
        }
      }

      if (xrplClient) await xrplClient.disconnect();
    } catch (error) {
      if (xrplClient) await xrplClient.disconnect();
      throw error;
    }

    return [returnData];
  }
}

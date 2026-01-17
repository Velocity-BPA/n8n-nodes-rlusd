/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
  ICredentialType,
  INodeProperties,
  ICredentialTestRequest,
} from 'n8n-workflow';

export class RlusdNetwork implements ICredentialType {
  name = 'rlusdNetwork';
  displayName = 'RLUSD Network';
  documentationUrl = 'https://github.com/Velocity-BPA/n8n-nodes-rlusd';

  properties: INodeProperties[] = [
    {
      displayName: 'Network',
      name: 'network',
      type: 'options',
      default: 'xrpl_mainnet',
      options: [
        { name: 'XRP Ledger Mainnet', value: 'xrpl_mainnet' },
        { name: 'XRP Ledger Testnet', value: 'xrpl_testnet' },
        { name: 'XRP Ledger Devnet', value: 'xrpl_devnet' },
        { name: 'Ethereum Mainnet', value: 'ethereum_mainnet' },
        { name: 'Ethereum Sepolia (Testnet)', value: 'ethereum_sepolia' },
        { name: 'Custom Endpoint', value: 'custom' },
      ],
      description: 'The network to connect to',
    },
    {
      displayName: 'Network Type',
      name: 'networkType',
      type: 'options',
      default: 'xrpl',
      options: [
        { name: 'XRP Ledger', value: 'xrpl' },
        { name: 'Ethereum', value: 'ethereum' },
      ],
      description: 'The type of blockchain network',
      displayOptions: { show: { network: ['custom'] } },
    },
    {
      displayName: 'WebSocket URL (XRPL)',
      name: 'websocketUrl',
      type: 'string',
      default: '',
      placeholder: 'wss://s1.ripple.com',
      description: 'WebSocket URL for XRPL connection',
      displayOptions: { show: { network: ['custom'], networkType: ['xrpl'] } },
    },
    {
      displayName: 'RPC URL (Ethereum)',
      name: 'rpcUrl',
      type: 'string',
      default: '',
      placeholder: 'https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY',
      description: 'RPC URL for Ethereum connection',
      displayOptions: { show: { network: ['custom'], networkType: ['ethereum'] } },
    },
    {
      displayName: 'Wallet Seed (XRPL)',
      name: 'walletSeed',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'XRPL wallet seed (sXXXXXX format). Keep this secret!',
      displayOptions: {
        show: { network: ['xrpl_mainnet', 'xrpl_testnet', 'xrpl_devnet'] },
      },
    },
    {
      displayName: 'Wallet Seed (XRPL Custom)',
      name: 'walletSeedCustom',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'XRPL wallet seed (sXXXXXX format). Keep this secret!',
      displayOptions: { show: { network: ['custom'], networkType: ['xrpl'] } },
    },
    {
      displayName: 'Private Key (Ethereum)',
      name: 'privateKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'Ethereum private key (0x... format). Keep this secret!',
      displayOptions: { show: { network: ['ethereum_mainnet', 'ethereum_sepolia'] } },
    },
    {
      displayName: 'Private Key (Ethereum Custom)',
      name: 'privateKeyCustom',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'Ethereum private key (0x... format). Keep this secret!',
      displayOptions: { show: { network: ['custom'], networkType: ['ethereum'] } },
    },
    {
      displayName: 'Custom Issuer Address',
      name: 'issuerAddress',
      type: 'string',
      default: '',
      description: 'Override the default RLUSD issuer address (advanced)',
    },
  ];

  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://xrplcluster.com',
      method: 'POST',
      body: JSON.stringify({ method: 'server_info', params: [{}] }),
      headers: { 'Content-Type': 'application/json' },
    },
  };
}

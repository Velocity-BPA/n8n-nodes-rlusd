/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * RLUSD Network Configuration Constants
 */

export interface XrplNetworkConfig {
  name: string;
  websocketUrl: string;
  explorerUrl: string;
  isMainnet: boolean;
  networkId: number;
}

export interface EthereumNetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  explorerUrl: string;
  isMainnet: boolean;
}

export const XRPL_NETWORKS: Record<string, XrplNetworkConfig> = {
  mainnet: {
    name: 'XRP Ledger Mainnet',
    websocketUrl: 'wss://xrplcluster.com',
    explorerUrl: 'https://livenet.xrpl.org',
    isMainnet: true,
    networkId: 0,
  },
  testnet: {
    name: 'XRP Ledger Testnet',
    websocketUrl: 'wss://s.altnet.rippletest.net:51233',
    explorerUrl: 'https://testnet.xrpl.org',
    isMainnet: false,
    networkId: 1,
  },
  devnet: {
    name: 'XRP Ledger Devnet',
    websocketUrl: 'wss://s.devnet.rippletest.net:51233',
    explorerUrl: 'https://devnet.xrpl.org',
    isMainnet: false,
    networkId: 2,
  },
};

export const ETHEREUM_NETWORKS: Record<string, EthereumNetworkConfig> = {
  mainnet: {
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth.llamarpc.com',
    chainId: 1,
    explorerUrl: 'https://etherscan.io',
    isMainnet: true,
  },
  sepolia: {
    name: 'Ethereum Sepolia (Testnet)',
    rpcUrl: 'https://rpc.sepolia.org',
    chainId: 11155111,
    explorerUrl: 'https://sepolia.etherscan.io',
    isMainnet: false,
  },
};

export enum NetworkType {
  XRPL = 'xrpl',
  ETHEREUM = 'ethereum',
}

export const NETWORK_OPTIONS = [
  { name: 'XRP Ledger Mainnet', value: 'xrpl_mainnet' },
  { name: 'XRP Ledger Testnet', value: 'xrpl_testnet' },
  { name: 'XRP Ledger Devnet', value: 'xrpl_devnet' },
  { name: 'Ethereum Mainnet', value: 'ethereum_mainnet' },
  { name: 'Ethereum Sepolia (Testnet)', value: 'ethereum_sepolia' },
  { name: 'Custom Endpoint', value: 'custom' },
];

export function getNetworkConfig(networkKey: string): XrplNetworkConfig | EthereumNetworkConfig | null {
  if (networkKey.startsWith('xrpl_')) {
    return XRPL_NETWORKS[networkKey.replace('xrpl_', '')] || null;
  }
  if (networkKey.startsWith('ethereum_')) {
    return ETHEREUM_NETWORKS[networkKey.replace('ethereum_', '')] || null;
  }
  return null;
}

export function getNetworkType(networkKey: string): NetworkType | null {
  if (networkKey.startsWith('xrpl_') || networkKey === 'custom_xrpl') return NetworkType.XRPL;
  if (networkKey.startsWith('ethereum_') || networkKey === 'custom_ethereum') return NetworkType.ETHEREUM;
  return null;
}

export const WS_CONNECTION_TIMEOUT = 15000;
export const RPC_TIMEOUT = 30000;

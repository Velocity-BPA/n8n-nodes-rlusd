/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * RLUSD Smart Contract Configuration
 */

export const RLUSD_CONTRACT_ADDRESSES: Record<string, string> = {
  mainnet: '0x8292Bb45bf1Ee4d140127049757C0C6824e3F0B2',
  sepolia: '0x1234567890abcdef1234567890abcdef12345678',
};

export const BRIDGE_CONTRACT_ADDRESSES: Record<string, string> = {
  mainnet: '0xBridgeContractMainnet',
  sepolia: '0xBridgeContractSepolia',
};

export const RLUSD_ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
  'function nonces(address owner) view returns (uint256)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
  'function isBlacklisted(address account) view returns (bool)',
  'function paused() view returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

export function getRlusdContractAddress(network: string): string | null {
  return RLUSD_CONTRACT_ADDRESSES[network] || null;
}

export const GAS_LIMITS = {
  transfer: 65000,
  approve: 50000,
  transferFrom: 80000,
  permit: 100000,
};

export const PERMIT_DOMAIN_NAME = 'RLUSD';
export const PERMIT_DOMAIN_VERSION = '1';

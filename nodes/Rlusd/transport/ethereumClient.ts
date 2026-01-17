/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Ethereum Client Transport
 */

import {
  JsonRpcProvider,
  Wallet,
  Contract,
  parseUnits,
  formatUnits,
  TransactionReceipt,
  TransactionResponse,
  Block,
  EventLog,
} from 'ethers';
import { ETHEREUM_NETWORKS } from '../constants/networks';
import {
  RLUSD_CONTRACT_ADDRESSES,
  RLUSD_ERC20_ABI,
  GAS_LIMITS,
  PERMIT_DOMAIN_NAME,
  PERMIT_DOMAIN_VERSION,
} from '../constants/contracts';

export interface EthereumClientConfig {
  network: 'mainnet' | 'sepolia' | 'custom';
  customRpcUrl?: string;
}

export interface EthereumTransactionResult {
  success: boolean;
  hash: string;
  blockNumber?: number;
  blockHash?: string;
  gasUsed: string;
  effectiveGasPrice: string;
  status: number;
  from: string;
  to: string;
}

export interface TransferEvent {
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

export class EthereumClient {
  private provider: JsonRpcProvider;
  private wallet: Wallet | null = null;
  private contract: Contract | null = null;
  private config: EthereumClientConfig;
  private contractAddress: string;

  constructor(config: EthereumClientConfig) {
    this.config = config;
    this.provider = new JsonRpcProvider(this.getRpcUrl());
    this.contractAddress =
      RLUSD_CONTRACT_ADDRESSES[config.network] || RLUSD_CONTRACT_ADDRESSES.mainnet;
  }

  private getRpcUrl(): string {
    if (this.config.network === 'custom' && this.config.customRpcUrl)
      return this.config.customRpcUrl;
    return ETHEREUM_NETWORKS[this.config.network]?.rpcUrl || ETHEREUM_NETWORKS.mainnet.rpcUrl;
  }

  getChainId(): number {
    return ETHEREUM_NETWORKS[this.config.network]?.chainId || 1;
  }

  setWallet(privateKey: string): void {
    this.wallet = new Wallet(privateKey, this.provider);
    this.contract = new Contract(this.contractAddress, RLUSD_ERC20_ABI, this.wallet);
  }

  getWalletAddress(): string | null {
    return this.wallet?.address || null;
  }

  private getReadContract(): Contract {
    return new Contract(this.contractAddress, RLUSD_ERC20_ABI, this.provider);
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.getReadContract().balanceOf(address);
    return formatUnits(balance, 18);
  }

  async getEthBalance(address: string): Promise<string> {
    return formatUnits(await this.provider.getBalance(address), 18);
  }

  async getTotalSupply(): Promise<string> {
    return formatUnits(await this.getReadContract().totalSupply(), 18);
  }

  async getName(): Promise<string> {
    return this.getReadContract().name();
  }

  async getSymbol(): Promise<string> {
    return this.getReadContract().symbol();
  }

  async getDecimals(): Promise<number> {
    return this.getReadContract().decimals();
  }

  async getAllowance(owner: string, spender: string): Promise<string> {
    return formatUnits(await this.getReadContract().allowance(owner, spender), 18);
  }

  async isBlacklisted(address: string): Promise<boolean> {
    try {
      return await this.getReadContract().isBlacklisted(address);
    } catch {
      return false;
    }
  }

  async isPaused(): Promise<boolean> {
    try {
      return await this.getReadContract().paused();
    } catch {
      return false;
    }
  }

  async getNonce(address: string): Promise<string> {
    return (await this.getReadContract().nonces(address)).toString();
  }

  async transfer(to: string, amount: string): Promise<EthereumTransactionResult> {
    if (!this.contract) throw new Error('Wallet not set');
    const tx: TransactionResponse = await this.contract.transfer(to, parseUnits(amount, 18));
    return this.formatResult((await tx.wait())!, tx);
  }

  async approve(spender: string, amount: string): Promise<EthereumTransactionResult> {
    if (!this.contract) throw new Error('Wallet not set');
    const tx: TransactionResponse = await this.contract.approve(
      spender,
      parseUnits(amount, 18),
    );
    return this.formatResult((await tx.wait())!, tx);
  }

  async transferFrom(
    from: string,
    to: string,
    amount: string,
  ): Promise<EthereumTransactionResult> {
    if (!this.contract) throw new Error('Wallet not set');
    const tx: TransactionResponse = await this.contract.transferFrom(
      from,
      to,
      parseUnits(amount, 18),
    );
    return this.formatResult((await tx.wait())!, tx);
  }

  async signPermit(
    spender: string,
    value: string,
    deadline: number,
  ): Promise<{ v: number; r: string; s: string }> {
    if (!this.wallet) throw new Error('Wallet not set');
    const nonce = await this.getNonce(this.wallet.address);
    const domain = {
      name: PERMIT_DOMAIN_NAME,
      version: PERMIT_DOMAIN_VERSION,
      chainId: this.getChainId(),
      verifyingContract: this.contractAddress,
    };
    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };
    const message = {
      owner: this.wallet.address,
      spender,
      value: parseUnits(value, 18),
      nonce,
      deadline,
    };
    const sig = await this.wallet.signTypedData(domain, types, message);
    return {
      v: parseInt(sig.slice(130, 132), 16),
      r: sig.slice(0, 66),
      s: '0x' + sig.slice(66, 130),
    };
  }

  async estimateTransferGas(to: string, amount: string): Promise<string> {
    try {
      return (
        await this.getReadContract().transfer.estimateGas(to, parseUnits(amount, 18))
      ).toString();
    } catch {
      return GAS_LIMITS.transfer.toString();
    }
  }

  async getGasPrice(): Promise<{
    gasPrice: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  }> {
    const feeData = await this.provider.getFeeData();
    return {
      gasPrice: feeData.gasPrice?.toString() || '0',
      maxFeePerGas: feeData.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
    };
  }

  async getTransferEvents(
    fromBlock: number,
    toBlock: number | 'latest' = 'latest',
    filter?: { from?: string; to?: string },
  ): Promise<TransferEvent[]> {
    const contract = this.getReadContract();
    const events = await contract.queryFilter(
      contract.filters.Transfer(filter?.from, filter?.to),
      fromBlock,
      toBlock,
    );
    return events.map((e) => {
      const el = e as EventLog;
      return {
        from: el.args[0],
        to: el.args[1],
        value: formatUnits(el.args[2], 18),
        blockNumber: el.blockNumber,
        transactionHash: el.transactionHash,
        logIndex: el.index,
      };
    });
  }

  async getTransaction(hash: string): Promise<TransactionResponse | null> {
    return this.provider.getTransaction(hash);
  }

  async getTransactionReceipt(hash: string): Promise<TransactionReceipt | null> {
    return this.provider.getTransactionReceipt(hash);
  }

  async getBlock(blockNumber: number | 'latest'): Promise<Block | null> {
    return this.provider.getBlock(blockNumber);
  }

  async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  async getNetwork(): Promise<{ chainId: bigint; name: string }> {
    const n = await this.provider.getNetwork();
    return { chainId: n.chainId, name: n.name };
  }

  onBlock(callback: (blockNumber: number) => void): void {
    this.provider.on('block', callback);
  }

  onTransfer(callback: (from: string, to: string, value: string) => void): void {
    this.getReadContract().on('Transfer', (f, t, v) => callback(f, t, formatUnits(v, 18)));
  }

  removeAllListeners(): void {
    this.provider.removeAllListeners();
    this.getReadContract().removeAllListeners();
  }

  private formatResult(
    receipt: TransactionReceipt,
    tx: TransactionResponse,
  ): EthereumTransactionResult {
    return {
      success: receipt.status === 1,
      hash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.gasPrice?.toString() || '0',
      status: receipt.status || 0,
      from: receipt.from,
      to: receipt.to || '',
    };
  }

  async getContractInfo(): Promise<{
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
  }> {
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      this.getName(),
      this.getSymbol(),
      this.getDecimals(),
      this.getTotalSupply(),
    ]);
    return { address: this.contractAddress, name, symbol, decimals, totalSupply };
  }
}

export function createEthereumClient(network: string, customRpcUrl?: string): EthereumClient {
  let networkKey: 'mainnet' | 'sepolia' | 'custom' = 'mainnet';
  if (network.includes('sepolia')) networkKey = 'sepolia';
  else if (network.includes('custom')) networkKey = 'custom';
  return new EthereumClient({ network: networkKey, customRpcUrl });
}

export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

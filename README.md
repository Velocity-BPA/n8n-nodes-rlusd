# n8n-nodes-rlusd

> [Velocity BPA Licensing Notice]
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

A comprehensive n8n community node for Ripple's RLUSD stablecoin providing 18 resources and 60+ operations for multi-chain balance management, transfers, trustlines, DEX trading, compliance checking, and attestation verification on XRPL and Ethereum.

![License](https://img.shields.io/badge/license-BSL--1.1-blue)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.10-brightgreen)
![n8n](https://img.shields.io/badge/n8n-community--node-orange)

## Features

### Multi-Chain Support
- **XRPL Operations**: Native RLUSD on XRP Ledger with trustlines, DEX trading, payment channels
- **Ethereum Operations**: ERC-20 RLUSD with standard token operations and permit signatures

### Core Capabilities
- **Balance Management**: Check RLUSD balances across both chains
- **Transfers**: Send RLUSD payments on XRPL or Ethereum
- **Trustlines**: Manage XRPL trustlines for holding RLUSD
- **DEX Trading**: Trade RLUSD on XRPL's native decentralized exchange
- **Compliance**: Check address compliance and KYC status
- **Attestations**: Verify RLUSD reserve attestations
- **Cross-Chain**: Monitor bridge operations between chains

## Installation

### Community Nodes (Recommended)

1. Go to **Settings** → **Community Nodes**
2. Click **Install a community node**
3. Enter `n8n-nodes-rlusd`
4. Click **Install**

### Manual Installation

```bash
cd ~/.n8n
npm install n8n-nodes-rlusd
```

### Development Installation

```bash
# 1. Extract the zip file
unzip n8n-nodes-rlusd.zip
cd n8n-nodes-rlusd

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Create symlink to n8n custom nodes directory
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-rlusd

# 5. Restart n8n
n8n start
```

## Credentials Setup

### RLUSD Network Credentials

| Field | Description |
|-------|-------------|
| Network | Select network (XRPL Mainnet/Testnet/Devnet, Ethereum Mainnet/Sepolia, Custom) |
| Wallet Seed (XRPL) | Your XRPL wallet seed (sXXXX... format) |
| Private Key (Ethereum) | Your Ethereum private key (0x... format) |
| Custom URL | For custom network endpoints |

### Ripple API Credentials (Optional)

| Field | Description |
|-------|-------------|
| API Endpoint | Ripple API base URL |
| API Key | Your API key |
| API Secret | Your API secret |

## Resources & Operations

| Resource | Operations |
|----------|------------|
| RLUSD | Get Balance (XRPL/ETH), Transfer, Get Supply, Get Price, Get Market Data |
| XRPL | Get Balance, Get Trustline, Transfer, Order Book, Account Info |
| Ethereum | Get Balance, Transfer, Approve, Allowance, Transfer From, Contract Info |
| Trustline | Get Info, Set, Modify Limit, Remove |
| DEX | Order Book, Best Bid/Ask, Place Order, Cancel Order, Open Orders |
| Payment | Send Payment, Get Status |
| Compliance | Check Address, KYC Status, Sanctions, Authorized Institutions |
| Attestation | Latest Attestation, Historical, Verify |
| Issuer | Get Info, XRPL Address, Ethereum Contract |
| Cross-Chain | Bridge Status, Supported Chains |
| AMM | Pool Info, Pool Balance |
| Account | Account Info, Balance, Transactions |
| Transaction | Get Transaction, Status, Fee Estimate |
| Analytics | Volume, Market Data |
| Utility | Convert Units, Format Amounts, Validate Addresses, Network Status |

## Trigger Node

The RLUSD Trigger node monitors for real-time events:

| Event | Description |
|-------|-------------|
| RLUSD Transfer | Triggered on any RLUSD transfer |
| Large Transfer Alert | Triggered when transfer exceeds threshold |
| Transfer to Address | Triggered when watched address receives RLUSD |
| Transfer from Address | Triggered when watched address sends RLUSD |
| New Ledger (XRPL) | Triggered on new XRPL ledger close |
| New Block (Ethereum) | Triggered on new Ethereum block |

## Usage Examples

### Setting Up RLUSD Trustline (XRPL)

```json
{
  "resource": "trustline",
  "operation": "set",
  "trustlineLimit": "1000000000"
}
```

### Checking RLUSD Balance

```json
{
  "resource": "xrpl",
  "operation": "getBalance",
  "address": "rYourXRPLAddress..."
}
```

### Transferring RLUSD

```json
{
  "resource": "xrpl",
  "operation": "transfer",
  "destination": "rDestinationAddress...",
  "amount": "100",
  "destinationTag": 12345
}
```

### Trading on XRPL DEX

```json
{
  "resource": "dex",
  "operation": "placeLimitOrder",
  "orderSide": "buy",
  "amount": "100",
  "price": "0.5"
}
```

## RLUSD Concepts

### Trustlines (XRPL)
On XRPL, you must establish a trustline to the RLUSD issuer before receiving tokens. This is a one-time operation that requires a small XRP reserve.

### Rippling
XRPL feature that allows RLUSD to flow through accounts. Usually disabled with `NoRipple` flag for end users.

### Reserve Attestations
Third-party verified proofs that RLUSD is fully backed by USD reserves, audited by firms like BDO USA, LLP.

## Networks

| Network | Issuer Address |
|---------|---------------|
| XRPL Mainnet | `rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De` |
| XRPL Testnet | `rQhWct2fTQgPdDT7Xp9e8Dg2btrKmcG5p` |
| XRPL Devnet | `rP9jPyP5kyvFRb6ZiRghAGw5u8SGAmU4bd` |
| Ethereum Mainnet | `0x8292Bb45bf1Ee4d140127049757C0C6824e3F0B2` |

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `tecNO_LINE` | No trustline exists | Set trustline first |
| `tecUNFUNDED_PAYMENT` | Insufficient balance | Check balance |
| `tecFROZEN` | Account is frozen | Contact issuer |
| `tecNO_DST` | Destination doesn't exist | Verify address |
| `Wallet not set` | No credentials | Configure credentials |

## Security Best Practices

1. **Never share** wallet seeds or private keys
2. **Use testnet** for development and testing
3. **Start small** when testing on mainnet
4. **Verify addresses** before transactions
5. **Check compliance** status before large transfers

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint

# Lint and fix
npm run lint:fix
```

## Author

**Velocity BPA**
- Website: [velobpa.com](https://velobpa.com)
- GitHub: [Velocity-BPA](https://github.com/Velocity-BPA)

## Licensing

This n8n community node is licensed under the **Business Source License 1.1**.

### Free Use
Permitted for personal, educational, research, and internal business use.

### Commercial Use
Use of this node within any SaaS, PaaS, hosted platform, managed service,
or paid automation offering requires a commercial license.

For licensing inquiries:
**licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

Contributions are welcome! Please ensure all contributions comply with the BSL 1.1 license terms.

## Support

- **Issues**: [GitHub Issues](https://github.com/Velocity-BPA/n8n-nodes-rlusd/issues)
- **Licensing**: licensing@velobpa.com
- **Website**: https://velobpa.com

## Acknowledgments

- [Ripple](https://ripple.com) for RLUSD stablecoin
- [XRPL Foundation](https://xrpl.org) for XRP Ledger documentation
- [n8n](https://n8n.io) for the workflow automation platform

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

export class Custody implements ICredentialType {
  name = 'custody';
  displayName = 'Custody Provider';
  documentationUrl = 'https://github.com/Velocity-BPA/n8n-nodes-rlusd';

  properties: INodeProperties[] = [
    {
      displayName: 'Custody Provider',
      name: 'provider',
      type: 'options',
      default: 'custom',
      options: [
        { name: 'Anchorage', value: 'anchorage' },
        { name: 'BitGo', value: 'bitgo' },
        { name: 'Coinbase Custody', value: 'coinbase' },
        { name: 'Fireblocks', value: 'fireblocks' },
        { name: 'Custom Provider', value: 'custom' },
      ],
      description: 'The custody provider to use',
    },
    {
      displayName: 'API Endpoint',
      name: 'apiEndpoint',
      type: 'string',
      default: '',
      placeholder: 'https://api.custody-provider.com',
      description: 'The custody provider API endpoint',
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'Your custody provider API key',
    },
    {
      displayName: 'API Secret',
      name: 'apiSecret',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'Your custody provider API secret',
    },
    {
      displayName: 'Vault ID',
      name: 'vaultId',
      type: 'string',
      default: '',
      description: 'The vault or wallet ID to use',
    },
  ];

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.apiEndpoint}}',
      url: '/api/v1/health',
      method: 'GET',
      headers: {
        'X-API-Key': '={{$credentials.apiKey}}',
      },
    },
  };
}

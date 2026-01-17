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

export class RippleApi implements ICredentialType {
  name = 'rippleApi';
  displayName = 'Ripple API';
  documentationUrl = 'https://github.com/Velocity-BPA/n8n-nodes-rlusd';

  properties: INodeProperties[] = [
    {
      displayName: 'API Endpoint',
      name: 'apiEndpoint',
      type: 'string',
      default: 'https://api.ripple.com',
      description: 'The Ripple API endpoint URL',
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'Your Ripple API key',
    },
    {
      displayName: 'API Secret',
      name: 'apiSecret',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'Your Ripple API secret',
    },
  ];

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.apiEndpoint}}',
      url: '/api/v1/health',
      method: 'GET',
      headers: { 'X-API-Key': '={{$credentials.apiKey}}' },
    },
  };
}

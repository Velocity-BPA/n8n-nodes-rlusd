/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'n8n-nodes-base'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'n8n-nodes-base/node-execute-block-missing-continue-on-fail': 'off',
    'n8n-nodes-base/node-resource-description-filename-against-convention': 'off',
    'n8n-nodes-base/node-param-fixed-collection-type-unsorted-items': 'off',
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js', '!.eslintrc.js'],
};

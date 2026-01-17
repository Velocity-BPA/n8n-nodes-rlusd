/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * RLUSD Compliance Configuration
 */

export enum ComplianceStatus {
  APPROVED = 'approved',
  PENDING = 'pending',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
  UNKNOWN = 'unknown',
}

export enum KycLevel {
  NONE = 'none',
  BASIC = 'basic',
  ENHANCED = 'enhanced',
  INSTITUTIONAL = 'institutional',
}

export enum AmlRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  PROHIBITED = 'prohibited',
}

export enum FreezeStatus {
  NOT_FROZEN = 'not_frozen',
  INDIVIDUAL_FREEZE = 'individual_freeze',
  GLOBAL_FREEZE = 'global_freeze',
}

export const COMPLIANCE_ENDPOINTS = {
  checkAddress: '/api/v1/compliance/check',
  getKycStatus: '/api/v1/compliance/kyc',
  getAmlStatus: '/api/v1/compliance/aml',
  checkSanctions: '/api/v1/compliance/sanctions',
  submitTravelRule: '/api/v1/compliance/travel-rule',
  getAuthorizedInstitutions: '/api/v1/compliance/institutions',
};

export const RIPPLE_COMPLIANCE_API_BASE = 'https://api.ripple.com';
export const TRAVEL_RULE_THRESHOLD = 3000;

export interface ComplianceCheckResult {
  address: string;
  status: ComplianceStatus;
  kycLevel: KycLevel;
  amlRisk: AmlRiskLevel;
  freezeStatus: FreezeStatus;
  lastChecked: string;
}

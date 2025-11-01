import {
  CURRENT_TERMS_VERSION,
  TERMS_AND_CONDITIONS,
} from './termsAndConditions';
import { CURRENT_PRIVACY_VERSION, PRIVACY_POLICY } from './privacyPolicy';
import {
  CURRENT_MARKETING_VERSION,
  MARKETING_CONSENT,
} from './marketingConsent';

/**
 * 약관 타입 정의
 */
export enum PolicyType {
  TERMS = 'terms', // 이용약관
  PRIVACY = 'privacy', // 개인정보 수집 및 이용
  MARKETING = 'marketing', // 마케팅 정보 수신 동의
}

/**
 * 약관 정보 인터페이스
 */
export interface PolicyDocument {
  type: PolicyType;
  version: string;
  content: string;
  title: string;
  required: boolean; // 필수 동의 여부
  effectiveDate: string; // 시행일
}

/**
 * 모든 약관 문서
 */
export const POLICY_DOCUMENTS: Record<PolicyType, PolicyDocument> = {
  [PolicyType.TERMS]: {
    type: PolicyType.TERMS,
    version: CURRENT_TERMS_VERSION,
    content: TERMS_AND_CONDITIONS,
    title: '[필수] Stagelives 서비스 이용약관',
    required: true,
    effectiveDate: '2025-08-28',
  },
  [PolicyType.PRIVACY]: {
    type: PolicyType.PRIVACY,
    version: CURRENT_PRIVACY_VERSION,
    content: PRIVACY_POLICY,
    title: '[필수] 개인정보 수집 및 이용 동의',
    required: true,
    effectiveDate: '2025-08-28',
  },
  [PolicyType.MARKETING]: {
    type: PolicyType.MARKETING,
    version: CURRENT_MARKETING_VERSION,
    content: MARKETING_CONSENT,
    title: '[선택] 마케팅 정보 수신 동의',
    required: false,
    effectiveDate: '2025-08-28',
  },
};

/**
 * 특정 타입의 약관 문서 조회
 */
export function getPolicyDocument(type: PolicyType): PolicyDocument {
  return POLICY_DOCUMENTS[type];
}

/**
 * 모든 약관 문서 조회
 */
export function getAllPolicyDocuments(): PolicyDocument[] {
  return Object.values(POLICY_DOCUMENTS);
}

/**
 * 필수 약관 문서만 조회
 */
export function getRequiredPolicyDocuments(): PolicyDocument[] {
  return getAllPolicyDocuments().filter((doc) => doc.required);
}

/**
 * 선택적 약관 문서만 조회
 */
export function getOptionalPolicyDocuments(): PolicyDocument[] {
  return getAllPolicyDocuments().filter((doc) => !doc.required);
}

/**
 * 현재 약관 버전 정보 (하위 호환성)
 */
export {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  CURRENT_MARKETING_VERSION,
};

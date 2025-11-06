import logger from '../../utils/logger/logger.js';
import { User } from '../../models/auth/user.js';
import { OAuthService } from './oauthService.js';
import crypto from 'crypto';

/**
 * Apple ID Token 검증 결과
 */
export interface AppleTokenPayload {
  sub: string; // Apple User ID
  email?: string;
  email_verified?: boolean;
  is_private_email?: boolean;
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
}

/**
 * Apple Public Key (JWK format)
 */
interface ApplePublicKey {
  kty: string;
  kid: string;
  alg: string;
  n: string;
  e: string;
  use: string;
}

/**
 * Apple Public Keys Response
 */
interface ApplePublicKeysResponse {
  keys: ApplePublicKey[];
}

/**
 * Apple OAuth Service for Mobile App
 * 모바일 앱용 애플 OAuth 서비스
 */
export class AppleAuthService {
  private oauthService: OAuthService;
  private applePublicKeys: ApplePublicKey[] | null = null;
  private publicKeysLastFetched: number = 0;
  private readonly PUBLIC_KEYS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.oauthService = new OAuthService();
  }

  /**
   * Fetch Apple's public keys for JWT verification
   * Apple의 공개 키를 가져와서 JWT 검증에 사용
   */
  private async fetchApplePublicKeys(): Promise<ApplePublicKey[]> {
    try {
      // Check if we have cached keys that are still valid
      const now = Date.now();
      if (
        this.applePublicKeys &&
        now - this.publicKeysLastFetched < this.PUBLIC_KEYS_CACHE_TTL
      ) {
        return this.applePublicKeys;
      }

      // Fetch fresh keys from Apple
      const response = await fetch('https://appleid.apple.com/auth/keys');
      if (!response.ok) {
        throw new Error(`Failed to fetch Apple public keys: ${response.statusText}`);
      }

      const data = (await response.json()) as ApplePublicKeysResponse;
      this.applePublicKeys = data.keys;
      this.publicKeysLastFetched = now;

      logger.info('Apple public keys fetched successfully');
      return data.keys;
    } catch (error) {
      logger.error('Error fetching Apple public keys:', error);
      throw error;
    }
  }

  /**
   * Convert JWK to PEM format for crypto verification
   * JWK를 PEM 포맷으로 변환하여 crypto 검증에 사용
   */
  private jwkToPem(jwk: ApplePublicKey): string {
    const modulus = Buffer.from(jwk.n, 'base64');
    const exponent = Buffer.from(jwk.e, 'base64');

    // Create RSA public key in PEM format
    const key = crypto.createPublicKey({
      key: {
        kty: 'RSA',
        n: modulus.toString('base64url'),
        e: exponent.toString('base64url'),
      },
      format: 'jwk',
    });

    return key.export({ type: 'spki', format: 'pem' }).toString();
  }

  /**
   * Verify Apple ID Token
   * 애플 ID 토큰 검증
   *
   * Implementation of Apple Sign In token verification:
   * 1. Decode the JWT header to get the key ID (kid)
   * 2. Fetch Apple's public keys
   * 3. Find the matching public key using kid
   * 4. Verify the JWT signature using the public key
   * 5. Validate token claims (issuer, audience, expiration)
   */
  async verifyIdToken(idToken: string): Promise<AppleTokenPayload | null> {
    try {
      // 1. Parse JWT structure
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        logger.error('Invalid JWT format: must have 3 parts');
        return null;
      }

      const [headerB64, payloadB64, signatureB64] = parts;

      // 2. Decode header to get key ID
      const header = JSON.parse(
        Buffer.from(headerB64, 'base64url').toString('utf-8')
      ) as { kid: string; alg: string };

      if (!header.kid) {
        logger.error('Missing kid in JWT header');
        return null;
      }

      // 3. Fetch Apple's public keys
      const publicKeys = await this.fetchApplePublicKeys();
      const matchingKey = publicKeys.find(key => key.kid === header.kid);

      if (!matchingKey) {
        logger.error(`No matching public key found for kid: ${header.kid}`);
        return null;
      }

      // 4. Convert JWK to PEM and verify signature
      const publicKeyPem = this.jwkToPem(matchingKey);
      const signatureInput = `${headerB64}.${payloadB64}`;
      const signature = Buffer.from(signatureB64, 'base64url');

      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(signatureInput);
      verifier.end();

      const isValid = verifier.verify(publicKeyPem, signature);

      if (!isValid) {
        logger.error('JWT signature verification failed');
        return null;
      }

      // 5. Decode and validate payload
      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf-8')
      ) as AppleTokenPayload;

      // Validate issuer
      if (payload.iss !== 'https://appleid.apple.com') {
        logger.error(`Invalid issuer: ${payload.iss}`);
        return null;
      }

      // Validate audience (should match your Apple Client ID)
      const expectedAudience = process.env.APPLE_CLIENT_ID;
      if (expectedAudience && payload.aud !== expectedAudience) {
        logger.error(`Invalid audience: expected ${expectedAudience}, got ${payload.aud}`);
        return null;
      }

      // Validate expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        logger.error('Token has expired');
        return null;
      }

      logger.info('Apple ID token verified successfully');
      return payload;
    } catch (error) {
      logger.error('Error verifying Apple ID token:', error);
      return null;
    }
  }

  /**
   * Authenticate user with Apple ID Token
   * 애플 ID 토큰으로 사용자 인증
   */
  async authenticateWithIdToken(idToken: string): Promise<User | null> {
    try {
      // 1. ID 토큰 검증
      const payload = await this.verifyIdToken(idToken);
      if (!payload) {
        logger.error('Invalid Apple ID token');
        return null;
      }

      // 2. OAuthService를 사용하여 사용자 찾기 또는 생성
      const user = await this.oauthService.findOrCreateUser({
        provider: 'apple',
        socialId: payload.sub,
        email: payload.email,
        username: payload.email ? payload.email.split('@')[0] : undefined,
        emailVerified: payload.email_verified,
      });

      return user;
    } catch (error) {
      logger.error('Error authenticating with Apple ID token:', error);
      return null;
    }
  }
}
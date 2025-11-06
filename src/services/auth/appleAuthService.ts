import logger from '../../utils/logger/logger.js';
import { User } from '../../models/auth/user.js';
import { OAuthService } from './oauthService.js';
import https from 'https';
import crypto from 'crypto';

/**
 * Apple ID Token 검증 결과
 */
export interface AppleTokenPayload {
  sub: string; // Apple User ID
  email?: string;
  email_verified?: boolean;
  is_private_email?: boolean;
  iss?: string; // Issuer
  aud?: string; // Audience
  exp?: number; // Expiration time
  iat?: number; // Issued at time
}

/**
 * Apple Public Key from JWKS
 */
interface ApplePublicKey {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

/**
 * Apple JWKS Response
 */
interface AppleJWKSResponse {
  keys: ApplePublicKey[];
}

/**
 * JWT Header
 */
interface JWTHeader {
  alg: string;
  kid: string;
  typ?: string;
}

/**
 * Apple OAuth Service for Mobile App
 * 모바일 앱용 애플 OAuth 서비스
 */
export class AppleAuthService {
  private oauthService: OAuthService;
  private static readonly APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
  private static readonly APPLE_ISSUER = 'https://appleid.apple.com';
  private static publicKeysCache: Map<string, crypto.KeyObject> = new Map();
  private static publicKeysCacheTime: number = 0;
  private static readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  constructor() {
    this.oauthService = new OAuthService();
  }

  /**
   * Fetch Apple's public keys from JWKS endpoint
   * Apple의 공개 키를 JWKS 엔드포인트에서 가져오기
   */
  private async fetchApplePublicKeys(): Promise<AppleJWKSResponse> {
    return new Promise((resolve, reject) => {
      https
        .get(AppleAuthService.APPLE_JWKS_URL, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const parsed = JSON.parse(data) as AppleJWKSResponse;
              resolve(parsed);
            } catch (error) {
              reject(new Error('Failed to parse Apple JWKS response'));
            }
          });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Get public key for a specific kid (key ID)
   * 특정 kid(키 ID)에 대한 공개 키 가져오기
   */
  private async getPublicKey(kid: string): Promise<crypto.KeyObject | null> {
    // Check cache first
    const now = Date.now();
    if (
      AppleAuthService.publicKeysCache.has(kid) &&
      now - AppleAuthService.publicKeysCacheTime < AppleAuthService.CACHE_TTL
    ) {
      return AppleAuthService.publicKeysCache.get(kid) || null;
    }

    try {
      // Fetch fresh keys if cache is expired or key not found
      const jwks = await this.fetchApplePublicKeys();
      const key = jwks.keys.find((k) => k.kid === kid);

      if (!key) {
        logger.warn(`Apple public key with kid ${kid} not found`);
        return null;
      }

      // Convert JWK to PEM format
      const pem = this.jwkToPem(key);
      const publicKey = crypto.createPublicKey(pem);

      // Update cache
      AppleAuthService.publicKeysCache.clear();
      AppleAuthService.publicKeysCache.set(kid, publicKey);
      AppleAuthService.publicKeysCacheTime = now;

      return publicKey;
    } catch (error) {
      logger.error('Error fetching Apple public keys:', error);
      return null;
    }
  }

  /**
   * Convert JWK (JSON Web Key) to PEM format
   * JWK를 PEM 형식으로 변환
   */
  private jwkToPem(jwk: ApplePublicKey): string {
    // Convert base64url to base64
    const n = Buffer.from(jwk.n, 'base64url');
    const e = Buffer.from(jwk.e, 'base64url');

    // Create ASN.1 structure for RSA public key
    const modulusLength = n.length;
    const exponentLength = e.length;

    // ASN.1 DER encoding
    const derPrefix = Buffer.from([
      0x30, 0x82, // SEQUENCE
      (modulusLength + exponentLength + 32) >> 8,
      (modulusLength + exponentLength + 32) & 0xff,
      0x30, 0x0d, // SEQUENCE
      0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, // rsaEncryption OID
      0x05, 0x00, // NULL
      0x03, 0x82, // BIT STRING
      (modulusLength + exponentLength + 16) >> 8,
      (modulusLength + exponentLength + 16) & 0xff,
      0x00, // no padding
      0x30, 0x82, // SEQUENCE
      (modulusLength + exponentLength + 10) >> 8,
      (modulusLength + exponentLength + 10) & 0xff,
      0x02, 0x82, // INTEGER (modulus)
      modulusLength >> 8,
      modulusLength & 0xff,
    ]);

    const exponentPrefix = Buffer.from([
      0x02, // INTEGER (exponent)
      exponentLength,
    ]);

    const der = Buffer.concat([derPrefix, n, exponentPrefix, e]);
    const base64Der = der.toString('base64');

    // Format as PEM
    const pem = `-----BEGIN PUBLIC KEY-----\n${base64Der.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;

    return pem;
  }

  /**
   * Decode JWT without verification
   * JWT를 검증 없이 디코딩
   */
  private decodeJWT(token: string): {
    header: JWTHeader;
    payload: AppleTokenPayload;
  } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const header = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString('utf8'),
      ) as JWTHeader;
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8'),
      ) as AppleTokenPayload;

      return { header, payload };
    } catch (error) {
      logger.error('Error decoding JWT:', error);
      return null;
    }
  }

  /**
   * Verify Apple ID Token
   * 애플 ID 토큰 검증
   *
   * Implements Apple's ID token verification according to:
   * https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/verifying_a_user
   */
  async verifyIdToken(idToken: string): Promise<AppleTokenPayload | null> {
    try {
      // 1. Decode the token to get header and payload
      const decoded = this.decodeJWT(idToken);
      if (!decoded) {
        logger.error('Failed to decode Apple ID token');
        return null;
      }

      const { header, payload } = decoded;

      // 2. Validate basic token structure
      if (!header.kid || !header.alg) {
        logger.error('Invalid Apple ID token: missing kid or alg in header');
        return null;
      }

      // 3. Verify issuer
      if (payload.iss !== AppleAuthService.APPLE_ISSUER) {
        logger.error(
          `Invalid Apple ID token issuer: ${payload.iss || 'missing'}`,
        );
        return null;
      }

      // 4. Verify audience (client ID)
      const clientId = process.env.APPLE_CLIENT_ID;
      if (!clientId || payload.aud !== clientId) {
        logger.error(
          `Invalid Apple ID token audience: ${payload.aud || 'missing'}`,
        );
        return null;
      }

      // 5. Verify expiration
      const now = Math.floor(Date.now() / 1000);
      if (!payload.exp || payload.exp < now) {
        logger.error('Apple ID token has expired');
        return null;
      }

      // 6. Get the public key for verification
      const publicKey = await this.getPublicKey(header.kid);
      if (!publicKey) {
        logger.error('Failed to get Apple public key');
        return null;
      }

      // 7. Verify the signature
      const [headerB64, payloadB64, signatureB64] = idToken.split('.');
      const signatureData = `${headerB64}.${payloadB64}`;
      const signature = Buffer.from(signatureB64, 'base64url');

      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(signatureData);
      const isValid = verify.verify(publicKey, signature);

      if (!isValid) {
        logger.error('Apple ID token signature verification failed');
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
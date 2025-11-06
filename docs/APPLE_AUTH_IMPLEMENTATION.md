# Apple Authentication Implementation Guide

## Overview

This document describes the implementation of Apple Sign In (Apple ID) authentication for the LiveLink API server. The implementation includes JWT token verification using Apple's public keys and follows Apple's official authentication guidelines.

## What Was Implemented

### 1. Apple ID Token Verification (`src/services/auth/appleAuthService.ts`)

The `AppleAuthService` class now includes a complete implementation of Apple ID token verification:

#### Key Features:

- **JWT Token Verification**: Full implementation of JSON Web Token (JWT) verification using Apple's public keys
- **Public Key Caching**: Fetches and caches Apple's public keys for 24 hours to improve performance
- **Signature Verification**: Uses Node.js crypto module to verify RSA-SHA256 signatures
- **Token Claims Validation**: Validates issuer, audience, and expiration claims

#### Implementation Details:

The `verifyIdToken` method performs comprehensive token verification following these steps:

1. Parse JWT structure (header.payload.signature)
2. Decode header to extract Key ID (kid)
3. Fetch Apple's public keys from <https://appleid.apple.com/auth/keys>
4. Find matching public key using kid
5. Convert JWK (JSON Web Key) to PEM format
6. Verify JWT signature using RSA-SHA256
7. Validate token claims (issuer, audience, expiration)

### 2. Public Key Management

- Fetches keys from Apple's public endpoint
- Caches keys in memory for 24 hours
- Automatically refreshes when cache expires
- Converts JWK format to PEM format for crypto operations

## Security Features

1. **Signature Verification**: All tokens are cryptographically verified using Apple's public keys
2. **Issuer Validation**: Ensures tokens are issued by Apple (<https://appleid.apple.com>)
3. **Audience Validation**: Verifies tokens are intended for your app
4. **Expiration Validation**: Rejects expired tokens
5. **Key Rotation Support**: Automatically fetches new public keys when needed

## Environment Variables

Required configuration:

- `APPLE_CLIENT_ID`: Your Apple Client ID (required for token verification)
- `APPLE_TEAM_ID`: Your Apple Team ID (optional, for web OAuth)
- `APPLE_KEY_ID`: Your Apple Key ID (optional, for web OAuth)
- `APPLE_PRIVATE_KEY`: Your Apple Private Key (optional, for web OAuth)

## Changes Made

### Removed TODO Comments

The following TODO comments have been removed as the functionality is now fully implemented:

- TODO: Apple ID token verification implementation
- TODO: Use Apple's public keys for JWT verification
- TODO: Consider using apple-auth library

### Implementation Approach

Instead of using external libraries, the implementation uses:
- Node.js built-in `crypto` module for signature verification
- Native `fetch` API for retrieving public keys
- Manual JWT parsing and validation for better control and security

This approach provides:
- Zero additional dependencies
- Better security control
- Easier maintenance
- Full transparency of the verification process

## Testing

To test the implementation, use a valid Apple ID token from your mobile app or Apple's development tools.

## References

- [Apple Sign-In Documentation](https://developer.apple.com/documentation/sign_in_with_apple)
- [Apple REST API](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api)
- [JWT RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)

## Changelog

### 2025-11-05
- Implemented complete Apple ID token verification
- Added public key fetching and caching mechanism
- Added JWK to PEM conversion utility
- Added comprehensive token claims validation
- Removed TODO comments
- Added detailed inline documentation
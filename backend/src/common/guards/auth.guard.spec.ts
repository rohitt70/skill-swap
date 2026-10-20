import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import * as jwt from 'jsonwebtoken';

describe('AuthGuard (Security, Claims & CSRF Protection)', () => {
  let guard: AuthGuard;
  const secret = 'test-jwt-secret-key-at-least-32-chars-long';
  const issuer = 'skillswap-api';
  const audience = 'skillswap-client';

  beforeEach(() => {
    process.env.JWT_SECRET = secret;
    process.env.JWT_ISSUER = issuer;
    process.env.JWT_AUDIENCE = audience;
    process.env.FRONTEND_URL = 'http://localhost:3000';
    guard = new AuthGuard();
  });

  const createMockContext = (req: Partial<any>): { ctx: ExecutionContext; req: any } => {
    const fullReq = {
      headers: {},
      cookies: {},
      method: 'GET',
      ...req,
    };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => fullReq,
      }),
    } as unknown as ExecutionContext;
    return { ctx, req: fullReq };
  };

  it('GUARD-1: Rejects requests with missing authentication token', () => {
    const { ctx } = createMockContext({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('GUARD-2: Fails safely when JWT_SECRET environment variable is missing', () => {
    delete process.env.JWT_SECRET;
    const token = jwt.sign(
      { sub: 'user-456', email: 'user@test.edu', role: 'STUDENT' },
      secret,
      { algorithm: 'HS256', expiresIn: '15m' },
    );

    const { ctx } = createMockContext({
      headers: { authorization: `Bearer ${token}` },
    });

    expect(() => guard.canActivate(ctx)).toThrow(
      /Server authentication configuration error/,
    );
  });

  it('GUARD-3: Accepts valid Bearer token signed with HS256 and expected issuer/audience', () => {
    const token = jwt.sign(
      { sub: 'user-456', email: 'user@test.edu', role: 'STUDENT' },
      secret,
      { algorithm: 'HS256', expiresIn: '15m', issuer, audience },
    );

    const { ctx, req } = createMockContext({
      headers: { authorization: `Bearer ${token}` },
    });

    const result = guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req.user).toEqual({
      id: 'user-456',
      email: 'user@test.edu',
      role: 'STUDENT',
    });
  });

  it('GUARD-4: Rejects expired Bearer token', () => {
    const expiredToken = jwt.sign(
      { sub: 'user-456', email: 'user@test.edu', role: 'STUDENT' },
      secret,
      { algorithm: 'HS256', expiresIn: -10, issuer, audience },
    );

    const { ctx } = createMockContext({
      headers: { authorization: `Bearer ${expiredToken}` },
    });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('GUARD-5: Rejects token signed with wrong secret', () => {
    const malformedToken = jwt.sign(
      { sub: 'user-456', email: 'user@test.edu', role: 'STUDENT' },
      'wrong-secret-key-totally-different-from-expected',
      { algorithm: 'HS256', issuer, audience },
    );

    const { ctx } = createMockContext({
      headers: { authorization: `Bearer ${malformedToken}` },
    });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('GUARD-6: Rejects token with mismatched issuer or audience', () => {
    const token = jwt.sign(
      { sub: 'user-456', email: 'user@test.edu', role: 'STUDENT' },
      secret,
      { algorithm: 'HS256', expiresIn: '15m', issuer: 'attacker-issuer', audience },
    );

    const { ctx } = createMockContext({
      headers: { authorization: `Bearer ${token}` },
    });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('GUARD-7: Rejects cookie-authenticated mutating request (POST) when CSRF header and cookie are missing', () => {
    const token = jwt.sign(
      { sub: 'user-456', email: 'user@test.edu', role: 'STUDENT' },
      secret,
      { algorithm: 'HS256', expiresIn: '15m', issuer, audience },
    );

    const { ctx } = createMockContext({
      method: 'POST',
      cookies: { access_token: token },
      headers: {
        origin: 'http://localhost:3000',
        'x-requested-with': 'XMLHttpRequest',
      },
    });

    expect(() => guard.canActivate(ctx)).toThrow(
      /Missing X-CSRF-Token header or csrf_token cookie/,
    );
  });

  it('GUARD-8: Rejects cookie-authenticated mutating request (POST) when CSRF token mismatches', () => {
    const token = jwt.sign(
      { sub: 'user-456', email: 'user@test.edu', role: 'STUDENT' },
      secret,
      { algorithm: 'HS256', expiresIn: '15m', issuer, audience },
    );

    const { ctx } = createMockContext({
      method: 'POST',
      cookies: { access_token: token, csrf_token: 'valid-csrf-token-cookie-12345' },
      headers: {
        origin: 'http://localhost:3000',
        'x-requested-with': 'XMLHttpRequest',
        'x-csrf-token': 'wrong-csrf-token-submitted-by-attacker',
      },
    });

    expect(() => guard.canActivate(ctx)).toThrow(/CSRF token mismatch/);
  });

  it('GUARD-9: Rejects cookie-authenticated mutating request (POST) when Origin is disallowed', () => {
    const token = jwt.sign(
      { sub: 'user-456', email: 'user@test.edu', role: 'STUDENT' },
      secret,
      { algorithm: 'HS256', expiresIn: '15m', issuer, audience },
    );

    const { ctx } = createMockContext({
      method: 'POST',
      cookies: { access_token: token, csrf_token: 'valid-csrf-123' },
      headers: {
        origin: 'http://malicious-site.com',
        'x-requested-with': 'XMLHttpRequest',
        'x-csrf-token': 'valid-csrf-123',
      },
    });

    expect(() => guard.canActivate(ctx)).toThrow(/Origin "http:\/\/malicious-site\.com" is not allowed/);
  });

  it('GUARD-10: Accepts cookie-authenticated mutating request (POST) with matching CSRF token and allowed origin', () => {
    const token = jwt.sign(
      { sub: 'user-456', email: 'user@test.edu', role: 'STUDENT' },
      secret,
      { algorithm: 'HS256', expiresIn: '15m', issuer, audience },
    );

    const csrfToken = 'super-random-crypto-safe-csrf-token-456';

    const { ctx, req } = createMockContext({
      method: 'POST',
      cookies: { access_token: token, csrf_token: csrfToken },
      headers: {
        origin: 'http://localhost:3000',
        'x-requested-with': 'XMLHttpRequest',
        'x-csrf-token': csrfToken,
      },
    });

    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.user.id).toBe('user-456');
  });

  it('GUARD-11: Accepts cookie-authenticated read request (GET) without CSRF token', () => {
    const token = jwt.sign(
      { sub: 'user-456', email: 'user@test.edu', role: 'STUDENT' },
      secret,
      { algorithm: 'HS256', expiresIn: '15m', issuer, audience },
    );

    const { ctx, req } = createMockContext({
      method: 'GET',
      cookies: { access_token: token },
      headers: {},
    });

    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.user.id).toBe('user-456');
  });

  it('GUARD-12: Accepts Bearer token mutating request (POST) without CSRF token (API client)', () => {
    const token = jwt.sign(
      { sub: 'user-456', email: 'user@test.edu', role: 'STUDENT' },
      secret,
      { algorithm: 'HS256', expiresIn: '15m', issuer, audience },
    );

    const { ctx, req } = createMockContext({
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.user.id).toBe('user-456');
  });
});

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    let token: string | null = null;
    let isFromCookie = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (request.cookies && request.cookies.access_token) {
      token = request.cookies.access_token;
      isFromCookie = true;
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token required');
    }

    // CSRF Protection for cookie-authenticated mutating requests (POST, PUT, PATCH, DELETE)
    if (isFromCookie) {
      const method = (request.method || '').toUpperCase();
      const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      if (isMutating) {
        this.validateCsrf(request);
      }
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      this.logger.error('CRITICAL: JWT_SECRET environment variable is missing.');
      throw new UnauthorizedException('Server authentication configuration error');
    }

    try {
      const issuer = process.env.JWT_ISSUER || 'skillswap-api';
      const audience = process.env.JWT_AUDIENCE || 'skillswap-client';

      const decoded = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer,
        audience,
      }) as any;

      if (!decoded || !decoded.sub || typeof decoded.sub !== 'string') {
        throw new UnauthorizedException('Malformed token claims: missing sub');
      }

      request.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };

      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  private validateCsrf(request: any) {
    // 1. Origin / Referer Validation
    const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
    const origin = request.headers.origin;
    const referer = request.headers.referer;

    if (origin) {
      if (origin !== allowedOrigin && origin !== 'http://127.0.0.1:3000') {
        throw new UnauthorizedException(`CSRF check failed: Origin "${origin}" is not allowed`);
      }
    } else if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        if (refererOrigin !== allowedOrigin && refererOrigin !== 'http://127.0.0.1:3000') {
          throw new UnauthorizedException(`CSRF check failed: Referer origin "${refererOrigin}" is not allowed`);
        }
      } catch {
        throw new UnauthorizedException('CSRF check failed: Malformed Referer header');
      }
    }

    // 2. Custom Request Header Check
    const xRequestedWith = request.headers['x-requested-with'];
    if (!xRequestedWith) {
      throw new UnauthorizedException(
        'CSRF check failed: Missing X-Requested-With header on cookie authentication',
      );
    }

    // 3. Double-Submit CSRF Cookie Verification
    const csrfHeader = request.headers['x-csrf-token'];
    const csrfCookie = request.cookies?.csrf_token;

    if (!csrfHeader || !csrfCookie) {
      throw new UnauthorizedException(
        'CSRF check failed: Missing X-CSRF-Token header or csrf_token cookie',
      );
    }

    const headerBuf = Buffer.from(String(csrfHeader));
    const cookieBuf = Buffer.from(String(csrfCookie));

    if (headerBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(headerBuf, cookieBuf)) {
      throw new UnauthorizedException('CSRF check failed: CSRF token mismatch');
    }
  }
}

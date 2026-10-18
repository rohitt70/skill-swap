import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (request.cookies && request.cookies.access_token) {
      token = request.cookies.access_token;
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token required');
    }

    try {
      const secret = process.env.JWT_SECRET || 'fallback_secret_for_development_skillswap';
      const decoded = jwt.verify(token, secret) as any;
      request.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}

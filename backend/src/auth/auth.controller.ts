import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Request, Response } from 'express';

@Controller(['api/v1/auth', 'auth'])
export class AuthController {
  constructor(private authService: AuthService) {}

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true';
    const accessMaxAge = this.authService.getAccessCookieMaxAge();
    const refreshMaxAge = this.authService.getRefreshCookieMaxAge();

    // HttpOnly Access Token Cookie
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: accessMaxAge,
      path: '/',
    });

    // HttpOnly Refresh Token Cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: refreshMaxAge,
      path: '/',
    });

    // Client-readable CSRF Token Cookie (Double-Submit CSRF Pattern)
    const csrfToken = this.authService.generateCsrfToken();
    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      maxAge: refreshMaxAge,
      path: '/',
    });
  }

  private clearAuthCookies(res: Response) {
    const isProd = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true';

    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });

    res.clearCookie('csrf_token', {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });
  }

  @Get('csrf')
  async getCsrfToken(@Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true';
    const csrfToken = this.authService.generateCsrfToken();
    const refreshMaxAge = this.authService.getRefreshCookieMaxAge();

    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      maxAge: refreshMaxAge,
      path: '/',
    });

    return { csrfToken };
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const result = await this.authService.register(dto, ip);

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    // Omit tokens from response JSON payload
    return {
      success: true,
      message: 'User registered successfully',
      user: result.user,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(dto, ip, userAgent);

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    // Omit tokens from response JSON payload
    return {
      success: true,
      message: 'Logged in successfully',
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = body?.refreshToken || req.cookies?.refresh_token;
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.refreshToken(token, ip, userAgent);

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    // Omit tokens from response JSON payload
    return {
      success: true,
      message: 'Session refreshed successfully',
      user: result.user,
    };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refresh_token;
    await this.authService.logout(user.id, token);
    this.clearAuthCookies(res);
    return { success: true, message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate JWT Secrets & Expiration Configuration
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!jwtSecret) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing.');
  }
  if (!jwtRefreshSecret) {
    throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is missing.');
  }
  if (jwtSecret === jwtRefreshSecret) {
    throw new Error('FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be distinct keys.');
  }

  if (isProduction) {
    if (jwtSecret.length < 32) {
      throw new Error('FATAL: JWT_SECRET must be at least 32 characters long in production.');
    }
    if (jwtRefreshSecret.length < 32) {
      throw new Error('FATAL: JWT_REFRESH_SECRET must be at least 32 characters long in production.');
    }
  }

  const { parseDurationToMs } = await import('./common/utils/duration.util');
  const accessMs = parseDurationToMs(process.env.JWT_EXPIRES_IN || '15m');
  const refreshMs = parseDurationToMs(process.env.JWT_REFRESH_EXPIRES_IN || '7d');

  if (refreshMs <= accessMs) {
    throw new Error('FATAL: JWT_REFRESH_EXPIRES_IN must be strictly greater than JWT_EXPIRES_IN.');
  }

  const app = await NestFactory.create(AppModule);

  // Security & Middleware
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token'],
  });

  // Global filters & interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // OpenAPI Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('SkillSwap API')
    .setDescription(
      'Production REST & WebSocket API for Peer-to-Peer Student Skill Exchange Platform',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication and session management')
    .addTag('users', 'Student profiles and discovery')
    .addTag('skills', 'Skills catalog and student skill inventories')
    .addTag('friends', 'Friend requests and canonical connections')
    .addTag('chat', 'Conversations, messages, and session lifecycle')
    .addTag('learning-sessions', 'Peer learning session bookings and reviews')
    .addTag('moderation', 'Safety, blocking, reporting, and moderation')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`SkillSwap Backend Server running at: http://localhost:${port}`);
  logger.log(`OpenAPI Swagger documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();

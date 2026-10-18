import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security & Middleware
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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

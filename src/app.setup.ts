import { ValidationPipe, VersioningType } from '@nestjs/common';
import type { INestApplication, NestMiddleware } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import path from 'node:path';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

export function configureApp(app: INestApplication) {
  const configService = app.get(ConfigService);

  configureVpsStorageStaticServing(app, configService);
  app.enableCors(createCorsOptions(configService));
  app.use(applySecurityHeaders as NestMiddleware['use']);
  app.use(applyFaviconResponse as NestMiddleware['use']);
  app.use(applyRootHealthCheck as NestMiddleware['use']);
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
}

export function shouldServeLocalStorage(publicUrl: string | undefined) {
  return shouldServeStoragePublicUrl(publicUrl);
}

export function shouldServeVpsStaticStorage(config: { provider: string | undefined; publicUrl: string | undefined; storageRoot: string | undefined }) {
  return config.provider?.trim().toLowerCase() === 'vps' && Boolean(config.storageRoot?.trim()) && shouldServeStoragePublicUrl(config.publicUrl);
}

function shouldServeStoragePublicUrl(publicUrl: string | undefined) {
  if (!publicUrl?.trim()) {
    return false;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(publicUrl);
  } catch {
    return false;
  }

  return parsedUrl.pathname.replace(/\/+$/, '') === '/storage';
}

function configureVpsStorageStaticServing(app: INestApplication, configService: ConfigService) {
  const provider = configService.get<string>('STORAGE_PROVIDER');
  const publicUrl = configService.get<string>('VPS_STORAGE_PUBLIC_URL');
  const storageRoot = configService.get<string>('VPS_STORAGE_ROOT', '').trim();

  if (
    !shouldServeVpsStaticStorage({
      provider,
      publicUrl,
      storageRoot,
    })
  ) {
    return;
  }

  app.use(
    '/storage',
    express.static(path.resolve(storageRoot), {
      dotfiles: 'deny',
      fallthrough: true,
      index: false,
    }) as NestMiddleware['use'],
  );
}

function createCorsOptions(configService: ConfigService): CorsOptions {
  const corsAllowedOrigins = (configService.get<string>('CORS_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    origin: (origin, callback) => {
      if (!origin || corsAllowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin not allowed.'), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}

function applySecurityHeaders(_request: Request, response: Response, next: NextFunction) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=()');
  next();
}

function applyFaviconResponse(request: Request, response: Response, next: NextFunction) {
  if (request.path !== '/favicon.ico' || request.method !== 'GET') {
    next();
    return;
  }

  response.status(204).end();
}

function applyRootHealthCheck(request: Request, response: Response, next: NextFunction) {
  if (request.path !== '/' || !['GET', 'HEAD'].includes(request.method)) {
    next();
    return;
  }

  response.status(200);

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  response.json({
    status: 'ok',
    service: 'gr8booksneo-backend',
  });
}

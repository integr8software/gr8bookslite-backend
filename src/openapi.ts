import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const OpenApiDocumentPath = 'api/docs';
export const OpenApiJsonPath = '/api/docs-json';

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('GR8Books Neo API')
    .setDescription('Versioned REST API for GR8Books Neo frontend clients.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
    ignoreGlobalPrefix: false,
  });
}

export function setupOpenApi(app: INestApplication) {
  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('NODE_ENV')?.toLowerCase() === 'production';
  const isEnabled = configService.get<string>('OPENAPI_ENABLED')?.toLowerCase() === 'true' || !isProduction;

  if (!isEnabled) {
    return;
  }

  SwaggerModule.setup(OpenApiDocumentPath, app, () => createOpenApiDocument(app), {
    jsonDocumentUrl: OpenApiJsonPath,
    useGlobalPrefix: false,
    customSiteTitle: 'GR8Books Neo API Docs',
  });
}

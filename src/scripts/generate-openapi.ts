import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { configureApp } from '../app.setup';
import { AppModule } from '../app.module';
import { createOpenApiDocument } from '../openapi';

async function generateOpenApi() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
    rawBody: true,
  });

  configureApp(app);

  const document = createOpenApiDocument(app);
  const outputPath = resolve(process.cwd(), 'openapi.json');

  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  await app.close();
}

void generateOpenApi();

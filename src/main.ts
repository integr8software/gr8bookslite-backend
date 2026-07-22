import { NestFactory } from '@nestjs/core';
import { configureApp } from './app.setup';
import { AppModule } from './app.module';
import { setupOpenApi } from './openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  configureApp(app);
  setupOpenApi(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

// PR quality dashboard integration test
// Retrigger PR quality workflow
// Retrigger corrected PR dashboard action
// Retrigger after PowerShell 7 installation
// Retrigger after Windows PowerShell action fix
// Retrigger after Semgrep setup fix
// Retrigger after PowerShell script encoding fix
// Retrigger after Verify QA tools fix
// Trigger finalized automation structure
// Trigger rebuilt backend analysis

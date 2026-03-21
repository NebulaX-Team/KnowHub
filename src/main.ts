import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync } from 'fs';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Increase body size limit for large page content (50MB)
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS
  app.enableCors();

  // Global prefix for API
  app.setGlobalPrefix('api/v1');

  // Serve uploaded files - PRIORITY OVER FRONTEND ASSETS
  const uploadDir = process.env.UPLOAD_DIR || configService.get<string>('static.uploadDir') || join(__dirname, '..', 'uploads');
  console.debug('----------------------------------------');
  console.debug('Static Assets Configuration:');
  console.debug('Upload Directory:', uploadDir);
  console.debug('Upload Prefix:', '/uploads');
  console.debug('----------------------------------------');
  
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads',
  });

  // Serve static files from frontend build (if present)
  const clientDistPath = join(__dirname, 'frontend');
  const frontendIndexPath = join(clientDistPath, 'index.html');
  const hasFrontendBuild = existsSync(frontendIndexPath);

  if (hasFrontendBuild) {
    app.useStaticAssets(clientDistPath, {
      prefix: '/',
    });
  } else {
    console.warn('⚠️ Frontend build not found. Skipping static frontend hosting.');
    console.warn(`⚠️ Expected file: ${frontendIndexPath}`);
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // SPA fallback - serve index.html for non-API routes that don't match static files
  app.use((req, res, next) => {
    // Skip for API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    
    // Skip for actual files (has extension)
    if (req.path.includes('.')) {
      return next();
    }

    if (!hasFrontendBuild) {
      return res.status(503).json({
        statusCode: 503,
        message:
          'Frontend assets not found. Build client first (`pnpm build:client`) or run frontend dev server on http://localhost:5173.',
      });
    }

    // Serve index.html for SPA routing
    return res.sendFile(frontendIndexPath);
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/v1/health`);
  if (hasFrontendBuild) {
    console.log(`🌐 Frontend: http://localhost:${port}`);
  } else {
    console.log('🌐 Frontend build not found; use Vite dev server: http://localhost:5173');
  }
  console.log(`📁 Client dist path: ${clientDistPath}`);
}
bootstrap();

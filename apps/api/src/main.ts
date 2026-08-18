import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';
import helmet from 'helmet';
import { Pool } from 'pg';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AppLoggerService } from './common/logger/app-logger.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', 1);
  app.setGlobalPrefix('api');

  app.use(helmet({ contentSecurityPolicy: false }));

  const sessionPool = new Pool({ connectionString: process.env.DATABASE_URL });
  const PgSessionStore = connectPgSimple(session);
  app.use(
    session({
      store: new PgSessionStore({
        pool: sessionPool,
        tableName: 'session',
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET ?? 'dev-secret-troque-em-producao',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.COOKIE_SECURE === 'true',
        maxAge: 1000 * 60 * 60 * 8,
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter(app.get(AppLoggerService)));
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  console.log(`API pronta em http://localhost:${port}/api`);
}

void bootstrap();

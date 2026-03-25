import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma';
import { ConfigModule } from '@nestjs/config';
import { LoggerMiddleware } from './logger';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { HttpExceptionFilter } from './error';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { validateConfig } from './validate/env.validation';
import { AuthModule } from './auth';
import { FirebaseAdminModule } from './firebase';

// New modules for resume scoring

// Logger middleware configuration

LoggerMiddleware.configure({
  logRequest: true,
  logHeaders: false,
  logBody: false,
  logResponse: false,
  logResponseBody: false,
  logLatency: true,
  logUserAgent: false,
  logIP: false,
  logProtocol: true,
  maxResponseBodyLength: 20000,
});

@Module({
  imports: [
    // Global config
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: validateConfig,
    }),

    // Scheduler for cron jobs
    ScheduleModule.forRoot(),

    // Rate limiting - default: 10 requests per minute
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute default
      },
    ]),

    // File uploads
    MulterModule.register({
      dest: './uploads',
    }),

    // Database
    PrismaModule,

    // Firebase (Global)
    FirebaseAdminModule,

    // Authentication
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*path');
  }
}

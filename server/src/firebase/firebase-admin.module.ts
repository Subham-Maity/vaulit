import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

/**
 * FirebaseAdminModule
 *
 * Global module – initialises the Firebase Admin SDK exactly once and exports
 * the app instance under the `FIREBASE_ADMIN` injection token so every other
 * module can inject it without re-importing this module.
 *
 * The service-account credentials are pulled from environment variables so
 * that no secret JSON file ever lands in the repository.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: (configService: ConfigService): admin.app.App => {
        // `FIREBASE_PRIVATE_KEY` is stored with literal \n in .env files;
        // replace them with real newlines before passing to the SDK.
        const privateKey = configService
          .getOrThrow<string>('FIREBASE_PRIVATE_KEY')
          .replace(/\\n/g, '\n');

        return admin.initializeApp({
          credential: admin.credential.cert({
            projectId: configService.getOrThrow<string>('FIREBASE_PROJECT_ID'),
            clientEmail: configService.getOrThrow<string>(
              'FIREBASE_CLIENT_EMAIL',
            ),
            privateKey,
          }),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['FIREBASE_ADMIN'],
})
export class FirebaseAdminModule {}

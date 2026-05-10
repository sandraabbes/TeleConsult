// ⬇️ ADD THIS LINE AT THE TOP
import * as crypto from 'crypto';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import authConfig from './config/auth.config'; 
import { AuthModule } from './auth/auth.module';
import { User } from './auth/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [authConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // OPTIONAL: Add a dummy usage to force crypto to be loaded
        const testUUID = crypto.randomUUID?.() || '00000000-0000-0000-0000-000000000000';
        console.log('🔐 crypto UUID check:', testUUID);

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASS'),
          database: configService.get<string>('DB_NAME'),
          entities: [User],
          synchronize: true,
        };
      },
    }),
    AuthModule,
  ],
})
export class AppModule {
  constructor(private readonly configService: ConfigService) {
    console.log('🔍 DATABASE CONFIGURATION:');
    console.log('📌 DB_HOST:', this.configService.get<string>('DB_HOST'));
    console.log('📌 DB_PORT:', this.configService.get<number>('DB_PORT'));
    console.log('📌 DB_USER:', this.configService.get<string>('DB_USER'));
    console.log('📌 DB_NAME:', this.configService.get<string>('DB_NAME'));
  }
}

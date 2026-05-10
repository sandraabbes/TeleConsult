import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './LoginDoctor/auth.module';
import { Doctor } from './LoginDoctor/entities/doctor.entity';

@Module({
  imports: [
    // Chargement global du .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Connexion à PostgreSQL via TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASS'),
        database: configService.get<string>('DB_NAME'),
        entities: [Doctor],  // 👈 Entity Doctor déclarée
        synchronize: true,   // ⚠️ à désactiver en production
      }),
    }),

    // Ton module d’authentification pour les docteurs
    AuthModule,
  ],
})
export class AppModule {
  constructor(private readonly configService: ConfigService) {
    // Debug : log les infos de connexion DB
    console.log('🔍 DATABASE CONFIGURATION:');
    console.log('📌 DB_HOST:', this.configService.get<string>('DB_HOST'));
    console.log('📌 DB_PORT:', this.configService.get<number>('DB_PORT'));
    console.log('📌 DB_USER:', this.configService.get<string>('DB_USER'));
    console.log('📌 DB_NAME:', this.configService.get<string>('DB_NAME'));
  }
}

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const databaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => {
  const host = config.get<string>('DB_HOST');
  const portRaw = config.get<string>('DB_PORT');
  const username =
    config.get<string>('DB_USER') ??
    config.get<string>('DB_USERNAME');
  const password =
    config.get<string>('DB_PASS') ??
    config.get<string>('DB_PASSWORD');
  const database =
    config.get<string>('DB_NAME') ??
    config.get<string>('DB_DATABASE');

  const port = portRaw ? parseInt(portRaw, 10) : undefined;

  return {
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    autoLoadEntities: true,
    synchronize: config.get<boolean>('DB_SYNC') ?? true,
    logging: config.get<boolean>('DB_LOGGING') ?? false,
  };
};

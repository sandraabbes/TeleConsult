import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { Doctor } from 'src/RegisterDoctor/entities/doctor.entity'; 

dotenv.config();

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'register_doctor',
  entities: [Doctor],      // <-- uniquement Doctor
  autoLoadEntities: true,  // permet à Nest d’ajouter auto les entities importées dans les modules
  synchronize: true,       // ⚠️ à désactiver en prod
  logging: true,
};

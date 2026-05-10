import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entities/admin.entity';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      name: 'adminConnection',
      type: 'better-sqlite3',
      database: 'admin.sqlite',
      entities: [Admin],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Admin], 'adminConnection'),
  ],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

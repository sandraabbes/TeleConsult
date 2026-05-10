import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { UsersRepository } from './users.repository';
import { HttpModule } from '@nestjs/axios'; 

@Module({
  imports: [TypeOrmModule.forFeature([User]),
  HttpModule,
], // 🔹 Permet à TypeORM d'utiliser l'entité User
  providers: [UsersService, UsersRepository],
  controllers: [UsersController],
  exports: [UsersRepository],
})
export class UsersModule {}

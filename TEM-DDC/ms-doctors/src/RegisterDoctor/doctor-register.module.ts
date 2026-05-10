import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorRegisterService } from './doctor-register.service';
import { DoctorRegisterController } from './doctor-register.controller';
import { Doctor } from './entities/doctor.entity';


@Module({
  imports: [TypeOrmModule.forFeature([Doctor])],
  controllers: [DoctorRegisterController],
  providers: [DoctorRegisterService],
})
export class DoctorRegisterModule {}

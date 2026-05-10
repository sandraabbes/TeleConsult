import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorRegisterModule } from './RegisterDoctor/doctor-register.module';
import { databaseConfig } from './Config/database.config'; 

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig), // <-- on utilise la config externe
    DoctorRegisterModule,
  ],
})
export class AppModule {}

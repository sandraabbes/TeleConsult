import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DoctorJwtStrategy } from './doctor-jwt.strategy';
import { PatientJwtStrategy } from './patient-jwt.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [DoctorJwtStrategy, PatientJwtStrategy],
  exports: [PassportModule],
})
export class AuthModule {}
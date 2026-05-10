import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
  } from '@nestjs/common';
  import { JwtPatientGuard } from './jwt-patient.guard';
  import { JwtDoctorGuard } from './jwt-doctor.guard';
  
  /**
   * ✅ Combined Guard that accepts BOTH Patient and Doctor tokens
   * 
   * This guard tries to authenticate requests using either:
   * 1. Patient JWT (via JwtPatientGuard)
   * 2. Doctor JWT (via JwtDoctorGuard)
   * 
   * If either succeeds, the request is authorized.
   * 
   * Place this file in: src/common/guards/jwt-patient-or-doctor.guard.ts
   */
  @Injectable()
  export class JwtPatientOrDoctorGuard implements CanActivate {
    private readonly logger = new Logger(JwtPatientOrDoctorGuard.name);
  
    constructor(
      private readonly patientGuard: JwtPatientGuard,
      private readonly doctorGuard: JwtDoctorGuard,
    ) {}
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const req = context.switchToHttp().getRequest();
      
      this.logger.debug('🔐 Starting authentication...');
      
      // Log available auth sources
      const hasCookie = !!req?.cookies?.accessToken;
      const hasAuthHeader = !!req?.headers?.authorization;
      
      this.logger.debug(`Available auth sources: Cookie=${hasCookie}, Header=${hasAuthHeader}`);
  
      // Try patient authentication first
      try {
        this.logger.debug('Attempting PATIENT authentication...');
        const result = await this.patientGuard.canActivate(context);
        
        if (result) {
          this.logger.log('✅ Authenticated as PATIENT');
          this.logger.debug(`Patient user: ${JSON.stringify(req.user)}`);
          return true;
        }
      } catch (patientErr) {
        this.logger.debug(`⚠️ Patient auth failed: ${patientErr.message}`);
        // Continue to try doctor auth
      }
  
      // Try doctor authentication
      try {
        this.logger.debug('Attempting DOCTOR authentication...');
        const result = await this.doctorGuard.canActivate(context);
        
        if (result) {
          this.logger.log('✅ Authenticated as DOCTOR');
          this.logger.debug(`Doctor user: ${JSON.stringify(req.user)}`);
          return true;
        }
      } catch (doctorErr) {
        this.logger.debug(`⚠️ Doctor auth failed: ${doctorErr.message}`);
        // Both failed, throw error below
      }
  
      // Both authentication methods failed
      this.logger.warn('❌ Both patient and doctor authentication failed');
      throw new UnauthorizedException('Invalid or missing authentication token');
    }
  }
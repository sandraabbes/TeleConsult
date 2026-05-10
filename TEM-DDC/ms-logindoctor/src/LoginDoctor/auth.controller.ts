import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  HttpException,
  HttpStatus,
  Logger,
  HttpCode,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendCodeDto } from './dto/resend-code.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /** ========== LOGIN (2FA conditionnel) ========== */
  @Post('login-dr')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res() res: Response) {
    try {
      this.logger.log(`🔐 Login attempt for email: ${dto.email}`);
      
      const result = await this.authService.login(dto, req);
      
      // ✅ Cas 1 : 2FA non requis (device déjà connu)
      if ('accessToken' in result) {
        this.logger.log(`✅ Login successful without 2FA for: ${dto.email}`);
        
        return res.status(200).json({
          statusCode: 200,
          message: result.message || 'Login successful',
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          doctor: result.doctor,
          isVerified: true,
        });
      }

      // ✅ Cas 2 : 2FA requis
      this.logger.log(`📧 2FA required for: ${dto.email}`);
      
      return res.status(200).json({
        statusCode: 200,
        message: result.message || 'Verification code sent',
        doctorId: result.doctorId,
        email: result.email,
        codeSent: true,
      });
    } catch (error) {
      this.logger.error(`❌ Login failed for ${dto.email}: ${error.message}`, error.stack);
      
      const statusCode = error.status || HttpStatus.UNAUTHORIZED;
      const message = error.message || 'Login failed';
      
      throw new HttpException(
        { 
          statusCode, 
          message, 
          error: error.name || 'UnauthorizedException' 
        },
        statusCode,
      );
    }
  }

  /** ========== VERIFY 2FA ========== */
  @Post('verify')
  @HttpCode(200)
  async verify(@Body() dto: VerifyCodeDto, @Req() req: Request, @Res() res: Response) {
    try {
      this.logger.log(`🔍 Verifying 2FA code for: ${dto.email}`);
      
      const result = await this.authService.verifyCode(dto, req);

      this.logger.log(`✅ 2FA verified successfully for: ${dto.email}`);

      return res.status(200).json({
        statusCode: 200,
        message: '2FA vérifiée avec succès',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        doctor: result.doctor,
        isVerified: true,
      });
    } catch (error) {
      this.logger.error(`❌ Verification failed for ${dto.email}: ${error.message}`, error.stack);
      
      const statusCode = error.status || HttpStatus.UNAUTHORIZED;
      const message = error.message || 'Verification failed';
      
      throw new HttpException(
        { 
          statusCode, 
          message, 
          error: error.name || 'UnauthorizedException' 
        },
        statusCode,
      );
    }
  }

  /** ========== REQUEST PASSWORD RESET ========== */
  @Post('request-reset')
  @HttpCode(200)
  async requestReset(@Body() dto: RequestResetDto) {
    try {
      this.logger.log(`📧 Password reset requested for: ${dto.email}`);
      return await this.authService.requestReset(dto);
    } catch (error) {
      this.logger.error(`❌ Reset request failed: ${error.message}`);
      throw new HttpException(
        { 
          statusCode: HttpStatus.BAD_REQUEST, 
          message: error.message || 'Reset request failed' 
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** ========== RESET PASSWORD ========== */
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    try {
      this.logger.log(`🔑 Password reset for: ${dto.email}`);
      return await this.authService.resetPassword(dto);
    } catch (error) {
      this.logger.error(`❌ Password reset failed: ${error.message}`);
      throw new HttpException(
        { 
          statusCode: HttpStatus.BAD_REQUEST, 
          message: error.message || 'Password reset failed' 
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** ========== RESEND CODE ========== */
  @Post('resend-code')
  @HttpCode(200)
  async resendCode(@Body() dto: ResendCodeDto) {
    try {
      this.logger.log(`📧 Resending code to: ${dto.email}`);
      return await this.authService.resendCode(dto);
    } catch (error) {
      this.logger.error(`❌ Resend code failed: ${error.message}`);
      throw new HttpException(
        { 
          statusCode: HttpStatus.BAD_REQUEST, 
          message: error.message || 'Failed to resend code' 
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** ========== LOGOUT ========== */
  @Post('logout')
  @HttpCode(200)
  async logout(@Body('doctorId') doctorId: number) {
    try {
      this.logger.log(`👋 Logout for doctor ID: ${doctorId}`);
      return await this.authService.logout(doctorId);
    } catch (error) {
      this.logger.error(`❌ Logout failed: ${error.message}`);
      throw new HttpException(
        { 
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR, 
          message: error.message || 'Logout failed' 
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
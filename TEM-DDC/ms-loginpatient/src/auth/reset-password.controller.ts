
import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthService } from './auth.service';
import { User } from './user.entity';
import {
  RequestResetDto,
  VerifyResetCodeDto,
  ResetPasswordDto,
} from './dto/password.dto';

@Controller('auth/password')
export class PasswordResetController {
  private readonly logger = new Logger(PasswordResetController.name);

  constructor(
    private readonly authService: AuthService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /** ========== REQUEST RESET ========== **/
  @Post('request-reset')
  async requestReset(@Body() dto: RequestResetDto) {
    this.logger.log(`📥 Password reset requested for: ${dto.email}`);

    try {
      const result = await this.authService.sendResetCode(dto.email);
      return result; // { success: true, message: '...' }
    } catch (error) {
      this.logger.error(
        `❌ Error requesting password reset: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'An error occurred while processing your request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** ========== VERIFY RESET CODE ========== **/
  @Post('verify-code')
  async verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    const { email, resetCode } = dto;
    this.logger.log(`🔍 Verifying reset code for: ${email}`);

    try {
      return this.authService.verifyResetCode(email, resetCode);
      // { valid: boolean, message: string }
    } catch (error) {
      this.logger.error(
        `❌ Error verifying reset code: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'An error occurred while verifying the reset code',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** ========== RESET PASSWORD ========== **/
  @Post('reset')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const { email, resetCode, newPassword, confirmPassword } = dto;
    this.logger.log(`🔄 Resetting password for: ${email}`);

    try {
      return this.authService.resetPassword(
        email,
        resetCode,
        newPassword,
        confirmPassword,
      );
      // { success: boolean, message: string }
    } catch (error) {
      this.logger.error(
        `❌ Error resetting password: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'An error occurred while resetting your password',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpException,
  HttpStatus,
  UseGuards,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CurrentDoctor } from 'src/common/decorators/current-user.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtDoctorGuard } from 'src/common/guards/jwt-doctor.guard';
import { IsEmail, IsString, MinLength } from 'class-validator';

// DTOs internes du Gateway
class RequestResetDto {
  @IsEmail()
  email: string;
}

class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  code: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @MinLength(8)
  confirmNewPassword: string;
}

class ResendCodeDto {
  @IsEmail()
  email: string;
}

class VerifyCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  code: string;
}

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

@ApiTags('Auth Doctor (Gateway)')
@Controller('auth/doctor')
export class GatewayLoginDoctorController {
  private readonly logger = new Logger(GatewayLoginDoctorController.name);
  private readonly authDoctorServiceUrl =
    process.env.AUTH_DOCTOR_SERVICE_URL;

  constructor(private readonly httpService: HttpService) {}

  /** ========== HELPER ERREURS ========== */
  private handleError(
    error: any,
    defaultMsg: string,
    defaultStatus: number = HttpStatus.BAD_REQUEST,
  ) {
    const status = error.response?.status || defaultStatus;
    const message = error.response?.data?.message || defaultMsg;
    this.logger.error(`❌ ${defaultMsg}: ${error.message}`);
    throw new HttpException(
      { statusCode: status, message, error: error.message },
      status,
    );
  }

  /** ========== LOGIN DOCTOR ========== */
  @Post('login-dr')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Doctor login (step 1)',
    description:
      'Validate credentials and send a verification code if needed (2FA)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'doctor@example.com' },
        password: { type: 'string', example: 'password123' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiOkResponse({
    description: 'Verification code sent or tokens returned directly',
  })
  async login(@Body() loginDto: LoginDto, @Req() req: Request, @Res() res: Response) {
    try {
      this.logger.log(`🔐 Doctor login attempt for: ${loginDto.email}`);

      const axiosResponse = await firstValueFrom(
        this.httpService.post(`${this.authDoctorServiceUrl}/auth/login-dr`, loginDto, {
          headers: {
            'Content-Type': 'application/json',
            'user-agent': req.headers['user-agent'] || '',
            'x-forwarded-for': req.ip || req.connection.remoteAddress || '',
          },
          withCredentials: true,
        }),
      );

      const data = axiosResponse.data;
      this.logger.log(`✅ Auth service response: ${JSON.stringify(data)}`);

      // ✅ CASE 1: Tokens exist (no 2FA or device trusted) - Set cookies
      if (data.accessToken && data.refreshToken) {
        this.logger.log('🍪 Setting auth cookies (no 2FA required)');

        if (process.env.NODE_ENV === 'production') {
          res.cookie('accessToken', data.accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 1000 * 60 * 15, // 15 minutes
          });

          res.cookie('refreshToken', data.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
          });
        } else {
          res.cookie('accessToken', data.accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 15, // 15 minutes
          });

          res.cookie('refreshToken', data.refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
          });
        }
      } else if (data.codeSent) {
        // ✅ CASE 2: 2FA required - NO cookies yet
        this.logger.log('📧 2FA code sent, waiting for verification');
      }

      return res.status(200).json(data);
    } catch (error) {
      this.logger.error(`❌ Login error: ${error.message}`);
      this.handleError(error, 'Doctor login failed', HttpStatus.UNAUTHORIZED);
    }
  }

  /** ========== VERIFY CODE ========== */
  @Post('verify')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Doctor verify code (step 2)',
    description: 'Verify 2FA code and return access tokens',
  })
  async verifyCode(@Body() payload: VerifyCodeDto, @Req() req: Request, @Res() res: Response) {
    try {
      this.logger.log(`🔍 Verifying 2FA code for: ${payload.email}`);

      const axiosResponse = await firstValueFrom(
        this.httpService.post(`${this.authDoctorServiceUrl}/auth/verify`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'user-agent': req.headers['user-agent'] || '',
            'x-forwarded-for': req.ip || req.connection.remoteAddress || '',
          },
          withCredentials: true,
        }),
      );

      const data = axiosResponse.data;
      this.logger.log(`✅ 2FA verified, setting cookies`);

      // ✅ Set cookies after successful 2FA
      if (data.accessToken && data.refreshToken) {
        if (process.env.NODE_ENV === 'production') {
          res.cookie('accessToken', data.accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 1000 * 60 * 15,
          });

          res.cookie('refreshToken', data.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 1000 * 60 * 60 * 24 * 7,
          });
        } else {
          res.cookie('accessToken', data.accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 15,
          });

          res.cookie('refreshToken', data.refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 7,
          });
        }
      }

      return res.status(200).json(data);
    } catch (error) {
      this.logger.error(`❌ Verification error: ${error.message}`);
      this.handleError(error, 'Verification failed', HttpStatus.UNAUTHORIZED);
    }
  }

  /** ========== RESEND CODE ========== */
  @Post('resend-code')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Resend verification code',
  })
  async resendCode(@Body() dto: ResendCodeDto) {
    try {
      this.logger.log(`📧 Resending code to: ${dto.email}`);
      const axiosResponse = await firstValueFrom(
        this.httpService.post(`${this.authDoctorServiceUrl}/auth/resend-code`, dto),
      );
      return axiosResponse.data;
    } catch (error) {
      this.handleError(error, 'Failed to resend code');
    }
  }

  /** ========== REQUEST RESET PASSWORD ========== */
  @Post('request-reset')
  @HttpCode(200)
  async requestReset(@Body() dto: RequestResetDto) {
    try {
      const axiosResponse = await firstValueFrom(
        this.httpService.post(`${this.authDoctorServiceUrl}/auth/request-reset`, dto),
      );
      return axiosResponse.data;
    } catch (error) {
      this.handleError(error, 'Failed to request password reset');
    }
  }

  /** ========== RESET PASSWORD ========== */
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    try {
      const axiosResponse = await firstValueFrom(
        this.httpService.post(`${this.authDoctorServiceUrl}/auth/reset-password`, dto),
      );
      return axiosResponse.data;
    } catch (error) {
      this.handleError(error, 'Password reset failed');
    }
  }

  /** ========== LOGOUT DOCTOR ========== */
  @Post('logout')
  @UseGuards(JwtDoctorGuard)
  @HttpCode(200)
  async logout(@CurrentDoctor() doctor: any, @Res() res: Response) {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.authDoctorServiceUrl}/auth/logout`, { doctorId: doctor?.id }),
      );

      res.clearCookie('accessToken', { httpOnly: true, sameSite: 'lax' });
      res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax' });

      return res.status(200).json({
        message: 'Logged out successfully',
        info: 'Next login will require verification code',
      });
    } catch (error) {
      this.handleError(error, 'Logout failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
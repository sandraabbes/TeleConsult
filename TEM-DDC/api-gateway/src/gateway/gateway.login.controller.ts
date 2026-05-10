import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// DTO minimal (facultatif, juste pour typer)
class RequestResetDto {
  email: string;
}

@Controller('auth')
export class AuthGatewayController {
  constructor(private readonly httpService: HttpService) {}

  private authServiceUrl = process.env.AUTH_SERVICE_URL;

  /* -----------------------------------------------------------
    🔧 HELPERS
  ----------------------------------------------------------- */

  private forwardHeaders(req: Request) {
    return {
      'Content-Type': 'application/json',
      'user-agent': req.headers['user-agent'] || '',
      'x-forwarded-for': req.ip || req.connection.remoteAddress || '',
    };
  }

  private setCookie(res: Response, name: string, token: string) {
    if (!token) return;

    res.cookie(name, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge:
        name === 'refreshToken'
          ? 1000 * 60 * 60 * 24 * 7 // 7 jours
          : 1000 * 60 * 60 * 2, // 2 heures
    });
  }

  private handleGatewayError(error: any, fallback: string, status = 400) {
    throw new HttpException(
      {
        statusCode: error.response?.status || status,
        message: error.response?.data?.message || fallback,
        error: error.message,
      },
      error.response?.status || status,
    );
  }

  /* -----------------------------------------------------------
    🔐 LOGIN
  ----------------------------------------------------------- */

  @Post('login')
  async login(
    @Body() loginDto: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authServiceUrl}/api/auth/login`,
          loginDto,
          {
            headers: this.forwardHeaders(req),
            withCredentials: true,
          },
        ),
      );

      const data = response.data;

      if (data.accessToken) this.setCookie(res, 'accessToken', data.accessToken);

      return data;
    } catch (error) {
      this.handleGatewayError(error, 'Login failed', HttpStatus.UNAUTHORIZED);
    }
  }

  /* -----------------------------------------------------------
    🔐 VERIFY 2FA
  ----------------------------------------------------------- */

  @Post('verify-2fa')
  async verifyTwoFactor(
    @Body() body: { userId: string; code: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authServiceUrl}/api/auth/verify-2fa`,
          body,
          {
            headers: this.forwardHeaders(req),
            withCredentials: true,
          },
        ),
      );

      const data = response.data;

      this.setCookie(res, 'accessToken', data.accessToken);

      return data;
    } catch (error) {
      this.handleGatewayError(error, '2FA verification failed', 401);
    }
  }

  /* -----------------------------------------------------------
    🔄 RESEND 2FA
  ----------------------------------------------------------- */

  @Post('resend-2fa-code')
  async resendTwoFactor(@Body() body: { userId: string }) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authServiceUrl}/api/auth/resend-2fa-code`,
          body,
        ),
      );
      return response.data;
    } catch (error) {
      this.handleGatewayError(error, 'Failed to resend 2FA code');
    }
  }

  /* -----------------------------------------------------------
    🌐 OAUTH REDIRECTS
  ----------------------------------------------------------- */

  @Get('google/login')
  googleLogin(@Res() res: Response) {
    return res.redirect(`${this.authServiceUrl}/api/auth/google/login`);
  }

  @Get('google/redirect')
  googleRedirect(@Req() req: Request, @Res() res: Response) {
    const query = new URLSearchParams(req.query as any);
    return res.redirect(
      `${this.authServiceUrl}/api/auth/google/callback?${query.toString()}`,
    );
  }

  @Get('facebook/login')
  facebookLogin(@Res() res: Response) {
    return res.redirect(`${this.authServiceUrl}/api/auth/facebook/login`);
  }

  @Get('facebook/redirect')
  facebookRedirect(@Req() req: Request, @Res() res: Response) {
    const query = new URLSearchParams(req.query as any);
    return res.redirect(
      `${this.authServiceUrl}/api/auth/facebook/callback?${query.toString()}`,
    );
  }

  @Get('linkedin/login')
  linkedinLogin(@Res() res: Response) {
    return res.redirect(`${this.authServiceUrl}/api/auth/linkedin/login`);
  }

  @Get('linkedin/redirect')
  linkedinRedirect(@Req() req: Request, @Res() res: Response) {
    const query = new URLSearchParams(req.query as any);
    return res.redirect(
      `${this.authServiceUrl}/api/auth/linkedin/callback?${query.toString()}`,
    );
  }

  /* -----------------------------------------------------------
    🔑 PASSWORD RESET — adapté au microservice
  ----------------------------------------------------------- */

  @Post('password/request-reset')
  async requestReset(@Body() dto: RequestResetDto) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authServiceUrl}/api/auth/password/request-reset`,
          dto,
        ),
      );
      return response.data;
    } catch (error) {
      this.handleGatewayError(error, 'Failed to request password reset');
    }
  }

  @Post('password/verify-code')
  async verifyResetCode(@Body() body: { email: string; resetCode: string }) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authServiceUrl}/api/auth/password/verify-code`,
          body,
        ),
      );
      return response.data;
    } catch (error) {
      this.handleGatewayError(error, 'Invalid or expired reset code');
    }
  }

  @Post('password/reset')
  async resetPassword(
    @Body()
    dto: {
      email: string;
      resetCode: string;
      newPassword: string;
      confirmPassword: string;
    },
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authServiceUrl}/api/auth/password/reset`,
          dto,
        ),
      );
      return response.data;
    } catch (error) {
      this.handleGatewayError(error, 'Password reset failed');
    }
  }

  /* -----------------------------------------------------------
    📩 WELCOME EMAIL
  ----------------------------------------------------------- */

  @Post('send-welcome-email')
  async sendWelcome(@Body() payload: { to: string; firstName: string }) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authServiceUrl}/api/auth/send-welcome-email`,
          payload,
        ),
      );
      return response.data;
    } catch (error) {
      this.handleGatewayError(error, 'Failed to send welcome email', 500);
    }
  }
}

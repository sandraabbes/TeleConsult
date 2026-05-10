import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { User } from './user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private readonly logger = new Logger(AuthController.name);

  /* ======================================================
     🔐 LOGIN (2FA conditionnel)
  ====================================================== */
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const result = await this.authService.login(loginDto, req);

      // Définition du cookie JWT
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 2, // 2h
      });

      return res.status(200).json({
        statusCode: 200,
        ...result,
      });
    } catch (error) {
      this.logger.error(`❌ Login failed: ${error.message}`, error.stack);

      throw new HttpException(
        {
          statusCode: HttpStatus.UNAUTHORIZED,
          message: error.message || 'Login failed',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /* ======================================================
     🔐 VERIFY 2FA
  ====================================================== */
  @Post('verify-2fa')
  async verify2FA(
    @Body() body: { userId: string; code: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const result = await this.authService.verifyTwoFactorCode(
        body.userId,
        body.code,
        req,
      );

      // Set access token
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 2,
      });

      return res.status(200).json({
        statusCode: 200,
        message: '2FA verified successfully',
        accessToken: result.accessToken,
        data: result.user,
      });
    } catch (error) {
      this.logger.error(`❌ 2FA verification failed: ${error.message}`, error.stack);

      throw new HttpException(
        {
          statusCode: HttpStatus.UNAUTHORIZED,
          message: error.message || '2FA verification failed',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /* ======================================================
     🔐 RESEND 2FA CODE
  ====================================================== */
  @Post('resend-2fa-code')
  async resendTwoFactorCode(@Body() body: { userId: string }) {
    try {
      const result = await this.authService.resendTwoFactorCode(body.userId);

      return {
        statusCode: 200,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`❌ Resend 2FA failed: ${error.message}`, error.stack);

      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message || 'Failed to resend 2FA code',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /* ======================================================
     🌐 OAUTH - GOOGLE
  ====================================================== */
  @Get('google/login')
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const user = req.user as Partial<User>;
      const token = await this.authService.generateJwtToken(user);
      const safeUser = {
        id: user.id,
        firstName: user['firstName'] || user['name'],
        lastName: user['lastName'] || '',
        email: user.email,
        role: user.role,
      }

      res.cookie('accessToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 2,
      });
      return res.redirect(
        `http://localhost:5173/oauth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(safeUser))}`
      )
      //return res.redirect(
        //`http://localhost:5173/dashboard?token=${token}&user=${encodeURIComponent(
          //JSON.stringify(user),
        //)}`,
      //);
    } catch (error) {
      this.logger.error('❌ Google callback failed', error.stack);
      throw new HttpException('Google authentication failed', HttpStatus.UNAUTHORIZED);
    }
  }

  /* ======================================================
     🌐 OAUTH - FACEBOOK
  ====================================================== */
  @Get('facebook/login')
  @UseGuards(AuthGuard('facebook'))
  facebookLogin() {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const user = req.user as Partial<User>;
      const token = await this.authService.generateJwtToken(user);

      res.cookie('accessToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 2,
      });

      return res.redirect(
        `http://localhost:5173/dashboard?token=${token}&user=${encodeURIComponent(
          JSON.stringify(user),
        )}`,
      );
    } catch (error) {
      this.logger.error('❌ Facebook callback failed', error.stack);
      throw new HttpException('Facebook authentication failed', HttpStatus.UNAUTHORIZED);
    }
  }

  /* ======================================================
     🌐 OAUTH - LINKEDIN
  ====================================================== */
  @Get('linkedin/login')
  @UseGuards(AuthGuard('linkedin'))
  linkedinLogin() {}

  @Get('linkedin/callback')
  @UseGuards(AuthGuard('linkedin'))
  async linkedinCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const user = req.user as Partial<User>;
      const token = await this.authService.generateJwtToken(user);

      res.cookie('accessToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 2,
      });

      return res.redirect(
        `http://localhost:5173/dashboard?token=${token}&user=${encodeURIComponent(
          JSON.stringify(user),
        )}`,
      );
    } catch (error) {
      this.logger.error('❌ LinkedIn callback failed', error.stack);
      throw new HttpException('LinkedIn authentication failed', HttpStatus.UNAUTHORIZED);
    }
  }

  /* ======================================================
     ✉️ SEND WELCOME EMAIL
  ====================================================== */
  @Post('send-welcome-email')
  async sendWelcomeEmail(@Body() payload: { to: string; firstName: string }) {
    try {
      await this.authService.sendWelcomeEmail(payload.to, payload.firstName);

      return {
        statusCode: 200,
        message: 'Welcome email sent successfully',
      };
    } catch (error) {
      this.logger.error('❌ Failed to send welcome email', error.stack);

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to send welcome email',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

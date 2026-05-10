import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { JwtPatientOrDoctorGuard } from '../common/guards/jwt-patient-or-doctor.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

function trimSlashEnd(s?: string) {
  return s ? s.replace(/\/+$/, '') : '';
}

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages/conversations')
@UseGuards(JwtPatientOrDoctorGuard)
export class MessagesGatewayController {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const url = this.config.get<string>('MESSAGES_SERVICE_URL') || 'http://localhost:3060';
    this.baseUrl = trimSlashEnd(url) + '/conversations';
  }

  private passHeaders(req: any) {
    const h = { ...(req?.headers || {}) };
    delete (h as any)['content-length'];
    return h;
  }

  private handleAxiosError(e: unknown): never {
    const err = e as AxiosError<any>;
    const status = err?.response?.status ?? 502;
    const data = err?.response?.data;
    const message =
      (data && typeof data === 'object' && typeof data.message === 'string' && data.message) ||
      (Array.isArray(data?.message) ? data.message.join(', ') : undefined) ||
      (typeof data === 'string' ? data : undefined) ||
      data?.error ||
      data?.detail ||
      err?.message ||
      'Messages service error';
    const payload =
      data && typeof data === 'object' ? { ...data, message } : { message };
    throw new HttpException(payload, status);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  async createConversation(@Req() req: any, @Body() body: any) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(this.baseUrl, body, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) {
      this.handleAxiosError(e);
    }
  }

  @Get()
  @ApiOperation({ summary: 'List all conversations for a user' })
  @ApiQuery({ name: 'userId', required: true, type: String })
  @ApiQuery({ name: 'userType', required: true, type: String, enum: ['doctor', 'patient'] })
  async findAll(
    @Req() req: any,
    @Query('userId') userId: string,
    @Query('userType') userType: string,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(this.baseUrl, {
          params: { userId, userType },
          headers: this.passHeaders(req),
        }),
      );
      return data;
    } catch (e) {
      this.handleAxiosError(e);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full message history for a conversation' })
  async getHistory(@Req() req: any, @Param('id') id: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/${encodeURIComponent(id)}`, {
          headers: this.passHeaders(req),
        }),
      );
      return data;
    } catch (e) {
      this.handleAxiosError(e);
    }
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark messages as read for a user' })
  async markRead(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.patch(`${this.baseUrl}/${encodeURIComponent(id)}/read`, body, {
          headers: this.passHeaders(req),
        }),
      );
      return data;
    } catch (e) {
      this.handleAxiosError(e);
    }
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  HttpException,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { JwtPatientOrDoctorGuard } from '../common/guards/jwt-patient-or-doctor.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

function trimSlashEnd(s?: string) {
  return s ? s.replace(/\/+$/, '') : '';
}

@ApiTags('Video Consultation')
@ApiBearerAuth()
@Controller('video-consultation')
@UseGuards(JwtPatientOrDoctorGuard)
export class VideoConsultationGatewayController {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const url = this.config.get<string>('VIDEO_CONSULTATION_SERVICE_URL') || 'http://localhost:3050';
    this.baseUrl = trimSlashEnd(url) + '/consultations';
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
      'Video consultation service error';
    const payload =
      data && typeof data === 'object' ? { ...data, message } : { message };
    throw new HttpException(payload, status);
  }

  @Post()
  @ApiOperation({ summary: 'Create a video consultation room (doctor)' })
  async create(@Req() req: any, @Body() body: any) {
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
  @ApiOperation({ summary: 'List all consultations' })
  async findAll(@Req() req: any) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(this.baseUrl, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) {
      this.handleAxiosError(e);
    }
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get consultation by room ID' })
  async getByRoomId(@Req() req: any, @Param('roomId') roomId: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/${encodeURIComponent(roomId)}`, {
          headers: this.passHeaders(req),
        }),
      );
      return data;
    } catch (e) {
      this.handleAxiosError(e);
    }
  }

  @Post('join')
  @ApiOperation({ summary: 'Patient joins a consultation room' })
  async join(@Req() req: any, @Body() body: { roomId: string; patientId: string }) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/join`, body, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) {
      this.handleAxiosError(e);
    }
  }

  @Post('start')
  @ApiOperation({ summary: 'Start the video consultation' })
  async start(@Req() req: any, @Body() body: { roomId: string }) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/start`, body, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) {
      this.handleAxiosError(e);
    }
  }

  @Post('end')
  @ApiOperation({ summary: 'End the video consultation' })
  async end(
    @Req() req: any,
    @Body() body: { roomId: string; reason?: string },
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/end`, body, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) {
      this.handleAxiosError(e);
    }
  }

  @Post('upload-file')
  @ApiOperation({ summary: 'Upload a file during consultation' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads/consultations';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/') || file.mimetype.startsWith('application/')) {
          cb(null, true);
        } else {
          cb(new Error('Only PDF, images, and documents are allowed'), false);
        }
      },
    }),
  )
  async uploadFile(@Req() req: any, @UploadedFile() file: Express.Multer.File, @Body() body: any) {
    if (!file) {
      throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
    }

    const fileUrl = `/uploads/consultations/${file.filename}`;

    try {
      // Create a payload that mimics the medical record attachment structure 
      // AND contains info needed by the frontend consultation logic
      return {
        message: 'File uploaded successfully',
        id: `file-${Date.now()}`,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        fileUrl: fileUrl,
        url: fileUrl,
        uid: file.filename,
        name: file.originalname,
        status: 'done',
        type: file.mimetype,
      };
    } catch (e) {
      this.handleAxiosError(e);
    }
  }

  @Get(':roomId/messages')
  @ApiOperation({ summary: 'Get consultation messages by room ID' })
  async getMessagesByRoomId(@Req() req: any, @Param('roomId') roomId: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/${encodeURIComponent(roomId)}/messages`, {
          headers: this.passHeaders(req),
        }),
      );
      return data;
    } catch (e) {
      this.handleAxiosError(e);
    }
  }

  @Get(':roomId/files')
  @ApiOperation({ summary: 'Get consultation files by room ID' })
  async getFilesByRoomId(@Req() req: any, @Param('roomId') roomId: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/${encodeURIComponent(roomId)}/files`, {
          headers: this.passHeaders(req),
        }),
      );
      return data;
    } catch (e) {
      this.handleAxiosError(e);
    }
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { JoinConsultationDto } from './dto/join-consultation.dto';
import { EndConsultationDto } from './dto/end-consultation.dto';
import { HttpAuthGuard } from '../common/guards/http-auth.guard';

@Controller('consultations')
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  @Post()
  @UseGuards(HttpAuthGuard)
  async create(@Body() dto: CreateConsultationDto) {
    const consultation = await this.consultationService.create(dto);
    return this.consultationService.toResponseDto(consultation);
  }

  // ── Static POST routes MUST come before parameterized routes ──────

  @Post('join')
  @UseGuards(HttpAuthGuard)
  async join(@Body() dto: JoinConsultationDto) {
    const consultation = await this.consultationService.join(dto);
    return this.consultationService.toResponseDto(consultation);
  }

  @Post('start')
  @UseGuards(HttpAuthGuard)
  async start(@Body() body: { roomId: string }) {
    const consultation = await this.consultationService.startConsultation(body.roomId);
    return this.consultationService.toResponseDto(consultation);
  }

  @Post('end')
  @UseGuards(HttpAuthGuard)
  async end(@Body() dto: EndConsultationDto) {
    const consultation = await this.consultationService.endConsultation(dto.roomId, dto.reason);
    return this.consultationService.toResponseDto(consultation);
  }

  @Post('upload-file')
  @UseGuards(HttpAuthGuard)
  async uploadFile(@Body() body: any) {
    // Stub: file upload not yet implemented on this microservice
    return { message: 'File upload received', ...body };
  }

  // ── Static GET route ──────────────────────────────────────────────

  @Get()
  @UseGuards(HttpAuthGuard)
  async findAll() {
    const list = await this.consultationService.findAll();
    return list.map((c) => this.consultationService.toResponseDto(c));
  }

  // ── Parameterized GET routes AFTER static routes ──────────────────

  @Get(':roomId/messages')
  @UseGuards(HttpAuthGuard)
  async getMessages(@Param('roomId') roomId: string) {
    return [];
  }

  @Get(':roomId/files')
  @UseGuards(HttpAuthGuard)
  async getFiles(@Param('roomId') roomId: string) {
    return [];
  }

  @Get(':roomId')
  @UseGuards(HttpAuthGuard)
  async getByRoomId(@Param('roomId') roomId: string) {
    try {
      const consultation = await this.consultationService.findOrCreateByRoomId(roomId);
      return this.consultationService.toResponseDto(consultation);
    } catch (error) {
      if (error && (error as any).status === 404) {
        return {}; // Return empty object instead of 404 to avoid console errors in frontend
      }
      throw error;
    }
  }
}

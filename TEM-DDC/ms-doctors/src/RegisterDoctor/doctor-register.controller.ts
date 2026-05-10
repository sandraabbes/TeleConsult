import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  NotFoundException,
  Patch,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { DoctorRegisterService } from './doctor-register.service';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { File as MulterFile } from 'multer';

@Controller('doctors')
export class DoctorRegisterController {
  constructor(private readonly doctorService: DoctorRegisterService) {}

  /** CREATE A DOCTOR */
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  async create(
    @UploadedFiles() files: MulterFile[],
    @Body() body: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Files are required');
    }
    return this.doctorService.create(body, files);
  }

  // ═══════════════════════════════════════════════════
  // ADMIN ENDPOINTS (called internally by api-gateway)
  // ═══════════════════════════════════════════════════

  /** GET PENDING DOCTORS (admin) */
  @Get('admin/pending')
  findPending() {
    return this.doctorService.findPending();
  }

  /** GET ALL DOCTORS FOR ADMIN */
  @Get('admin/all')
  findAllAdmin(@Query('status') status?: string) {
    return this.doctorService.findAllAdmin(status);
  }

  /** GET DOCTOR DOCUMENTS (admin) */
  @Get('admin/:id/docs')
  getDoctorDocs(@Param('id', ParseIntPipe) id: number) {
    return this.doctorService.getDoctorDocs(id);
  }

  /** VERIFY/REJECT A DOCTOR (admin) */
  @Patch('admin/:id/verify')
  verifyDoctor(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string },
  ) {
    return this.doctorService.verifyDoctor(id, body.action, body.rejectionReason);
  }

  /** SUSPEND A DOCTOR (admin) */
  @Patch('admin/:id/suspend')
  suspendDoctor(@Param('id', ParseIntPipe) id: number) {
    return this.doctorService.suspendDoctor(id);
  }

  // ═══════════════════════════════════════════════════
  // EXISTING ENDPOINTS
  // ═══════════════════════════════════════════════════

  /** GET ALL DOCTORS */
  @Get()
  findAll() {
    return this.doctorService.findAll();
  }

  /** GET DOCTOR BY ID */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const doctor = await this.doctorService.findOne(+id);
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  /** UPDATE DOCTOR */
  @Patch(':id')
  @UseInterceptors(AnyFilesInterceptor())
  async updateDoctor(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: MulterFile[],
    @Body() body: UpdateDoctorDto,
  ) {
    if (!body || Object.keys(body).length === 0) {
      throw new BadRequestException('No data provided for update');
    }
    return this.doctorService.update(id, body, files);
  }



  /** DELETE DOCTOR */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.doctorService.remove(+id);
  }

  /** SEARCH DOCTOR BY FULL NAME */
  @Get('search/:fullName')
  async searchByFullName(@Param('fullName') fullName: string) {
    const doctors = await this.doctorService.findByFullName(fullName);
    if (!doctors || doctors.length === 0) {
      throw new NotFoundException('No doctors found with that name');
    }
    return doctors;
  }
}


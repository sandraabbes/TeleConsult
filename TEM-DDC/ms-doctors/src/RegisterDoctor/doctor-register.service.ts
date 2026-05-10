import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Doctor, VerificationStatus } from './entities/doctor.entity';

import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { DoctorResponseDto } from './dto/doctor-response.dto';
import { File as MulterFile } from 'multer';

@Injectable()
export class DoctorRegisterService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,

  ) {}

  /** Sanitize doctor object for response */
  private sanitizeDoctor(doctor: Doctor): DoctorResponseDto {
    return {
      id: doctor.id,
      fullName: doctor.fullName,
      email: doctor.email,
      phone: doctor.phone,
      specialty: doctor.specialty,
      experience: doctor.experience,
      practicePlace: doctor.practicePlace,
      country: doctor.country,
      city: doctor.city,
      clinicAddress: doctor.clinicAddress,
      licenceImg: doctor.licenceImg,
      identityImg: doctor.identityImg,
      role: doctor.role,
      bio: doctor.bio,
      consultationPrice: doctor.consultationPrice,
      profilePhotoUrl: doctor.profilePhotoUrl,
      verificationStatus: doctor.verificationStatus,
      rejectionReason: doctor.rejectionReason,
      createdAt: doctor.createdAt,
    };
  }

  /** Sanitize doctor for admin list (NO images for performance) */
  private sanitizeDoctorForAdmin(doctor: Doctor) {
    return {
      id: doctor.id,
      fullName: doctor.fullName,
      email: doctor.email,
      phone: doctor.phone,
      specialty: doctor.specialty,
      experience: doctor.experience,
      practicePlace: doctor.practicePlace,
      country: doctor.country,
      city: doctor.city,
      clinicAddress: doctor.clinicAddress,
      role: doctor.role,
      verificationStatus: doctor.verificationStatus,
      rejectionReason: doctor.rejectionReason,
      createdAt: doctor.createdAt,
    };
  }



  /** CREATE DOCTOR */
  async create(body: CreateDoctorDto, files: MulterFile[]) {
    const { password, email, ...rest } = body;

    const existingDoctor = await this.doctorRepository.findOneBy({ email });
    if (existingDoctor) throw new BadRequestException('Email already in use');

    const hashedPassword = await bcrypt.hash(password, 10);

    const uploadDir = path.join(__dirname, '../../uploads/doctors');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const licenceFile = files.find(f => f.fieldname === 'licenceImg');
    const identityFile = files.find(f => f.fieldname === 'identityImg');
    if (!licenceFile || !identityFile) {
      throw new BadRequestException('Both licence and identity images are required');
    }

    const licenceImgPath = path.join(uploadDir, `${Date.now()}-${licenceFile.originalname}`);
    const identityImgPath = path.join(uploadDir, `${Date.now()}-${identityFile.originalname}`);

    fs.writeFileSync(licenceImgPath, licenceFile.buffer);
    fs.writeFileSync(identityImgPath, identityFile.buffer);

    const doctor = this.doctorRepository.create({
      ...rest,
      password: hashedPassword,
      email,
      licenceImg: licenceImgPath,
      identityImg: identityImgPath,
      role: 'doctor',
      verificationStatus: VerificationStatus.PENDING_REVIEW,
    });

    const saved = await this.doctorRepository.save(doctor);
    return this.sanitizeDoctor(saved);
  }

  /** GET ALL DOCTORS (patient-facing — only APPROVED) */
  async findAll() {
    const doctors = await this.doctorRepository.find({
      where: { verificationStatus: VerificationStatus.APPROVED },
    });
    return doctors.map(d => this.sanitizeDoctor(d));
  }

  /** GET ONE DOCTOR */
  async findOne(id: number) {
    const doctor = await this.doctorRepository.findOneBy({ id });
    if (!doctor) throw new NotFoundException('Doctor not found');
    
    const sanitized = this.sanitizeDoctor(doctor);
    
    return sanitized;
  }

  /** UPDATE DOCTOR */
  async update(id: number, body: UpdateDoctorDto, files?: MulterFile[]) {
    const doctor = await this.doctorRepository.findOneBy({ id });
    if (!doctor) throw new NotFoundException(`Doctor with ID ${id} not found`);

    if (body.password) {
      if (body.password !== body.confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }
      body.password = await bcrypt.hash(body.password, 10);
      delete body.confirmPassword;
    }

    if (files && files.length > 0) {
      const uploadDir = path.join(__dirname, '../../uploads/doctors');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const licenceFile = files.find(f => f.fieldname === 'licenceImg');
      const identityFile = files.find(f => f.fieldname === 'identityImg');

      if (licenceFile) {
        const licenceImgPath = path.join(uploadDir, `${Date.now()}-${licenceFile.originalname}`);
        fs.writeFileSync(licenceImgPath, licenceFile.buffer);
        body.licenceImg = licenceImgPath;
      }

      if (identityFile) {
        const identityImgPath = path.join(uploadDir, `${Date.now()}-${identityFile.originalname}`);
        fs.writeFileSync(identityImgPath, identityFile.buffer);
        body.identityImg = identityImgPath;
      }
    }

    await this.doctorRepository.update(id, body);
    const updated = await this.doctorRepository.findOneBy({ id });
    if (!updated) throw new NotFoundException(`Doctor with ID ${id} not found`);
    return this.sanitizeDoctor(updated);
  }

  /** DELETE DOCTOR */
  async remove(id: number) {
    const doctor = await this.doctorRepository.findOneBy({ id });
    if (!doctor) throw new NotFoundException(`Doctor with ID ${id} not found`);

    await this.doctorRepository.delete(id);
    return { message: `Doctor with ID ${id} has been deleted` };
  }

  /** SEARCH DOCTOR BY FULL NAME */
  async findByFullName(fullName: string) {
    const doctors = await this.doctorRepository.find({
      where: { fullName: ILike(`%${fullName}%`) },
    });
    return doctors.map(d => this.sanitizeDoctor(d));
  }

  // ═══════════════════════════════════════════════════
  // ADMIN METHODS
  // ═══════════════════════════════════════════════════

  /** GET PENDING DOCTORS (admin — no images) */
  async findPending() {
    const doctors = await this.doctorRepository.find({
      where: { verificationStatus: VerificationStatus.PENDING_REVIEW },
      order: { createdAt: 'DESC' },
    });
    return doctors.map(d => this.sanitizeDoctorForAdmin(d));
  }

  /** GET ALL DOCTORS FOR ADMIN (with optional status filter, no images) */
  async findAllAdmin(status?: string) {
    const where: any = {};
    if (status && Object.values(VerificationStatus).includes(status as VerificationStatus)) {
      where.verificationStatus = status;
    }
    const doctors = await this.doctorRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return doctors.map(d => this.sanitizeDoctorForAdmin(d));
  }

  /** GET DOCTOR DOCUMENTS (admin — only images) */
  async getDoctorDocs(id: number) {
    const doctor = await this.doctorRepository.findOneBy({ id });
    if (!doctor) throw new NotFoundException('Doctor not found');

    let licenceImg = doctor.licenceImg || '';
    let identityImg = doctor.identityImg || '';

    // If the images are file paths, read and convert to base64
    if (licenceImg && !licenceImg.startsWith('data:') && fs.existsSync(licenceImg)) {
      const buffer = fs.readFileSync(licenceImg);
      licenceImg = buffer.toString('base64');
    }
    if (identityImg && !identityImg.startsWith('data:') && fs.existsSync(identityImg)) {
      const buffer = fs.readFileSync(identityImg);
      identityImg = buffer.toString('base64');
    }

    return { licenceImg, identityImg };
  }

  /** VERIFY OR REJECT A DOCTOR (admin) */
  async verifyDoctor(id: number, action: 'APPROVE' | 'REJECT', rejectionReason?: string) {
    const doctor = await this.doctorRepository.findOneBy({ id });
    if (!doctor) throw new NotFoundException(`Doctor with ID ${id} not found`);

    if (action === 'APPROVE') {
      doctor.verificationStatus = VerificationStatus.APPROVED;
      doctor.rejectionReason = null;
    } else if (action === 'REJECT') {
      if (!rejectionReason) {
        throw new BadRequestException('Rejection reason is required');
      }
      doctor.verificationStatus = VerificationStatus.REJECTED;
      doctor.rejectionReason = rejectionReason;
    } else {
      throw new BadRequestException('Invalid action. Must be APPROVE or REJECT');
    }

    const saved = await this.doctorRepository.save(doctor);
    return this.sanitizeDoctorForAdmin(saved);
  }

  /** SUSPEND A DOCTOR (admin) */
  async suspendDoctor(id: number) {
    const doctor = await this.doctorRepository.findOneBy({ id });
    if (!doctor) throw new NotFoundException(`Doctor with ID ${id} not found`);

    doctor.verificationStatus = VerificationStatus.SUSPENDED;
    const saved = await this.doctorRepository.save(doctor);
    return this.sanitizeDoctorForAdmin(saved);
  }
}


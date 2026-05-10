import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';

@ApiTags('Doctor Profiles (Gateway)')
@Controller('doctor-profiles')
export class GatewayDoctorProfileController {
  constructor(private readonly http: HttpService) {}

  private readonly baseUrl =
    process.env.DOCTOR_PROFILE_MS ;

  // -----------------------------
  // Helpers
  // -----------------------------
  private authHeader(headers: Record<string, any>) {
    return headers?.authorization || headers?.Authorization || '';
  }

  private rethrow(error: any, fallback = 'Erreur interne') {
    throw new HttpException(
      error?.response?.data || fallback,
      error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  // ===========================================================
  // ====================== CERTIFICATIONS =====================
  // ===========================================================

  @Post(':doctorId/certifications')
  @ApiOperation({ summary: 'Créer une certification' })
  async createCertification(
    @Param('doctorId') doctorId: string,
    @Body() body: any,
    @Headers() headers: Record<string, any>,
  ) {
    try {
      const res = await firstValueFrom(
        this.http.post(`${this.baseUrl}/${doctorId}/certifications`, body, {
          headers: {
            Authorization: this.authHeader(headers),
            'Content-Type': 'application/json',
          },
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrow(e, 'Erreur lors de la création de certification');
    }
  }

  @Get(':doctorId/certifications')
  @ApiOperation({ summary: 'Lister les certifications d’un docteur' })
  async getCertifications(
    @Param('doctorId') doctorId: string,
    @Headers() headers: Record<string, any>,
  ) {
    try {
      const res = await firstValueFrom(
        this.http.get(`${this.baseUrl}/${doctorId}/certifications`, {
          headers: { Authorization: this.authHeader(headers) },
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrow(e, 'Erreur lors de la récupération des certifications');
    }
  }

  // ===========================================================
  // ======================== LANGUAGES ========================
  // ===========================================================

  @Post(':doctorId/languages')
  @ApiOperation({ summary: 'Créer une langue' })
  async createLanguage(
    @Param('doctorId') doctorId: string,
    @Body() body: any,
    @Headers() headers: Record<string, any>,
  ) {
    try {
      const res = await firstValueFrom(
        this.http.post(`${this.baseUrl}/${doctorId}/languages`, body, {
          headers: {
            Authorization: this.authHeader(headers),
            'Content-Type': 'application/json',
          },
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrow(e, 'Erreur lors de la création de la langue');
    }
  }

  @Get(':doctorId/languages')
  @ApiOperation({ summary: 'Lister les langues d’un docteur' })
  async getLanguages(
    @Param('doctorId') doctorId: string,
    @Headers() headers: Record<string, any>,
  ) {
    try {
      const res = await firstValueFrom(
        this.http.get(`${this.baseUrl}/${doctorId}/languages`, {
          headers: { Authorization: this.authHeader(headers) },
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrow(e, 'Erreur lors de la récupération des langues');
    }
  }

  // ===========================================================
  // ========================= CLINICS =========================
  // ===========================================================

  @Post(':doctorId/clinics')
  @ApiOperation({ summary: 'Créer une clinique' })
  async createClinic(
    @Param('doctorId') doctorId: string,
    @Body() body: any,
    @Headers() headers: Record<string, any>,
  ) {
    try {
      const res = await firstValueFrom(
        this.http.post(`${this.baseUrl}/${doctorId}/clinics`, body, {
          headers: {
            Authorization: this.authHeader(headers),
            'Content-Type': 'application/json',
          },
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrow(e, 'Erreur lors de la création de la clinique');
    }
  }

  @Get(':doctorId/clinics')
  @ApiOperation({ summary: 'Lister les cliniques d’un docteur' })
  async getClinics(
    @Param('doctorId') doctorId: string,
    @Headers() headers: Record<string, any>,
  ) {
    try {
      const res = await firstValueFrom(
        this.http.get(`${this.baseUrl}/${doctorId}/clinics`, {
          headers: { Authorization: this.authHeader(headers) },
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrow(e, 'Erreur lors de la récupération des cliniques');
    }
  }

  // ===========================================================
  // ======================= OFFICE HOURS ======================
  // ===========================================================

  @Post(':doctorId/office-hours')
  @ApiOperation({ summary: 'Créer une disponibilité' })
  async createOfficeHour(
    @Param('doctorId') doctorId: string,
    @Body() body: any,
    @Headers() headers: Record<string, any>,
  ) {
    try {
      const res = await firstValueFrom(
        this.http.post(`${this.baseUrl}/${doctorId}/office-hours`, body, {
          headers: {
            Authorization: this.authHeader(headers),
            'Content-Type': 'application/json',
          },
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrow(e, 'Erreur lors de la création des horaires');
    }
  }

  @Get(':doctorId/office-hours')
  @ApiOperation({ summary: 'Lister les disponibilités d’un docteur' })
  async getOfficeHours(
    @Param('doctorId') doctorId: string,
    @Headers() headers: Record<string, any>,
  ) {
    try {
      const res = await firstValueFrom(
        this.http.get(`${this.baseUrl}/${doctorId}/office-hours`, {
          headers: { Authorization: this.authHeader(headers) },
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrow(e, 'Erreur lors de la récupération des horaires');
    }
  }

  // ===========================================================
  // ===================== FULL DOCTOR PROFILE =================
  // ===========================================================

  @Get(':doctorId')
  @ApiOperation({ summary: 'Obtenir le profil complet d’un docteur' })
  @ApiParam({ name: 'doctorId', description: 'Identifiant du docteur' })
  async getDoctorProfile(
    @Param('doctorId') doctorId: string,
    @Headers() headers: Record<string, any>,
  ) {
    try {
      const res = await firstValueFrom(
        this.http.get(`${this.baseUrl}/${doctorId}`, {
          headers: { Authorization: this.authHeader(headers) },
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrow(e, 'Erreur lors de la récupération du profil complet');
    }
  }
}

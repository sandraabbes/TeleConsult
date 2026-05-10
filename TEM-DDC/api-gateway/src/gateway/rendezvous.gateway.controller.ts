import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  HttpException,
  ParseIntPipe,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

function trimSlashEnd(s?: string) {
  return s ? s.replace(/\/+$/, '') : '';
}

@Controller('rendezvous') 
export class RendezvousGwController {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const service = process.env.RENDEZVOUS_SERVICE_URL || this.config.get<string>('RENDEZVOUS_SERVICE_URL');
    let base = trimSlashEnd(service);
    if (base && !base.endsWith('/rendezvous')) {
      base += '/rendezvous';
    }
    this.baseUrl = base;
  }

  private passHeaders(req: any) {
    const h = { ...(req?.headers || {}) };
    delete (h as any)['content-length'];
    return h;
  }

  /** Normalisation d’erreur (le front reçoit toujours { message, ... }) */
  private handleAxiosError(e: unknown): never {
    const err = e as AxiosError<any>;
    const status = err?.response?.status ?? 502;
    const data   = err?.response?.data;

    const message =
      (data && typeof data === 'object' && typeof data.message === 'string' && data.message) ||
      (Array.isArray(data?.message) ? data.message.join(', ') : undefined) ||
      (typeof data === 'string' ? data : undefined) ||
      data?.error ||
      data?.detail ||
      err?.message ||
      'Upstream error';

    const payload =
      data && typeof data === 'object'
        ? { ...data, message }
        : { message };

    throw new HttpException(payload, status);
  }

  /**
   * POST /api/rendezvous/users/:userId
   * - Si le front n’envoie pas `patientId`, on injecte `patientId = :userId` (UUID du user connecté).
   */
  @Post('users/:userId')
  async create(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    try {
      if (!('patientId' in body) || body.patientId == null) {
        body = { ...body, patientId: userId }; // ⬅️ UUID du patient connecté
      }
      const { data } = await firstValueFrom(
        this.http.post(this.baseUrl, body, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** PATCH /api/rendezvous/users/:userId/:id */
  @Patch('users/:userId/:id')
  async update(
    @Req() req: any,
    @Param('userId') _userId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.patch(`${this.baseUrl}/${id}`, body, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** POST /api/rendezvous/users/:userId/:id/cancel */
  @Post('users/:userId/:id/cancel')
  async cancel(
    @Req() req: any,
    @Param('userId') _userId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { doctorName?: string },
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/${id}/cancel`, body ?? {}, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** POST /api/rendezvous/:id/cancel (Fallback route for dashboard) */
  @Post(':id/cancel')
  async cancelFallback(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { doctorName?: string },
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/${id}/cancel`, body ?? {}, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** PATCH /api/rendezvous/users/:userId/:id/confirm */
  @Patch('users/:userId/:id/confirm')
  async confirm(
    @Req() req: any,
    @Param('userId') _userId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { doctorName?: string },
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.patch(`${this.baseUrl}/${id}/confirm`, body ?? {}, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** PATCH /api/rendezvous/:id/confirm (Fallback route for dashboard) */
  @Patch(':id/confirm')
  async confirmFallback(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { doctorName?: string },
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.patch(`${this.baseUrl}/${id}/confirm`, body ?? {}, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** PATCH /api/rendezvous/users/:userId/:id/accept */
  @Patch('users/:userId/:id/accept')
  async accept(
    @Req() req: any,
    @Param('userId') _userId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { doctorName?: string },
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.patch(`${this.baseUrl}/${id}/accept`, body ?? {}, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** PATCH /api/rendezvous/:id/accept (Fallback route for dashboard) */
  @Patch(':id/accept')
  async acceptFallback(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { doctorName?: string },
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.patch(`${this.baseUrl}/${id}/accept`, body ?? {}, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** POST /api/rendezvous/:id/doctor-ready */
  @Post(':id/doctor-ready')
  async doctorReady(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/${id}/doctor-ready`, body ?? {}, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** POST /api/rendezvous/:id/join */
  @Post(':id/join')
  async patientJoin(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/${id}/join`, body ?? {}, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** POST /api/rendezvous/:id/end */
  @Post(':id/end')
  async endConsultation(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/${id}/end`, body ?? {}, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** POST /api/rendezvous/:id/patient-ready */
  @Post(':id/patient-ready')
  async patientReady(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/${id}/patient-ready`, body ?? {}, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** POST /api/rendezvous/:id/request-reschedule */
  @Post(':id/request-reschedule')
  async requestReschedule(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/${id}/request-reschedule`, body ?? {}, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** POST /api/rendezvous/:id/accept-reschedule */
  @Post(':id/accept-reschedule')
  async acceptReschedule(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/${id}/accept-reschedule`, body ?? {}, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** POST /api/rendezvous/:id/decline-reschedule */
  @Post(':id/decline-reschedule')
  async declineReschedule(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/${id}/decline-reschedule`, body ?? {}, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** PATCH /api/rendezvous/:id — partial update (reschedule times, status, etc.) */
  @Patch(':id')
  async updateById(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.patch(`${this.baseUrl}/${id}`, body, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /* ===================== LISTES ===================== */

  /**
   * GET /api/rendezvous
   * Filtres pass-through possibles : ?patientId= (string UUID), ?medecinId= (number), etc.
   */
  @Get()
  async findAll(@Req() req: any, @Query() query: any) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(this.baseUrl, { headers: this.passHeaders(req), params: query }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** GET /api/rendezvous/:id */
  @Get(':id')
  async findOne(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/${id}`, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** GET /api/rendezvous/users/:userId/medecin  → MS: /rendezvous/medecin/:id */
  @Get('users/:userId/medecin')
  async findByMedecin(
    @Req() req: any,
    @Param('userId') medecinId: string,
    @Query() query: any,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/medecin/${encodeURIComponent(medecinId)}`, {
          headers: this.passHeaders(req),
          params: query,
        }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** GET /api/rendezvous/medecin/:id (Fallback route for doctor dashboard)  → MS: /rendezvous/medecin/:id */
  @Get('medecin/:id')
  async findByMedecinFallback(
    @Req() req: any,
    @Param('id') medecinId: string,
    @Query() query: any,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/medecin/${encodeURIComponent(medecinId)}`, {
          headers: this.passHeaders(req),
          params: query,
        }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /**
   * GET /api/rendezvous/users/:userId/patient
   * → MS: /rendezvous/patient/:patientId (string/UUID)  **ou** via query ?patientId=
   * On choisit l’endpoint dédié pour être explicite.
   */
  @Get('users/:userId/patient')
  async findByPatient(
    @Req() req: any,
    @Param('userId') patientId: string, // UUID
    @Query() query: any,
  ) {
    try {
      const url = `${this.baseUrl}/patient/${encodeURIComponent(patientId)}`;
      const { data } = await firstValueFrom(
        this.http.get(url, { headers: this.passHeaders(req), params: query }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  /** Raccourcis business (inchangés) */

  @Get('users/:userId/confirmed/:period')
  async confirmed(
    @Req() req: any,
    @Param('userId') _userId: string,
    @Param('period') period: 'today' | 'week' | 'month',
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/confirmed/${period}`, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  @Get('users/:userId/scheduled/:period')
  async scheduled(
    @Req() req: any,
    @Param('userId') _userId: string,
    @Param('period') period: 'today' | 'week' | 'month',
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/scheduled/${period}`, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }

  @Get('users/:userId/rescheduled/:period')
  async rescheduled(
    @Req() req: any,
    @Param('userId') _userId: string,
    @Param('period') period: 'today' | 'week' | 'month',
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/rescheduled/${period}`, { headers: this.passHeaders(req) }),
      );
      return data;
    } catch (e) { this.handleAxiosError(e); }
  }
}

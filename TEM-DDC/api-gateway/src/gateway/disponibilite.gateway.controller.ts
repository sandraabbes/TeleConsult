import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const trim = (s?: string) => (s ? s.replace(/\/+$/, '') : '');

@Controller() // → /api/disponibilites/* et /api/work-schedule/*
export class DisponibiliteGatewayController {
  private readonly logger = new Logger(DisponibiliteGatewayController.name);

  // Pointent vers le MS Disponibilité (contrôleur 'disponibilite') et Work-Schedule
  private readonly msDispoBase = trim(process.env.DISPONIBILITE_SERVICE_URL);
  private readonly msWsBase = trim(process.env.WORK_SCHEDULE_SERVICE_URL);

  constructor(private readonly http: HttpService) {}

  private boom(error: any, fallback: string, code = HttpStatus.BAD_GATEWAY) {
    const status = error?.response?.status || code;
    const data = error?.response?.data || fallback;
    this.logger.error(`[GW] Error: status=${status} data=${JSON.stringify(data)}`);
    throw new HttpException(data, status);
  }

  /* ===================== Disponibilités ===================== */

  @Get('disponibilites/:doctorId/check')
  async checkDisponibilite(
    @Param('doctorId') doctorId: string,
    @Query('date') date: string,
    @Query('time') time: string,
    @Headers() headers: Record<string, string>,
  ) {
    try {
      const url = `${this.msDispoBase}/${doctorId}/check`;
      this.logger.log(`[GW] → GET ${url}?date=${date}&time=${time}`);
      const { data } = await firstValueFrom(
        this.http.get(url, { headers, params: { date, time } }),
      );
      return data;
    } catch (e) {
      this.boom(e, 'Failed to check availability');
    }
  }

  @Post('disponibilites/create')
  async createManual(@Body() dto: any, @Headers() headers: Record<string, string>) {
    try {
      const url = `${this.msDispoBase}/create`;
      this.logger.log(`[GW] → POST ${url}`);
      const { data } = await firstValueFrom(this.http.post(url, dto, { headers }));
      return data;
    } catch (e) {
      this.boom(e, 'Failed to create availability');
    }
  }

  @Get('disponibilites/:medecinId')
  async findByDoctor(
    @Param('medecinId') medecinId: string,
    @Headers() headers: Record<string, string>,
  ) {
    try {
      const url = `${this.msDispoBase}/${medecinId}`;
      this.logger.log(`[GW] → GET ${url}`);
      const { data } = await firstValueFrom(this.http.get(url, { headers }));
      return data;
    } catch (e) {
      this.boom(e, 'Failed to fetch doctor availabilities');
    }
  }

  @Get('disponibilites/:medecinId/available-slots/:date')
  async getAvailableSlots(
    @Param('medecinId') medecinId: string,
    @Param('date') date: string,
    @Headers() headers: Record<string, string>,
  ) {
    try {
      const url = `${this.msDispoBase}/${medecinId}/available-slots/${encodeURIComponent(
        date,
      )}`;
      this.logger.log(`[GW] → GET ${url}`);
      const { data } = await firstValueFrom(this.http.get(url, { headers }));
      return data;
    } catch (e) {
      this.boom(e, 'Failed to fetch available slots');
    }
  }

  @Post('disponibilites/initialize-slots')
  async initializeSlots(@Body() dto: any, @Headers() headers: Record<string, string>) {
    try {
      const url = `${this.msDispoBase}/initialize-slots`;
      this.logger.log(`[GW] → POST ${url}`);
      const { data } = await firstValueFrom(this.http.post(url, dto, { headers }));
      return data;
    } catch (e) {
      this.boom(e, 'Failed to initialize slots');
    }
  }

  @Post('disponibilites/mark-unavailable')
  async markUnavailable(@Body() dto: any, @Headers() headers: Record<string, string>) {
    try {
      const url = `${this.msDispoBase}/mark-unavailable`;
      this.logger.log(`[GW] → POST ${url}`);
      const { data } = await firstValueFrom(this.http.post(url, dto, { headers }));
      return data;
    } catch (e) {
      this.boom(e, 'Failed to mark unavailable');
    }
  }

  @Post('disponibilites/mark-available')
  async markAvailable(@Body() dto: any, @Headers() headers: Record<string, string>) {
    try {
      const url = `${this.msDispoBase}/mark-available`;
      this.logger.log(`[GW] → POST ${url}`);
      const { data } = await firstValueFrom(this.http.post(url, dto, { headers }));
      return data;
    } catch (e) {
      this.boom(e, 'Failed to mark available');
    }
  }

  @Post('disponibilites/mark-slots-available')
  async markSlotsAvailable(@Body() dto: any, @Headers() headers: Record<string, string>) {
    try {
      const url = `${this.msDispoBase}/mark-slots-available`;
      this.logger.log(`[GW] → POST ${url}`);
      const { data } = await firstValueFrom(this.http.post(url, dto, { headers }));
      return data;
    } catch (e) {
      this.boom(e, 'Failed to mark slots available');
    }
  }

  @Post('disponibilites/mark-slots-unavailable')
  async markSlotsUnavailable(@Body() dto: any, @Headers() headers: Record<string, string>) {
    try {
      const url = `${this.msDispoBase}/mark-slots-unavailable`;
      this.logger.log(`[GW] → POST ${url}`);
      const { data } = await firstValueFrom(this.http.post(url, dto, { headers }));
      return data;
    } catch (e) {
      this.boom(e, 'Failed to mark slots unavailable');
    }
  }

  @Put('disponibilites/:id')
  async updateDispo(
    @Param('id') id: string,
    @Body() dto: any,
    @Headers() headers: Record<string, string>,
  ) {
    try {
      const url = `${this.msDispoBase}/${id}`;
      this.logger.log(`[GW] → PUT ${url}`);
      const { data } = await firstValueFrom(this.http.put(url, dto, { headers }));
      return data;
    } catch (e) {
      this.boom(e, 'Failed to update availability');
    }
  }

  @Delete('disponibilites/:id')
  async deleteDispo(@Param('id') id: string, @Headers() headers: Record<string, string>) {
    try {
      const url = `${this.msDispoBase}/${id}`;
      this.logger.log(`[GW] → DELETE ${url}`);
      const { data } = await firstValueFrom(this.http.delete(url, { headers }));
      return data;
    } catch (e) {
      this.boom(e, 'Failed to delete availability');
    }
  }

  /* ===================== Work Schedule ===================== */

  @Get('work-schedule/:medecinId')
  async getSchedules(
    @Param('medecinId') medecinId: string,
    @Headers() headers: Record<string, string>,
  ) {
    try {
      const url = `${this.msWsBase}/${medecinId}`;
      this.logger.log(`[GW] → GET ${url}`);
      const { data } = await firstValueFrom(this.http.get(url, { headers }));
      return data;
    } catch (e) {
      this.boom(e, 'Failed to fetch work schedule');
    }
  }

  @Post('work-schedule/:medecinId')
  async setSchedules(
    @Param('medecinId') medecinId: string,
    @Body() schedules: any[],
    @Headers() headers: Record<string, string>,
  ) {
    try {
      const url = `${this.msWsBase}/${medecinId}`;
      this.logger.log(`[GW] → POST ${url}`);
      const { data } = await firstValueFrom(this.http.post(url, schedules, { headers }));
      return data;
    } catch (e) {
      this.boom(e, 'Failed to set work schedule');
    }
  }

  @Delete('work-schedule/:medecinId')
  async deleteSchedules(
    @Param('medecinId') medecinId: string,
    @Headers() headers: Record<string, string>,
  ) {
    try {
      const url = `${this.msWsBase}/${medecinId}`;
      this.logger.log(`[GW] → DELETE ${url}`);
      const { data } = await firstValueFrom(this.http.delete(url, { headers }));
      return data;
    } catch (e) {
      this.boom(e, 'Failed to delete work schedule');
    }
  }
}

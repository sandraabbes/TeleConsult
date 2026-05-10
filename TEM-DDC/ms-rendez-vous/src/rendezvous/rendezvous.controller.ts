// import { UpdateRendezvousDto } from './dto/update-rendezvous.dto/update-rendezvous.dto';
// import {
//   Body,
//   Controller,
//   Post,
//   Patch,
//   Param,
//   ParseIntPipe,
//   Get,
// } from '@nestjs/common';
// import {
//   ApiTags,
//   ApiOperation,
//   ApiResponse,
//   ApiBody,
//   ApiParam,
// } from '@nestjs/swagger';
// import { CreateRendezvousDto } from '../rendezvous/dto/create-rendezvous.dto/create-rendezvous.dto';
// import { RendezvousService } from './rendezvous.service';


// @ApiTags('Rendez-vous')
// @Controller('rendezvous')
// export class RendezvousController {
//   constructor(private readonly service: RendezvousService) {}

//   @ApiOperation({ summary: 'Créer un nouveau rendez-vous' })
//   @ApiResponse({ status: 201, description: 'Rendez-vous créé avec succès' })
//   @ApiBody({ type: CreateRendezvousDto })
//   @Post()
//   async create(@Body() createDto: CreateRendezvousDto) {
//     return this.service.create(createDto);
//   }

//   @ApiOperation({ summary: 'Mettre à jour un rendez-vous' })
//   @ApiParam({ name: 'id', description: 'ID du rendez-vous', type: Number })
//   @ApiResponse({ status: 200, description: 'Rendez-vous mis à jour avec succès' })
//   @ApiResponse({ status: 404, description: 'Rendez-vous not found' })
//   @ApiBody({ type: UpdateRendezvousDto })
//   @Patch(':id')
//   async update(
//     @Param('id', ParseIntPipe) id: number,
//     @Body() updateDto: UpdateRendezvousDto
//   ) {
//     return this.service.update(id, updateDto);
//   }

//   @ApiOperation({ summary: 'Supprimer un rendez-vous' })
//   @ApiParam({ name: 'id', description: 'ID du rendez-vous', type: Number })
//   @ApiResponse({ status: 200, description: 'Rendez-vous supprimé avec succès' })
//   @ApiResponse({ status: 404, description: 'Rendez-vous not found'})
//   @Post(':id/cancel')
//   async cancel(@Param('id', ParseIntPipe) id: number) {
//     return this.service.cancel(id);
//   }

//   @ApiOperation({ summary: 'Confirmer un rendez-vous' })
//   @ApiParam({ name: 'id', description: 'ID du rendez-vous à confirmer', type: Number })
//   @ApiResponse({
//     status: 200,
//     description: 'Rendez-vous confirmé avec succès',
//     schema: {
//       type: 'object',
//       properties: {
//         id: { type: 'number', example: 1 },
//         medecinId: { type: 'number', example: 1 },
//         patientId: { type: 'number', example: 1 },
//         startTime: { type: 'string', format: 'date-time', example: '2023-01-01T14:00:00Z' },
//         endTime: { type: 'string', format: 'date-time', example: '2023-01-01T14:30:00Z' },
//         status: { type: 'string', example: 'confirmed' },
//         type: { type: 'string', example: 'standard' }
//       }
//     }
//   })
//   @ApiResponse({ status: 404, description: 'Rendez-vous not found' })
//   @ApiResponse({ status: 400, description: 'Rendez-vous cannot be confirmed (invalid status)' })
//   @Patch(':id/confirm')
//   async confirm(@Param('id', ParseIntPipe) id: number) {
//     return this.service.confirm(id);
//   }

//   @ApiOperation({ summary: 'Tous les rendez vous' })
//   @ApiResponse({ status: 200, description: 'Liste de tous les rendez-vous' })
// @Get()
// async findByStatus() {
//   console.log('Fetching scheduled rendezvous');
//   //return this.service.findByStatus(RendezvousStatus.SCHEDULED);
//   return this.service.findAll();

// }
// @Get('confirmed/today')
//   findConfirmedToday() {
//     return this.service.findConfirmedToday();
//   }

//   @Get('confirmed/week')
//   findConfirmedThisWeek() {
//     return this.service.findConfirmedThisWeek();
//   }

//   @Get('confirmed/month')
//   findConfirmedThisMonth() {
//     return this.service.findConfirmedThisMonth();
//   }

//   @Get('scheduled/today')
//   findScheduledToday() {
//     return this.service.findScheduledToday();
//   }

//   @Get('scheduled/week')
//   findScheduledThisWeek() {
//     return this.service.findScheduledThisWeek();
//   }

//   @Get('scheduled/month')
//   findScheduledThisMonth() {
//     return this.service.findScheduledThisMonth();
//   }

//   @Get('rescheduled/today')
//   findRescheduledToday() {
//     return this.service.findRescheduledToday();
//   }

//   @Get('rescheduled/week')
//   findRescheduledThisWeek() {
//     return this.service.findRescheduledThisWeek();
//   }

//   @Get('rescheduled/month')
//   findRescheduledThisMonth() {
//     return this.service.findRescheduledThisMonth();
//   }
  
// }

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RendezvousService } from './rendezvous.service';
import { CreateRendezvousDto } from './dto/create-rendezvous.dto/create-rendezvous.dto';
import { UpdateRendezvousDto } from './dto/update-rendezvous.dto/update-rendezvous.dto';

@ApiTags('Rendez-vous')
@Controller('rendezvous')
export class RendezvousController {
  constructor(private readonly service: RendezvousService) {}

  /* ======================= CRUD ======================= */

  @ApiOperation({ summary: 'Créer un nouveau rendez-vous' })
  @ApiBody({ type: CreateRendezvousDto })
  @Post()
  create(@Body() dto: CreateRendezvousDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: 'Obtenir un rendez-vous par ID' })
  @ApiParam({ name: 'id', type: Number })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Mettre à jour un rendez-vous' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateRendezvousDto })
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRendezvousDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Annuler un rendez-vous' })
  @ApiParam({ name: 'id', type: Number })
  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Body() body?: { doctorName?: string }) {
    return this.service.cancel(id, body?.doctorName);
  }

  @ApiOperation({ summary: 'Confirmer un rendez-vous' })
  @ApiParam({ name: 'id', type: Number })
  @Patch(':id/confirm')
  confirm(@Param('id', ParseIntPipe) id: number, @Body() body?: { doctorName?: string }) {
    return this.service.confirm(id, body?.doctorName);
  }

  @ApiOperation({ summary: 'Accepter un rendez-vous (passe de PENDING à SCHEDULED)' })
  @ApiParam({ name: 'id', type: Number })
  @Patch(':id/accept')
  accept(@Param('id', ParseIntPipe) id: number, @Body() body?: { doctorName?: string }) {
    return this.service.accept(id, body?.doctorName);
  }

  /* ============== Listing & filtres =================== */

 @ApiOperation({ summary: 'Lister les rendez-vous (filtres optionnels)' })
  @ApiQuery({ name: 'patientId', required: false, type: String, description: 'UUID patient' })
  @ApiQuery({ name: 'medecinId', required: false, type: Number })
  @Get()
  async findAll(
    @Query('patientId') patientId?: string,
    @Query('medecinId') medecinId?: string | number,
  ) {
    // Auto-decline expired reschedule requests (check-on-read)
    await this.service.autoDeclineExpiredReschedules().catch(() => {});

    const filters: { patientId?: string; medecinId?: number } = {};
    
    // ✅ patientId reste string (UUID)
    if (patientId) {
      filters.patientId = String(patientId).trim();
    }
    
    // ✅ medecinId converti en number
    if (medecinId != null) {
      const mid = Number(medecinId);
      if (Number.isFinite(mid) && mid > 0) {
        filters.medecinId = mid;
      }
    }
    
    return this.service.findAll(filters);
  }

  // GET /rendezvous/patient/:patientId   (UUID string)
  @ApiOperation({ summary: 'Lister les RDV d’un patient (UUID)' })
  @ApiParam({ name: 'patientId', type: String })
  @Get('patient/:patientId')
  findByPatient(@Param('patientId') patientId: string) {
    return this.service.findAll({ patientId });
  }

  // GET /rendezvous/medecin/:medecinId   (number)
  @ApiOperation({ summary: 'Lister les RDV d’un médecin' })
  @ApiParam({ name: 'medecinId', type: Number })
  @Get('medecin/:medecinId')
  findByMedecin(@Param('medecinId', ParseIntPipe) medecinId: number) {
    return this.service.findAll({ medecinId });
  }

  /* ============== Raccourcis business ================= */

  @Get('confirmed/today')   confirmedToday()   { return this.service.findConfirmedToday(); }
  @Get('confirmed/week')    confirmedWeek()    { return this.service.findConfirmedThisWeek(); }
  @Get('confirmed/month')   confirmedMonth()   { return this.service.findConfirmedThisMonth(); }

  @Get('scheduled/today')   scheduledToday()   { return this.service.findScheduledToday(); }
  @Get('scheduled/week')    scheduledWeek()    { return this.service.findScheduledThisWeek(); }
  @Get('scheduled/month')   scheduledMonth()   { return this.service.findScheduledThisMonth(); }

  @Get('rescheduled/today') rescheduledToday() { return this.service.findRescheduledToday(); }
  @Get('rescheduled/week')  rescheduledWeek()  { return this.service.findRescheduledThisWeek(); }
  @Get('rescheduled/month') rescheduledMonth() { return this.service.findRescheduledThisMonth(); }

  @Post('confirm-after-payment')
  confirmAfterPaymentHttp(@Body() body: { rendezvousId: number }) {
    return this.service.confirmAfterPayment(body.rendezvousId);
  }

  @EventPattern('confirm_appointment_after_payment')
  handleConfirmAfterPayment(data: { rendezvousId: number }) {
    return this.service.confirmAfterPayment(data.rendezvousId);
  }

  @ApiOperation({ summary: 'Doctor marks themselves as ready in waiting room' })
  @ApiParam({ name: 'id', type: Number })
  @Post(':id/doctor-ready')
  doctorReady(@Param('id', ParseIntPipe) id: number, @Body() body: { medecinId: number }) {
    return this.service.doctorReadyForConsultation(id, body.medecinId);
  }

  @ApiOperation({ summary: 'Patient joins the consultation (payment gate)' })
  @ApiParam({ name: 'id', type: Number })
  @Post(':id/join')
  patientJoin(@Param('id', ParseIntPipe) id: number) {
    return this.service.patientJoinConsultation(id);
  }

  @ApiOperation({ summary: 'End the consultation' })
  @ApiParam({ name: 'id', type: Number })
  @Post(':id/end')
  endConsultation(@Param('id', ParseIntPipe) id: number) {
    return this.service.endConsultation(id);
  }

  /* ============== Patient Waiting Room ================= */

  @ApiOperation({ summary: 'Patient marks themselves as present in waiting room' })
  @ApiParam({ name: 'id', type: Number })
  @Post(':id/patient-ready')
  patientReady(@Param('id', ParseIntPipe) id: number, @Body() body: { patientId: string }) {
    return this.service.patientJoinWaitingRoom(id, body.patientId);
  }

  /* ============== Reschedule Request ================= */

  @ApiOperation({ summary: 'Patient requests a reschedule (proposes new time)' })
  @ApiParam({ name: 'id', type: Number })
  @Post(':id/request-reschedule')
  requestReschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { proposedStartTime: string; proposedEndTime: string },
  ) {
    return this.service.requestReschedule(id, body.proposedStartTime, body.proposedEndTime);
  }

  @ApiOperation({ summary: 'Doctor accepts a reschedule request' })
  @ApiParam({ name: 'id', type: Number })
  @Post(':id/accept-reschedule')
  acceptReschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { doctorName?: string },
  ) {
    return this.service.acceptReschedule(id, body?.doctorName);
  }

  @ApiOperation({ summary: 'Doctor declines a reschedule request' })
  @ApiParam({ name: 'id', type: Number })
  @Post(':id/decline-reschedule')
  declineReschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { doctorName?: string },
  ) {
    return this.service.declineReschedule(id, body?.doctorName);
  }
}

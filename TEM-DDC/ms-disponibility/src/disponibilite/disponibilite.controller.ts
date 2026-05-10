/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Param, BadRequestException, Query, Logger } from '@nestjs/common';
import { DisponibiliteService } from './disponibilite.service';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateDisponibiliteDto } from '../disponibilite/dto/create-disponibilite.dto/create-disponibilite.dto';
import { InitializeSlotsDto } from '../disponibilite/dto/initialize-slots.dto/initialize-slots.dto';

@ApiTags('Disponibilité')
@Controller('disponibilite')
export class DisponibiliteController {
  private readonly logger = new Logger(DisponibiliteController.name);  // ✅ Ajout du logger

  constructor(private readonly service: DisponibiliteService) { }

  @Post('initialize-slots')
  @ApiOperation({ summary: 'Initialize time slots for a doctor' })
  @ApiBody({ type: InitializeSlotsDto })
  @ApiResponse({
    status: 201,
    description: 'Slots initialized successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          isAvailable: { type: 'boolean' },
        },
      },
    },
  })
  async initializeSlots(@Body() initializeSlotsDto: InitializeSlotsDto) {
    return this.service.initializeSlots(
      initializeSlotsDto.medecinId,
      new Date(initializeSlotsDto.date),
      initializeSlotsDto.slotDuration
    );
  }

  @Post('mark-unavailable')
  @ApiOperation({ summary: 'Mark a time range as unavailable' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        medecinId: { type: 'number' },
        start: { type: 'string', format: 'date-time' },
        end: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Time range marked as unavailable' })
  async markUnavailable(
    @Body() body: { medecinId: number; start: Date; end: Date },
  ) {
    return this.service.markTimeRangeUnavailable(
      body.medecinId,
      body.start,
      body.end,
    );
  }

  @Post('mark-available')
  @ApiOperation({ summary: 'Mark a time range as available' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        medecinId: { type: 'number' },
        start: { type: 'string', format: 'date-time' },
        end: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Time range marked as available' })
  async markAvailable(
    @Body() body: { medecinId: number; start: Date; end: Date },
  ) {
    return this.service.markTimeRangeAvailable(
      body.medecinId,
      body.start,
      body.end,
    );
  }

  @Post('mark-slots-available')
  @ApiOperation({ summary: 'Mark specific slots as available' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        medecinId: { type: 'number' },
        slots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start: { type: 'string', format: 'date-time' },
              end: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Slots marked as available' })
  async markSlotsAvailable(@Body() body: { medecinId: number; slots: { start: string; end: string }[] }) {
    const results = await Promise.all(
      body.slots.map((slot) =>
        this.service.markSlotAsAvailable(body.medecinId, new Date(slot.start), new Date(slot.end)),
      ),
    );

    const updatedCount = results.reduce((sum, r) => sum + r.affectedSlots, 0);
    return { updatedCount, results };
  }

  @Post('mark-slots-unavailable')
  @ApiOperation({ summary: 'Mark specific slots as unavailable' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        medecinId: { type: 'number' },
        slots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start: { type: 'string', format: 'date-time' },
              end: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Slots marked as unavailable' })
  async markSlotsUnavailable(@Body() body: { medecinId: number; slots: { start: string; end: string }[] }) {
    const results = await Promise.all(
      body.slots.map((slot) =>
        this.service.markSlotAsUnavailable(body.medecinId, new Date(slot.start), new Date(slot.end)),
      ),
    );

    const updatedCount = results.reduce((sum, r) => sum + r.affectedSlots, 0);
    return { updatedCount, results };
  }

  // ✅ MÉTHODE CORRIGÉE AVEC LOGS DE DEBUG
  @Get(':medecinId/available-slots/:date')
  @ApiOperation({ summary: 'Get available slots for a doctor on a specific date' })
  @ApiParam({ name: 'medecinId', type: Number })
  @ApiParam({ name: 'date', type: String, description: 'Date in YYYY-MM-DD format' })
  @ApiResponse({ status: 200, description: 'List of available slots' })
  async getAvailableSlots(
    @Param('medecinId') medecinIdStr: string,  // ✅ Reçu comme string
    @Param('date') dateStr: string,
  ) {
    // ✅ Logs de debug
    this.logger.log('='.repeat(60));
    this.logger.log(`[getAvailableSlots] Called with:`);
    this.logger.log(`  medecinId (raw): "${medecinIdStr}" (type: ${typeof medecinIdStr})`);
    this.logger.log(`  date (raw): "${dateStr}" (type: ${typeof dateStr})`);

    // ✅ Convertir medecinId en number
    const medecinId = parseInt(medecinIdStr, 10);
    if (isNaN(medecinId)) {
      throw new BadRequestException(`Invalid medecinId: ${medecinIdStr}`);
    }
    this.logger.log(`  medecinId (parsed): ${medecinId} (type: ${typeof medecinId})`);

    // ✅ Valider le format de date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      throw new BadRequestException(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
    }

    // ✅ Créer le Date object (avec timezone UTC pour éviter les problèmes)
    const date = new Date(dateStr + 'T00:00:00.000Z');
    this.logger.log(`  date (parsed): ${date.toISOString()}`);

    if (isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date: ${dateStr}`);
    }

    // ✅ Appeler le service
    this.logger.log(`[getAvailableSlots] Calling service.findAvailableSlots(${medecinId}, ${date.toISOString()})`);
    const slots = await this.service.findAvailableSlots(medecinId, date);

    // ✅ Logs du résultat
    this.logger.log(`[getAvailableSlots] Service returned ${slots.length} slots`);
    if (slots.length > 0) {
      this.logger.log(`[getAvailableSlots] First slot:`, JSON.stringify(slots[0]));
    } else {
      this.logger.warn(`[getAvailableSlots] ⚠️ No slots found! Check the service method.`);
    }
    this.logger.log('='.repeat(60));

    return slots;
  }

  @Post('create')
  @ApiOperation({ summary: 'Create a specific availability slot' })
  @ApiBody({ type: CreateDisponibiliteDto })
  @ApiResponse({ status: 201, description: 'Slot created successfully' })
  async create(@Body() createDisponibiliteDto: CreateDisponibiliteDto) {
    return this.service.create(createDisponibiliteDto);
  }

  @Get(':medecinId/check')
  async check(
    @Param('medecinId') medecinId: number,
    @Query('date') date: string,
    @Query('time') time: string,
  ) {
    return this.service.checkAvailability(medecinId, date, time);
  }
}
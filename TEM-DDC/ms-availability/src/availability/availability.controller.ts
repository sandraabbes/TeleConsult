import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from 'src/availability/dto/create-availability.dto';
import { MarkTimeRangeDto } from 'src/availability/dto/mark-time-range.dto'; 
import { MarkDayDto } from 'src/availability/dto/mark-day.dto';

@ApiTags('Availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // ✅ Créer un créneau
  @ApiOperation({ summary: 'Create a single availability slot' })
  @ApiResponse({ status: 201, description: 'Slot created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @Post()
  async create(@Body() dto: CreateAvailabilityDto) {
    try {
      return await this.availabilityService.create(dto);
    } catch (error) {
      throw new HttpException(
        `Failed to create slot: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ✅ Initialiser les créneaux par défaut
  @ApiOperation({ summary: 'Initialize daily availability slots' })
  @ApiParam({ name: 'doctorId', type: 'integer', example: 1 })
  @Post('init/:doctorId')
  async initializeSlots(@Param('doctorId') doctorId: string) {
    const id = parseInt(doctorId, 10);
    if (isNaN(id)) throw new HttpException('Invalid doctorId', HttpStatus.BAD_REQUEST);

    const today = new Date().toISOString().split('T')[0];
    const blocks = [
      { start: '09:00', end: '12:00', duration: 30 },
      { start: '14:00', end: '18:00', duration: 30 },
    ];

    return this.availabilityService.initializeSlotsWithBlocks(id, today, blocks);
  }

  // ✅ Récupérer les slots disponibles
  @ApiOperation({ summary: 'Get available slots for a doctor' })
  @ApiParam({ name: 'doctorId', type: 'integer', example: 1 })
  @ApiParam({ name: 'date', type: 'string', example: '2025-08-29' })
  @Get(':doctorId/:date')
  async findAvailableSlots(
    @Param('doctorId') doctorId: string,
    @Param('date') date: string,
  ) {
    const id = parseInt(doctorId, 10);
    if (isNaN(id)) throw new HttpException('Invalid doctorId', HttpStatus.BAD_REQUEST);

    return this.availabilityService.findAvailableSlots(id, date);
  }

  // ✅ Marquer une plage indisponible
  @ApiOperation({ summary: 'Mark time range as unavailable' })
  @ApiParam({ name: 'doctorId', type: 'integer', example: 1 })
  @ApiBody({ type: MarkTimeRangeDto })
  @Post(':doctorId/unavailable')
  async markUnavailable(
    @Param('doctorId') doctorId: string,
    @Body() dto: MarkTimeRangeDto,
  ) {
    const id = parseInt(doctorId, 10);
    if (isNaN(id)) throw new HttpException('Invalid doctorId', HttpStatus.BAD_REQUEST);

    return this.availabilityService.markTimeRangeUnavailable(
      id,
      new Date(`${dto.date}T${dto.startTime}:00.000Z`),
      new Date(`${dto.date}T${dto.endTime}:00.000Z`),
    );
  }

  // ✅ Marquer une plage disponible
  @ApiOperation({ summary: 'Mark time range as available' })
  @ApiParam({ name: 'doctorId', type: 'integer', example: 1 })
  @ApiBody({ type: MarkTimeRangeDto })
  @Post(':doctorId/available')
  async markAvailable(
    @Param('doctorId') doctorId: string,
    @Body() dto: MarkTimeRangeDto,
  ) {
    const id = parseInt(doctorId, 10);
    if (isNaN(id)) throw new HttpException('Invalid doctorId', HttpStatus.BAD_REQUEST);

    return this.availabilityService.markTimeRangeAvailable(
      id,
      new Date(`${dto.date}T${dto.startTime}:00.000Z`),
      new Date(`${dto.date}T${dto.endTime}:00.000Z`),
    );
  }

  // ✅ Marquer toute la journée indisponible
  @ApiOperation({ summary: 'Mark entire day as unavailable' })
  @ApiParam({ name: 'doctorId', type: 'integer', example: 1 })
  @ApiBody({ type: MarkDayDto })
  @Post(':doctorId/day-unavailable')
  async markDayUnavailable(
    @Param('doctorId') doctorId: string,
    @Body() dto: MarkDayDto,
  ) {
    const id = parseInt(doctorId, 10);
    return this.availabilityService.markDayUnavailable(id, dto.date);
  }

  // ✅ Marquer toute la journée disponible
  @ApiOperation({ summary: 'Mark entire day as available' })
  @ApiParam({ name: 'doctorId', type: 'integer', example: 1 })
  @ApiBody({ type: MarkDayDto })
  @Post(':doctorId/day-available')
  async markDayAvailable(
    @Param('doctorId') doctorId: string,
    @Body() dto: MarkDayDto,
  ) {
    const id = parseInt(doctorId, 10);
    return this.availabilityService.markDayAvailable(id, dto.date);
  }
}

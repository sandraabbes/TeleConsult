import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  Get,
  
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { WorkScheduleService } from './work-schedule.service';
import { WorkScheduleEntity } from '../disponibilite/entities/work-schedule.entity/work-schedule.entity';
@ApiTags('Work Schedule')
@Controller('work-schedule')
export class WorkScheduleController {
  constructor(private readonly service: WorkScheduleService) {}

  @Post(':medecinId')
  @ApiOperation({ summary: 'Create or update work schedule for a doctor' })
  @ApiParam({ name: 'medecinId', type: Number })
  @ApiBody({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dayOfWeek: { type: 'number', example: 1 },
          startTime: { type: 'string', example: '09:00' },
          endTime: { type: 'string', example: '17:00' },
          slotDuration: { type: 'number', example: 30 },
        },
        required: ['dayOfWeek', 'startTime', 'endTime'],
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Work schedule saved' })
  async setSchedules(
    @Param('medecinId') medecinId: number,
    @Body() schedules: Partial<WorkScheduleEntity>[],
  ) {
    return this.service.createOrUpdate(medecinId, schedules);
  }

  @Get(':medecinId')
  @ApiOperation({ summary: 'Get work schedule for a doctor' })
  @ApiParam({ name: 'medecinId', type: Number })
  @ApiResponse({ status: 200, description: 'Work schedule found' })
  getSchedules(@Param('medecinId') medecinId: number) {
    return this.service.getWorkSchedule(medecinId);
  }

  @Delete(':medecinId')
  @ApiOperation({ summary: 'Delete work schedule for a doctor' })
  @ApiParam({ name: 'medecinId', type: Number })
  @ApiResponse({ status: 200, description: 'Work schedule deleted' })
  async deleteSchedules(@Param('medecinId') medecinId: number) {
    await this.service.deleteByMedecinId(medecinId);
    return { message: 'Work schedule deleted for medecin ' + medecinId };
  }
}

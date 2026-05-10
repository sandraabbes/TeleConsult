import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@ApiTags('Availability (Gateway)')
@Controller('availability')
export class AvailabilityGatewayController {
  private readonly availabilityServiceUrl = process.env.AVAILABILITY_SERVICE_URL ;

  constructor(private readonly httpService: HttpService) {}

  // 🔹 Create slot
  @Post()
  @ApiOperation({ summary: 'Create availability slot' })
  async createSlot(@Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.availabilityServiceUrl}`, body),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Failed to create availability',
        error.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 🔹 Init slots for doctor
  @Post('init/:doctorId')
  @ApiOperation({ summary: 'Initialize default slots for doctor' })
  async initSlots(@Param('doctorId') doctorId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.availabilityServiceUrl}/init/${doctorId}`),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Failed to initialize slots',
        error.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 🔹 Get available slots
  @Get(':doctorId/:date')
  @ApiOperation({ summary: 'Get available slots by doctor/date' })
  async getAvailableSlots(@Param('doctorId') doctorId: string, @Param('date') date: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.availabilityServiceUrl}/${doctorId}/${date}`),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Failed to fetch slots',
        error.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 🔹 Mark unavailable range
  @Post(':doctorId/unavailable')
  @ApiOperation({ summary: 'Mark time range as unavailable' })
  async markUnavailable(@Param('doctorId') doctorId: string, @Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.availabilityServiceUrl}/${doctorId}/unavailable`, body),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Failed to mark unavailable',
        error.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 🔹 Mark available range
  @Post(':doctorId/available')
  @ApiOperation({ summary: 'Mark time range as available' })
  async markAvailable(@Param('doctorId') doctorId: string, @Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.availabilityServiceUrl}/${doctorId}/available`, body),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Failed to mark available',
        error.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 🔹 Mark whole day unavailable
  @Post(':doctorId/day-unavailable')
  @ApiOperation({ summary: 'Mark entire day as unavailable' })
  async markDayUnavailable(@Param('doctorId') doctorId: string, @Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.availabilityServiceUrl}/${doctorId}/day-unavailable`, body),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Failed to mark day unavailable',
        error.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 🔹 Mark whole day available
  @Post(':doctorId/day-available')
  @ApiOperation({ summary: 'Mark entire day as available' })
  async markDayAvailable(@Param('doctorId') doctorId: string, @Body() body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.availabilityServiceUrl}/${doctorId}/day-available`, body),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Failed to mark day available',
        error.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}

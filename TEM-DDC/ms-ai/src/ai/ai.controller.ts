import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AiService } from './ai.service';

@Controller()
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  @MessagePattern('summarize_medical_records')
  async summarizeMedicalRecords(@Payload() data: { records: any[] }) {
    try {
      this.logger.log(`Received request to summarize ${data.records?.length || 0} medical records`);
      return await this.aiService.summarizeMedicalRecords(data.records || []);
    } catch (error: any) {
      this.logger.error(`Error summarizing medical records: ${error.message}`, error.stack);
      return { summary: "Erreur lors de la génération du résumé." };
    }
  }

  @MessagePattern('summarize_single_record')
  async summarizeSingleRecord(@Payload() data: { record: any }) {
    try {
      this.logger.log(`Received request to summarize a single record`);
      return await this.aiService.summarizeSingleRecord(data.record);
    } catch (error: any) {
      this.logger.error(`Error summarizing single record: ${error.message}`, error.stack);
      return { summary: "Erreur lors de la génération du résumé." };
    }
  }
}

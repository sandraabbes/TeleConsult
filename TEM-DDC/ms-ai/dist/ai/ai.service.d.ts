import { ConfigService } from '@nestjs/config';
export declare class AiService {
    private configService;
    private readonly logger;
    private readonly ollamaHost;
    private readonly ollamaModel;
    constructor(configService: ConfigService);
    summarizeMedicalRecords(records: any[]): Promise<{
        summary: any;
    }>;
    summarizeSingleRecord(record: any): Promise<{
        textCondition: any;
        textSymptoms: any;
        textDiagnosis: any;
        textTreatment: any;
    }>;
}

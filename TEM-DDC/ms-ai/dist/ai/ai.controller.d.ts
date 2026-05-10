import { AiService } from './ai.service';
export declare class AiController {
    private readonly aiService;
    private readonly logger;
    constructor(aiService: AiService);
    summarizeMedicalRecords(data: {
        records: any[];
    }): Promise<{
        summary: any;
    }>;
    summarizeSingleRecord(data: {
        record: any;
    }): Promise<{
        textCondition: any;
        textSymptoms: any;
        textDiagnosis: any;
        textTreatment: any;
    } | {
        summary: string;
    }>;
}

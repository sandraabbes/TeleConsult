"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fetchApi = typeof fetch !== 'undefined' ? fetch : (...args) => import('node-fetch').then(({ default: f }) => f(...args));
let AiService = AiService_1 = class AiService {
    configService;
    logger = new common_1.Logger(AiService_1.name);
    ollamaHost;
    ollamaModel;
    constructor(configService) {
        this.configService = configService;
        this.ollamaHost = this.configService.get('OLLAMA_HOST') || 'http://localhost:11434';
        this.ollamaModel = this.configService.get('OLLAMA_MODEL') || 'llama3.1';
    }
    async summarizeMedicalRecords(records) {
        if (!records || records.length === 0) {
            return { summary: "Aucun dossier médical trouvé." };
        }
        const formattedRecords = records.map((record, index) => `
Consultation ${index + 1}:
- Date: ${record.consultationDate}
- Diagnosis: ${record.diagnosis || 'Not specified'}
- Notes: ${record.notes || 'None'}
- Prescriptions: ${record.prescriptions?.length
            ? record.prescriptions.map((p) => `${p.medicationName} ${p.dosage} - ${p.frequency} for ${p.duration}`).join(', ')
            : 'None'}
`).join('\n');
        const prompt = `You are a medical assistant analyzing a patient's complete medical history.
Based on the following medical records, generate a comprehensive medical history summary in English.

Include the following sections, and please format the title of each section using HTML <b> tags (e.g. <b>1. Consultation History:</b>).
1. Consultation History (dates included)
2. Main Diagnoses (across all consultations)
3. Prescribed Medications (with frequency)
4. General Observations (patterns)
5. Recommendations (based on the history)

Be concise, professional, and use medical terminology.
DO NOT use markdown asterisks (**) for bolding. Use only HTML <b> tags for titles.
Do not add warnings, disclaimers or refusals. Just write the medical summary directly.

Medical records:
${formattedRecords}

Medical history summary:`;
        try {
            const response = await fetchApi(`${this.ollamaHost}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.ollamaModel,
                    prompt: prompt,
                    stream: false,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const data = await response.json();
            return { summary: data.response };
        }
        catch (error) {
            this.logger.error(`Ollama request failed: ${error.message}`);
            return { summary: "Erreur lors de la génération du résumé." };
        }
    }
    async summarizeSingleRecord(record) {
        if (!record) {
            return {
                textCondition: "No consultation data provided.",
                textSymptoms: "N/A",
                textDiagnosis: "N/A",
                textTreatment: "N/A",
            };
        }
        const formattedPrescriptions = record.prescriptions?.length
            ? record.prescriptions.map((p) => `${p.medicationName} ${p.dosage} - ${p.frequency} for ${p.duration}`).join(', ')
            : 'None';
        const prompt = `You are a medical assistant. Analyze the following consultation record and return a JSON object with exactly these four fields:
- "textCondition": a one-sentence overview of the patient's condition during this consultation
- "textSymptoms": a summary of the main symptoms reported or observed
- "textDiagnosis": the diagnosis or probable diagnosis
- "textTreatment": the treatment plan and prescribed medications

Be concise and professional. Use medical terminology. Write in English.
Do NOT add any text outside the JSON. Do NOT add warnings, disclaimers, or markdown formatting.
Return ONLY a valid JSON object.

Record:
- Date: ${record.consultationDate}
- Diagnosis: ${record.diagnosis || 'Not specified'}
- Notes: ${record.notes || 'None'}
- Prescriptions: ${formattedPrescriptions}

JSON:`;
        try {
            const response = await fetchApi(`${this.ollamaHost}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.ollamaModel,
                    prompt: prompt,
                    stream: false,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const data = await response.json();
            const raw = data.response || '';
            try {
                const jsonMatch = raw.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        textCondition: parsed.textCondition || 'No condition information available.',
                        textSymptoms: parsed.textSymptoms || 'No symptoms recorded.',
                        textDiagnosis: parsed.textDiagnosis || 'No diagnosis recorded.',
                        textTreatment: parsed.textTreatment || 'No treatment plan recorded.',
                    };
                }
            }
            catch {
            }
            return {
                textCondition: raw || 'AI summary could not be generated.',
                textSymptoms: record.notes || 'No symptoms recorded.',
                textDiagnosis: record.diagnosis || 'No diagnosis recorded.',
                textTreatment: formattedPrescriptions !== 'None' ? formattedPrescriptions : 'No treatment plan recorded.',
            };
        }
        catch (error) {
            this.logger.error(`Ollama request failed: ${error.message}`);
            return {
                textCondition: 'AI summary could not be generated due to an error.',
                textSymptoms: record.notes || 'No symptoms recorded.',
                textDiagnosis: record.diagnosis || 'No diagnosis recorded.',
                textTreatment: formattedPrescriptions !== 'None' ? formattedPrescriptions : 'No treatment plan recorded.',
            };
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// node-fetch is required by the user, but we will rely on global fetch if we are on Node 18+ to avoid esModuleInterop issues,
// since NestJS may throw on `import fetch` for node-fetch v3. We'll use a dynamic import workaround or the global fetch.
const fetchApi = typeof fetch !== 'undefined' ? fetch : (...args: any[]) => import('node-fetch').then(({default: f}) => (f as any)(...args));

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ollamaHost: string;
  private readonly ollamaModel: string;

  constructor(private configService: ConfigService) {
    this.ollamaHost = this.configService.get<string>('OLLAMA_HOST') || 'http://localhost:11434';
    this.ollamaModel = this.configService.get<string>('OLLAMA_MODEL') || 'llama3.1';
  }

  async summarizeMedicalRecords(records: any[]) {
    if (!records || records.length === 0) {
      return { summary: "Aucun dossier médical trouvé." };
    }

    const formattedRecords = records.map((record, index) => `
Consultation ${index + 1}:
- Date: ${record.consultationDate}
- Diagnosis: ${record.diagnosis || 'Not specified'}
- Notes: ${record.notes || 'None'}
- Prescriptions: ${
  record.prescriptions?.length
    ? record.prescriptions.map((p: any) =>
        `${p.medicationName} ${p.dosage} - ${p.frequency} for ${p.duration}`
      ).join(', ')
    : 'None'
}
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

      const data: any = await response.json();
      return { summary: data.response };
    } catch (error: any) {
      this.logger.error(`Ollama request failed: ${error.message}`);
      return { summary: "Erreur lors de la génération du résumé." };
    }
  }

  async summarizeSingleRecord(record: any) {
    if (!record) {
      return {
        textCondition: "No consultation data provided.",
        textSymptoms: "N/A",
        textDiagnosis: "N/A",
        textTreatment: "N/A",
      };
    }

    const formattedPrescriptions = record.prescriptions?.length
      ? record.prescriptions.map((p: any) =>
          `${p.medicationName} ${p.dosage} - ${p.frequency} for ${p.duration}`
        ).join(', ')
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

      const data: any = await response.json();
      const raw = data.response || '';

      // Try to parse as JSON
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
      } catch {
        // JSON parsing failed, fall through
      }

      // Fallback: return raw text as condition
      return {
        textCondition: raw || 'AI summary could not be generated.',
        textSymptoms: record.notes || 'No symptoms recorded.',
        textDiagnosis: record.diagnosis || 'No diagnosis recorded.',
        textTreatment: formattedPrescriptions !== 'None' ? formattedPrescriptions : 'No treatment plan recorded.',
      };
    } catch (error: any) {
      this.logger.error(`Ollama request failed: ${error.message}`);
      return {
        textCondition: 'AI summary could not be generated due to an error.',
        textSymptoms: record.notes || 'No symptoms recorded.',
        textDiagnosis: record.diagnosis || 'No diagnosis recorded.',
        textTreatment: formattedPrescriptions !== 'None' ? formattedPrescriptions : 'No treatment plan recorded.',
      };
    }
  }
}

import { ConsultationStatus } from '../../common/enums/consultation-status.enum';

export class ConsultationResponseDto {
  id: string;
  roomId: string;
  doctorId: string;
  patientId: string | null;
  status: ConsultationStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  appointmentId: string;
  senderId: string;
  senderName: string;
  senderRole: 'DOCTOR' | 'PATIENT';
  message: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  timestamp: Date;
  isFile: boolean;
}

export interface ConsultationFile {
  id: string;
  appointmentId: string;
  uploadedBy: string;
  uploadedByRole: 'DOCTOR' | 'PATIENT';
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: Date;
  description?: string;
}

export interface DoctorNotes {
  diagnosis: string;
  notes: string;
  prescriptions: Prescription[];
}

export interface Prescription {
  id?: string;
  medication: string;
  dosage: string;
  duration: string;
  instructions: string;
}

export interface ParticipantNames {
  patientName: string;
  doctorName: string;
  doctorSpecialty: string;
  chiefComplaint: string;
}

export interface ConsultationState {
  appointmentId: string;
  appointment?: any;
  participants?: ParticipantNames;
  status: 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED';
  elapsedTime: number;
  otherUserReady: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  activeTab: 'chat' | 'notes' | 'files';
  messages: ChatMessage[];
  files: ConsultationFile[];
  doctorNotes: DoctorNotes;
}

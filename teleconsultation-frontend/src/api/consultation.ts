import axios from './axios';

export const consultationAPI = {
  // Get consultation details
  getDetails: (appointmentId: string) =>
    axios.get(`/video-consultation/${appointmentId}`),

  // Upload file during consultation
  uploadFile: (appointmentId: string, file: File, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('appointmentId', appointmentId);
    if (description) {
      formData.append('description', description);
    }
    return axios.post('/video-consultation/upload-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Get consultation files
  getFiles: (appointmentId: string) =>
    axios.get(`/video-consultation/${appointmentId}/files`),

  // Get chat history
  getChatHistory: (appointmentId: string) =>
    axios.get(`/video-consultation/${appointmentId}/messages`),

  // End consultation
  endConsultation: (appointmentId: string) =>
    axios.post(`/video-consultation/end`, { roomId: appointmentId }),

  // Save medical record (doctor only)
  // Strategy: try to find an existing record and update it, otherwise create a new one
  saveMedicalRecord: async (appointmentId: string, data: {
    diagnosis: string;
    notes: string;
    prescriptions: any[];
    attachments?: any[];
  }) => {
    const rendezvousId = parseInt(appointmentId, 10);

    // Map frontend prescription format to backend DTO format
    const mappedPrescriptions = (data.prescriptions || []).map(p => ({
      medicationName: p.medication || 'No name provided',
      dosage: p.dosage || '-',
      frequency: p.frequency || 'As directed', // Provide default since it's not in the frontend UI
      duration: p.duration || '-',
      notes: p.instructions || '',
    }));

    // Step 1: Try to find an existing medical record for this appointment
    try {
      const existing = await axios.get(`/medical-records/rendezvous/${rendezvousId}`, {
        _skipAuthRedirect: true,
      } as any);
      if (existing.data && existing.data.id) {
        // Record exists — just update it with notes/diagnosis/mappedPrescriptions
        return axios.patch(`/medical-records/${existing.data.id}`, {
          notes: data.notes || null,
          diagnosis: data.diagnosis || null,
          prescriptions: mappedPrescriptions,
          ...(data.attachments && data.attachments.length > 0 && { attachments: data.attachments }),
        });
      }
    } catch (e: any) {
      // No existing record found, will try to create one
    }

    // Step 2: No existing record — fetch appointment details to get patientId & doctorId
    try {
      const appointmentRes = await axios.get(`/rendezvous/${rendezvousId}`);
      const appointment = appointmentRes.data;

      return axios.post('/medical-records', {
        patientId: appointment.patientId,
        doctorId: appointment.medecinId,
        rendezvousId,
        consultationDate: new Date().toISOString(),
        notes: data.notes || null,
        diagnosis: data.diagnosis || null,
        prescriptions: mappedPrescriptions,
        ...(data.attachments && data.attachments.length > 0 && { attachments: data.attachments }),
      });
    } catch (e: any) {
      console.error('Failed to fetch appointment details for medical record creation:', e);
      throw new Error('Could not save medical record: appointment details unavailable');
    }
  },
};

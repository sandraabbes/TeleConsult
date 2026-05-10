import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Spin, message, Modal, Button, Input, Upload } from 'antd'
import type { UploadProps } from 'antd'
import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  RobotOutlined,
  MedicineBoxOutlined,
  BarsOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  UploadOutlined,
  FileOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import config from '../../../config/global.config'
import dayjs from 'dayjs'
import ailogo from '../../../assets/images/ailogo.png'
import './ConsultationDetail.css'
import AppointmentStatusBadge from '../../../components/AppointmentStatusBadge/AppointmentStatusBadge'

interface ConsultationData {
  patientInfo: {
    fullName: string
    bloodType: string
    DOB: string
    gender: string
    location: string
    phone: string
    patientId: string
    status: string
  }
  consultationInfo: {
    consultationId: string
    date: string
  }
  aiSummary: {
    textCondition: string
    textSymptoms: string
    textDiagnosis: string
    textTreatment: string
  }
  prescriptions: {
    id: string
    name: string
    dosage: string
    instructions: string
    duration: string
    isNew?: boolean
  }[]
  doctorNotes: { text: string }[]
  recordId?: string
  attachments?: { uid: string, name: string, url: string, status: string }[]
}

export default function ConsultationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ConsultationData | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false)
  const [editingPrescriptions, setEditingPrescriptions] = useState<ConsultationData['prescriptions']>([])

  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false)
  const [editingNotes, setEditingNotes] = useState<ConsultationData['doctorNotes']>([])

  useEffect(() => {
    fetchDetail()
  }, [id])

  const fetchDetail = async () => {
    if (!id) return
    setLoading(true)
    try {
      // 1. Fetch the rendezvous (appointment) data
      const doctorId = Number(user?.id)
      const apptRes = await api.get(`/rendezvous/medecin/${doctorId}`)
      const allAppts = apptRes.data || []
      const appt = allAppts.find((a: any) => String(a.id) === String(id))

      if (!appt) {
        message.error('Consultation not found')
        setLoading(false)
        return
      }

      // 2. Fetch patient info
      let patientInfo: any = {}
      try {
        const pRes = await api.get(`/users/${appt.patientId}`)
        const p = pRes.data?.data || pRes.data
        patientInfo = {
          fullName: p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || 'Unknown',
          bloodType: p.bloodType || 'N/A',
          DOB: p.dateOfBirth || p.DOB || '',
          gender: p.gender || 'N/A',
          location: p.address || p.location || 'N/A',
          phone: p.phone || p.phoneNumber || 'N/A',
          patientId: String(appt.patientId),
          status: appt.status,
        }
      } catch {
        patientInfo = {
          fullName: 'Unknown Patient',
          bloodType: 'N/A',
          DOB: '',
          gender: 'N/A',
          location: 'N/A',
          phone: 'N/A',
          patientId: String(appt.patientId),
          status: appt.status,
        }
      }

      // 3. Fetch medical record by rendezvous ID
      let medicalRecord: any = null
      try {
        const mrRes = await api.get(`/medical-records/rendezvous/${id}`)
        medicalRecord = mrRes.data
      } catch {
        // No medical record for this consultation — that's okay
      }

      // 4. Build prescriptions from medical record
      const prescriptions = medicalRecord?.prescriptions?.map((p: any) => ({
        id: p.id,
        name: p.medicationName,
        dosage: p.dosage,
        instructions: `${p.frequency}`,
        duration: p.duration,
      })) || []

      // 5. Build doctor notes from medical record
      const doctorNotes: { text: string }[] = []
      if (medicalRecord?.notes) {
        const splitNotes = String(medicalRecord.notes).split('\n\n').filter(n => n.trim() !== '')
        splitNotes.forEach(n => doctorNotes.push({ text: n }))
      }

      // 6. Set initial data with placeholder AI summary
      const initialData: ConsultationData = {
        patientInfo,
        consultationInfo: {
          consultationId: String(appt.id),
          date: appt.startTime,
        },
        aiSummary: {
          textCondition: 'Loading AI summary...',
          textSymptoms: '',
          textDiagnosis: '',
          textTreatment: '',
        },
        prescriptions,
        doctorNotes,
        recordId: medicalRecord?.id,
        attachments: medicalRecord?.attachments || [],
      }

      setData(initialData)
      setLoading(false)

      // 7. Fetch AI summary if medical record exists
      if (medicalRecord?.id) {
        setSummaryLoading(true)
        try {
          const aiRes = await api.get(`/ai/record/${medicalRecord.id}/summary`)
          const aiData = aiRes.data || {}
          setData(prev => prev ? {
            ...prev,
            aiSummary: {
              textCondition: aiData.textCondition || 'No condition information available.',
              textSymptoms: aiData.textSymptoms || 'No symptoms recorded.',
              textDiagnosis: aiData.textDiagnosis || 'No diagnosis recorded.',
              textTreatment: aiData.textTreatment || 'No treatment plan recorded.',
            },
          } : prev)
        } catch {
          setData(prev => prev ? {
            ...prev,
            aiSummary: {
              textCondition: `${patientInfo.fullName} presented for a ${appt.reason || appt.type || 'general'} consultation.`,
              textSymptoms: medicalRecord?.notes || 'No symptoms recorded.',
              textDiagnosis: medicalRecord?.diagnosis || 'No diagnosis recorded.',
              textTreatment: prescriptions.length > 0
                ? prescriptions.map((p: any) => `${p.name} ${p.dosage}`).join(', ')
                : 'No treatment plan recorded.',
            },
          } : prev)
        } finally {
          setSummaryLoading(false)
        }
      } else {
        // No medical record — show fallback
        setData(prev => prev ? {
          ...prev,
          aiSummary: {
            textCondition: `${patientInfo.fullName} presented for a ${appt.reason || appt.type || 'general'} consultation.`,
            textSymptoms: 'No medical record available for this consultation.',
            textDiagnosis: 'No diagnosis recorded.',
            textTreatment: 'No treatment plan recorded.',
          },
        } : prev)
      }
    } catch {
      message.error('Failed to load consultation details')
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    if (!name || name === 'Unknown Patient') return 'U'
    const parts = name.split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name[0]?.toUpperCase() || 'U'
  }

  const handleOpenPrescriptions = () => {
    setEditingPrescriptions([...(data?.prescriptions || [])])
    setIsPrescriptionModalOpen(true)
  }

  const handleSavePrescriptions = async () => {
    if (!data) return

    try {
      let currentRecordId = data.recordId
      if (!currentRecordId) {
        const payload = {
          patientId: data.patientInfo.patientId,
          doctorId: Number(user?.id),
          rendezvousId: Number(data.consultationInfo.consultationId),
          consultationDate: data.consultationInfo.date,
          prescriptions: editingPrescriptions.map(p => ({
            medicationName: p.name,
            dosage: p.dosage,
            frequency: p.instructions,
            duration: p.duration,
          })),
        }
        await api.post('/medical-records', payload)
        message.success('Medical record & prescriptions created successfully')
        fetchDetail()
        setIsPrescriptionModalOpen(false)
        return
      }

      const originalIds = data.prescriptions.map(p => String(p.id))
      const currentIds = editingPrescriptions.map(p => String(p.id))

      // Delete removed prescriptions
      const deletedIds = originalIds.filter(id => !currentIds.includes(id))
      for (const id of deletedIds) {
        await api.delete(`/medical-records/prescriptions/${id}`)
      }

      // Add new ones or recreate modified ones
      for (const p of editingPrescriptions) {
        if (p.isNew) {
          // Brand new
          await api.post(`/medical-records/${currentRecordId}/prescriptions`, {
            medicationName: p.name,
            dosage: p.dosage,
            frequency: p.instructions,
            duration: p.duration,
          })
        } else {
          // Check if modified
          const original = data.prescriptions.find(op => String(op.id) === String(p.id))
          if (original && (original.name !== p.name || original.dosage !== p.dosage || original.instructions !== p.instructions || original.duration !== p.duration)) {
            // Modified, so delete and add again
            await api.delete(`/medical-records/prescriptions/${p.id}`)
            await api.post(`/medical-records/${currentRecordId}/prescriptions`, {
              medicationName: p.name,
              dosage: p.dosage,
              frequency: p.instructions,
              duration: p.duration,
            })
          }
        }
      }

      message.success('Prescriptions updated successfully')
      fetchDetail() // Refresh data
      setIsPrescriptionModalOpen(false)
    } catch {
      message.error('Failed to update prescriptions')
    }
  }

  const handleOpenNotes = () => {
    setEditingNotes([...(data?.doctorNotes || [])])
    setIsNotesModalOpen(true)
  }

  const handleSaveNotes = async () => {
    if (!data) return

    try {
      const combinedNotes = editingNotes.map(n => n.text).join('\n\n')

      if (!data.recordId) {
        const payload = {
          patientId: data.patientInfo.patientId,
          doctorId: Number(user?.id),
          rendezvousId: Number(data.consultationInfo.consultationId),
          consultationDate: data.consultationInfo.date,
          notes: combinedNotes,
        }
        await api.post('/medical-records', payload)
        message.success('Medical record created and notes saved')
        fetchDetail()
        setIsNotesModalOpen(false)
        return
      }

      await api.patch(`/medical-records/${data.recordId}`, {
        notes: combinedNotes,
      })
      message.success('Notes updated successfully')
      fetchDetail() // Refresh data
      setIsNotesModalOpen(false)
    } catch {
      message.error('Failed to update notes')
    }
  }

  const uploadProps: UploadProps = {
    accept: 'image/*,.pdf',
    fileList: data?.attachments?.map((a, i) => ({
      uid: a.uid || String(i),
      name: a.name || `Attachment ${i + 1}`,
      status: (a.status as any) || 'done',
      url: a.url.startsWith('http') ? a.url : `${config.API_BASE_URL.replace('/api', '')}${a.url}`,
    })) || [],
    showUploadList: {
      showRemoveIcon: true,
    },
    onRemove: async (file) => {
      try {
        const currentRecordId = data?.recordId;
        if (!currentRecordId) return false;
        
        // Remove from the local array using UID
        const newAttachments = (data?.attachments || []).filter(a => a.uid !== file.uid);
        
        await api.patch(`/medical-records/${currentRecordId}`, {
          attachments: newAttachments,
        });
        message.success(`${file.name} removed successfully!`);
        fetchDetail();
        return true;
      } catch (err) {
        message.error('Failed to remove file.');
        return false;
      }
    },
    beforeUpload: (file) => {
      const isPdfOrImage = file.type === 'application/pdf' || file.type.startsWith('image/');
      if (!isPdfOrImage) {
        message.error('You can only upload PDF or Image files!');
      }
      return isPdfOrImage || Upload.LIST_IGNORE;
    },
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      try {
        let currentRecordId = data?.recordId;
        if (!currentRecordId) {
          const payload = {
            patientId: data!.patientInfo.patientId,
            doctorId: Number(user?.id),
            rendezvousId: Number(data!.consultationInfo.consultationId),
            consultationDate: data!.consultationInfo.date,
          };
          const res = await api.post('/medical-records', payload);
          currentRecordId = res.data.id;
          setData((prev) => prev ? { ...prev, recordId: currentRecordId } : prev);
        }

        const formData = new FormData();
        formData.append('file', file as any);
        await api.post(`/medical-records/${currentRecordId}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        message.success(`${(file as File).name} uploaded successfully!`);
        fetchDetail();
        onSuccess?.("ok");
      } catch (err) {
        message.error('File upload failed.');
        onError?.(err as any);
      }
    },
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="detail-page">
        <div className="detail-container">
          <div className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeftOutlined /> Back to Consultations
          </div>
          <div style={{ textAlign: 'center', padding: '64px', color: '#94A3B8' }}>
            Consultation data not available.
          </div>
        </div>
      </div>
    )
  }

  const { patientInfo, consultationInfo, aiSummary, prescriptions, doctorNotes } = data

  return (
    <div className="detail-page">
      <div className="detail-container">
        {/* Back */}
        <div className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeftOutlined /> Back to Consultations
        </div>

        {/* Header */}
        <div className="detail-header">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div className="patient-avatar-detail">
              {getInitials(patientInfo.fullName)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
                  {patientInfo.fullName}
                </h1>
                {patientInfo.bloodType && patientInfo.bloodType !== 'N/A' && (
                  <span className="blood-type-badge">{patientInfo.bloodType}</span>
                )}
              </div>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0 0' }}>
                ID: #{patientInfo.patientId.slice(0, 8).toUpperCase()}-PT
                {patientInfo.DOB && ` • DOB: ${dayjs(patientInfo.DOB).format('D MMM YYYY')} (${dayjs().diff(patientInfo.DOB, 'year')}y)`}
                {patientInfo.gender !== 'N/A' && ` • ${patientInfo.gender}`}
              </p>
              <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 13, color: '#6B7280' }}>
                {patientInfo.location !== 'N/A' && (
                  <span><EnvironmentOutlined /> {patientInfo.location}</span>
                )}
                {patientInfo.phone !== 'N/A' && (
                  <span><PhoneOutlined /> {patientInfo.phone}</span>
                )}
              </div>
            </div>
          </div>
          <div className="consultation-meta">
            <AppointmentStatusBadge status={patientInfo.status} />
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
              Consultation ID: #{consultationInfo.consultationId}
            </p>
            <p style={{ fontSize: 13, color: '#111827', fontWeight: 600, margin: 0 }}>
              Date: {dayjs(consultationInfo.date).format('MMM D, YYYY')}
            </p>
            <Button
              icon={<UserOutlined />}
              type="primary"
              style={{ marginTop: 8, borderRadius: 8, fontWeight: 600 }}
              onClick={() => navigate(`/doctor/patients/${patientInfo.patientId}`)}
            >
              View Patient Profile
            </Button>
          </div>
        </div>

        {/* AI Summary */}
        <div className="summary-section">
          <div className="section-header-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RobotOutlined style={{ color: '#1479FF', fontSize: 16 }} />
              <span className="section-title">AI-Generated Summary</span>
            </div>
            {summaryLoading && <Spin size="small" />}
          </div>
          <div className="ai-summary-card">
            <div className="ai-summary-grid">
              <img src={ailogo} alt="AI Vital Monitor" className="monitor-image-full" />
              <div className="overview-text">
                <h3>PATIENT CONDITION OVERVIEW</h3>
                <p><strong>Patient:</strong> {aiSummary.textCondition}</p>
                <p><strong>Symptoms:</strong> {aiSummary.textSymptoms}</p>
                <p><strong>Diagnosis:</strong> {aiSummary.textDiagnosis}</p>
                <p><strong>Treatment:</strong> {aiSummary.textTreatment}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Prescriptions + Notes */}
        <div className="actions-grid-row">
          {/* Prescriptions Column */}
          <div className="prescriptions-col" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Prescriptions */}
            <div>
              <div className="section-header-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MedicineBoxOutlined style={{ color: '#1479FF', fontSize: 16 }} />
                  <span className="section-title">Prescriptions</span>
                  <Button type="text" icon={<EditOutlined />} onClick={handleOpenPrescriptions} size="small" />
                </div>
                <span className="item-count">{prescriptions.length} ITEM{prescriptions.length !== 1 ? 'S' : ''}</span>
              </div>
              {prescriptions.length === 0 ? (
                <div className="notes-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: '#94A3B8', fontSize: 13, margin: 0 }}>No prescriptions recorded.</p>
                </div>
              ) : (
                <div className="prescription-list">
                  {prescriptions.map((p, idx) => (
                    <div key={p.id || idx} className="prescription-card">
                      <div className="pill-icon-container">
                        <MedicineBoxOutlined style={{ fontSize: 16 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="p-name">{p.name || 'Medication'}{p.dosage ? ` ${p.dosage}` : ''}</p>
                        <p className="p-instruction">{p.instructions || 'No specific instructions'}</p>
                      </div>
                      {p.duration && (
                        <span className="p-duration">{p.duration}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Files Section under Prescriptions */}
            <div className="files-section">
              <div className="section-header-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileOutlined style={{ color: '#1479FF', fontSize: 16 }} />
                  <span className="section-title">Files</span>
                </div>
              </div>
              <div className="notes-card">
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />}>Click to Upload Evidence</Button>
                </Upload>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="notes-col">
            <div className="section-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarsOutlined style={{ color: '#1479FF', fontSize: 16 }} />
                <span className="section-title">Doctor's Notes</span>
                <Button type="text" icon={<EditOutlined />} onClick={handleOpenNotes} size="small" />
              </div>
            </div>
            <div className="notes-card">
              {doctorNotes.length === 0 ? (
                <p style={{ color: '#94A3B8', fontSize: 13, margin: 0 }}>No notes recorded for this consultation.</p>
              ) : (
                <ul className="notes-bullet-list">
                  {doctorNotes.map((n, idx) => (
                    <li key={idx}>{n.text}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Modals */}
        <Modal
          title="Edit Prescriptions"
          open={isPrescriptionModalOpen}
          onCancel={() => setIsPrescriptionModalOpen(false)}
          onOk={handleSavePrescriptions}
          width={700}
        >
          <Button type="dashed" onClick={() => setEditingPrescriptions([...editingPrescriptions, { isNew: true, id: Date.now().toString(), name: '', dosage: '', instructions: '', duration: '' }])} block icon={<PlusOutlined />} style={{ marginBottom: 16 }}>
            Add Prescription
          </Button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {editingPrescriptions.map((p, index) => (
              <div key={p.id || index} style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#F8FAFC', padding: 12, borderRadius: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Input placeholder="Medication Name" value={p.name} onChange={e => {
                      const newP = [...editingPrescriptions];
                      newP[index].name = e.target.value;
                      setEditingPrescriptions(newP);
                    }} />
                    <Input placeholder="Dosage" value={p.dosage} onChange={e => {
                      const newP = [...editingPrescriptions];
                      newP[index].dosage = e.target.value;
                      setEditingPrescriptions(newP);
                    }} style={{ width: 120 }} />
                    <Input placeholder="Duration" value={p.duration} onChange={e => {
                      const newP = [...editingPrescriptions];
                      newP[index].duration = e.target.value;
                      setEditingPrescriptions(newP);
                    }} style={{ width: 120 }} />
                  </div>
                  <Input placeholder="Instructions (e.g., 1 pill after meal)" value={p.instructions} onChange={e => {
                    const newP = [...editingPrescriptions];
                    newP[index].instructions = e.target.value;
                    setEditingPrescriptions(newP);
                  }} />
                </div>
                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => {
                  const newP = [...editingPrescriptions];
                  newP.splice(index, 1);
                  setEditingPrescriptions(newP);
                }} />
              </div>
            ))}
          </div>
        </Modal>

        <Modal
          title="Edit Notes"
          open={isNotesModalOpen}
          onCancel={() => setIsNotesModalOpen(false)}
          onOk={handleSaveNotes}
        >
          <Button type="dashed" onClick={() => setEditingNotes([...editingNotes, { text: '' }])} block icon={<PlusOutlined />} style={{ marginBottom: 16 }}>
            Add Note
          </Button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {editingNotes.map((n, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Input.TextArea placeholder="Note details..." value={n.text} onChange={e => {
                  const newN = [...editingNotes];
                  newN[index].text = e.target.value;
                  setEditingNotes(newN);
                }} autoSize={{ minRows: 2 }} />
                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => {
                  const newN = [...editingNotes];
                  newN.splice(index, 1);
                  setEditingNotes(newN);
                }} />
              </div>
            ))}
          </div>
        </Modal>

      </div>
    </div>
  )
}

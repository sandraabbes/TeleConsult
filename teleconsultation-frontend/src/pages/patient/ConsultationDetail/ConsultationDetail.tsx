import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Spin, message } from 'antd'
import {
  ArrowLeftOutlined,
  RobotOutlined,
  MedicineBoxOutlined,
  BarsOutlined,
  FileOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import config from '../../../config/global.config'
import dayjs from 'dayjs'
import ailogo from '../../../assets/images/ailogo.png'
import AppointmentStatusBadge from '../../../components/AppointmentStatusBadge/AppointmentStatusBadge'
import './ConsultationDetail.css'

interface ConsultationData {
  doctorInfo: {
    name: string
    specialty: string
  }
  consultationInfo: {
    consultationId: string
    date: string
    status: string
    type: string
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
  }[]
  doctorNotes: { text: string }[]
  recordId?: string
  attachments?: { uid: string; name: string; url: string; status: string }[]
}

export default function ConsultationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const patientId = user?.id ? String(user.id) : ''

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ConsultationData | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    fetchDetail()
  }, [id])

  const fetchDetail = async () => {
    if (!id || !patientId) return
    setLoading(true)
    try {
      // 1. Fetch the patient's appointments and find this one
      const apptRes = await api.get(`/rendezvous/users/${patientId}/patient`)
      const allAppts = Array.isArray(apptRes.data) ? apptRes.data : []
      const appt = allAppts.find((a: any) => String(a.id) === String(id))

      if (!appt) {
        message.error('Consultation not found')
        setLoading(false)
        return
      }

      // 2. Fetch doctor info
      let doctorInfo = { name: 'Unknown Doctor', specialty: 'Doctor' }
      try {
        const docRes = await api.get(`/register-doctors/${appt.medecinId}`)
        const doc = docRes.data
        const fullName = doc.fullName || `${doc.firstName || ''} ${doc.lastName || ''}`.trim() || 'Doctor'
        doctorInfo = {
          name: fullName.startsWith('Dr.') ? fullName : `Dr. ${fullName}`,
          specialty: doc.speciality || 'General Physician',
        }
      } catch { /* keep defaults */ }

      // 3. Fetch medical record by rendezvous ID
      let medicalRecord: any = null
      try {
        const mrRes = await api.get(`/medical-records/rendezvous/${id}`)
        medicalRecord = mrRes.data
      } catch { /* No medical record — that's okay */ }

      // 4. Build prescriptions
      const prescriptions = medicalRecord?.prescriptions?.map((p: any) => ({
        id: p.id,
        name: p.medicationName,
        dosage: p.dosage,
        instructions: `${p.frequency}`,
        duration: p.duration,
      })) || []

      // 5. Build doctor notes
      const doctorNotes: { text: string }[] = []
      if (medicalRecord?.notes) {
        const splitNotes = String(medicalRecord.notes).split('\n\n').filter((n: string) => n.trim() !== '')
        splitNotes.forEach((n: string) => doctorNotes.push({ text: n }))
      }

      // 6. Build initial data
      const initialData: ConsultationData = {
        doctorInfo,
        consultationInfo: {
          consultationId: String(appt.id),
          date: appt.startTime,
          status: appt.status,
          type: appt.type || 'Standard',
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

      // 7. Fetch AI summary
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
              textCondition: `Consultation with ${doctorInfo.name}.`,
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
        setData(prev => prev ? {
          ...prev,
          aiSummary: {
            textCondition: `Consultation with ${doctorInfo.name}.`,
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="pat-detail-page">
        <div className="pat-detail-container">
          <div className="pat-detail-back" onClick={() => navigate(-1)}>
            <ArrowLeftOutlined /> Back to Consultations
          </div>
          <div style={{ textAlign: 'center', padding: 64, color: '#94A3B8' }}>
            Consultation data not available.
          </div>
        </div>
      </div>
    )
  }

  const { doctorInfo, consultationInfo, aiSummary, prescriptions, doctorNotes } = data

  return (
    <div className="pat-detail-page">
      <div className="pat-detail-container">
        {/* Back */}
        <div className="pat-detail-back" onClick={() => navigate(-1)}>
          <ArrowLeftOutlined /> Back to Consultations
        </div>

        {/* Consultation info bar (replaces the patient header) */}
        <div className="pat-detail-info-bar">
          <div className="pat-detail-info-left">
            <CalendarOutlined style={{ fontSize: 18, color: '#1479FF' }} />
            <div>
              <span>Consultation <strong>#{consultationInfo.consultationId}</strong></span>
              <span style={{ margin: '0 12px', color: '#E2E8F0' }}>|</span>
              <span>{dayjs(consultationInfo.date).format('MMM D, YYYY')} at {dayjs(consultationInfo.date).format('hh:mm A')}</span>
              <span style={{ margin: '0 12px', color: '#E2E8F0' }}>|</span>
              <span><strong>{doctorInfo.name}</strong> — {doctorInfo.specialty}</span>
              <span style={{ margin: '0 12px', color: '#E2E8F0' }}>|</span>
              <span style={{ textTransform: 'capitalize' }}>{consultationInfo.type}</span>
            </div>
          </div>
          <AppointmentStatusBadge status={consultationInfo.status} />
        </div>

        {/* AI Summary */}
        <div>
          <div className="pat-section-header-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RobotOutlined style={{ color: '#1479FF', fontSize: 16 }} />
              <span className="pat-section-title">AI-Generated Summary</span>
            </div>
            {summaryLoading && <Spin size="small" />}
          </div>
          <div className="pat-ai-summary-card">
            <div className="pat-ai-summary-grid">
              <img src={ailogo} alt="AI Summary" className="pat-monitor-image" />
              <div className="pat-overview-text">
                <h3>CONSULTATION OVERVIEW</h3>
                <p><strong>Overview:</strong> {aiSummary.textCondition}</p>
                <p><strong>Symptoms:</strong> {aiSummary.textSymptoms}</p>
                <p><strong>Diagnosis:</strong> {aiSummary.textDiagnosis}</p>
                <p><strong>Treatment:</strong> {aiSummary.textTreatment}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Prescriptions + Notes */}
        <div className="pat-actions-grid">
          {/* Prescriptions Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Prescriptions */}
            <div>
              <div className="pat-section-header-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MedicineBoxOutlined style={{ color: '#1479FF', fontSize: 16 }} />
                  <span className="pat-section-title">Prescriptions</span>
                </div>
                <span className="pat-item-count">{prescriptions.length} ITEM{prescriptions.length !== 1 ? 'S' : ''}</span>
              </div>
              {prescriptions.length === 0 ? (
                <div className="pat-notes-card">
                  <p className="pat-empty-text">No prescriptions recorded for this consultation.</p>
                </div>
              ) : (
                <div className="pat-prescription-list">
                  {prescriptions.map((p, idx) => (
                    <div key={p.id || idx} className="pat-prescription-card">
                      <div className="pat-pill-icon">
                        <MedicineBoxOutlined style={{ fontSize: 16 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="pat-p-name">{p.name || 'Medication'}{p.dosage ? ` ${p.dosage}` : ''}</p>
                        <p className="pat-p-instruction">{p.instructions || 'No specific instructions'}</p>
                      </div>
                      {p.duration && (
                        <span className="pat-p-duration">{p.duration}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Files Section */}
            {data.attachments && data.attachments.length > 0 && (
              <div className="pat-files-section">
                <div className="pat-section-header-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileOutlined style={{ color: '#1479FF', fontSize: 16 }} />
                    <span className="pat-section-title">Files</span>
                  </div>
                </div>
                <div className="pat-notes-card">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.attachments.filter((file) => file.url).map((file, idx) => {
                      const fileUrl = file.url.startsWith('http') ? file.url : `${config.API_BASE_URL.replace('/api', '')}${file.url}`
                      return (
                        <a
                          key={file.uid || idx}
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 14px',
                            background: '#F8FAFC',
                            borderRadius: 8,
                            border: '1px solid #F1F5F9',
                            color: '#334155',
                            textDecoration: 'none',
                            fontSize: 13,
                            fontWeight: 500,
                            transition: 'background 0.2s',
                          }}
                        >
                          <FileOutlined style={{ color: '#1479FF' }} />
                          {file.name || `Attachment ${idx + 1}`}
                        </a>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <div className="pat-section-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarsOutlined style={{ color: '#1479FF', fontSize: 16 }} />
                <span className="pat-section-title">Doctor's Notes</span>
              </div>
            </div>
            <div className="pat-notes-card">
              {doctorNotes.length === 0 ? (
                <p className="pat-empty-text">No notes recorded for this consultation.</p>
              ) : (
                <ul className="pat-notes-list">
                  {doctorNotes.map((n, idx) => (
                    <li key={idx}>{n.text}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

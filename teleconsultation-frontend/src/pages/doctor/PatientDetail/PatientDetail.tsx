import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Spin, message } from 'antd'
import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  RobotOutlined,
  FileTextOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import api from '../../../api/axios'
import dayjs from 'dayjs'
import ailogo from '../../../assets/images/ailogo.png'
import './PatientDetail.css'

export default function PatientDetail() {
  const { id: patientId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [patient, setPatient] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [aiSummary, setAiSummary] = useState<string>('')
  const [aiLoading, setAiLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [patientId])

  const fetchAll = async () => {
    if (!patientId) return
    setLoading(true)
    try {
      // 1. Fetch patient info
      const pRes = await api.get(`/users/${patientId}`)
      const p = pRes.data?.data || pRes.data
      setPatient(p)

      // 2. Fetch medical records
      const mrRes = await api.get(`/medical-records/patient/${patientId}`)
      const rawRecords = mrRes.data || []
      
      const uniqueRecords: any[] = []
      const seenRendezvous = new Set()
      
      // Fetch rendezvous to get appointment type and actual start time
      const apptRes = await api.get(`/rendezvous/users/${patientId}/patient`).catch(() => ({ data: [] }))
      const appts = apptRes.data || []

      rawRecords.forEach((record: any) => {
        let rToSave = { ...record }
        if (record.rendezvousId) {
          const matchedAppt = appts.find((a: any) => String(a.id) === String(record.rendezvousId))
          if (matchedAppt) {
            let typeLabel = 'Consultation'
            if (matchedAppt.type === 'followup') typeLabel = 'Follow-up Consultation'
            else if (matchedAppt.type === 'homevisit') typeLabel = 'Home Visit'
            else if (matchedAppt.type === 'standard') typeLabel = 'Standard Consultation'
            
            rToSave._appointmentType = typeLabel
            rToSave._startTime = matchedAppt.startTime
          }
        }
        
        if (record.rendezvousId && !seenRendezvous.has(record.rendezvousId)) {
          seenRendezvous.add(record.rendezvousId)
          uniqueRecords.push(rToSave)
        } else if (!record.rendezvousId) {
          uniqueRecords.push(rToSave)
        }
      })

      // Add any appointments that do not have a corresponding medical record yet
      appts.forEach((appt: any) => {
        if (!seenRendezvous.has(appt.id)) {
          // Only show completed appointments in history
          if (appt.status?.toLowerCase() === 'completed') {
            let typeLabel = 'Consultation'
            if (appt.type === 'followup') typeLabel = 'Follow-up Consultation'
            else if (appt.type === 'homevisit') typeLabel = 'Home Visit'
            else if (appt.type === 'standard') typeLabel = 'Standard Consultation'
            
            uniqueRecords.push({
              id: `appt-${appt.id}`,
              rendezvousId: appt.id,
              consultationDate: appt.startTime,
              _startTime: appt.startTime,
              _appointmentType: typeLabel,
              _isApptOnly: true
            })
          }
        }
      })

      // Sort records by date descending
      uniqueRecords.sort((a: any, b: any) => new Date(b.consultationDate).getTime() - new Date(a.consultationDate).getTime())
      setRecords(uniqueRecords)
    } catch {
      message.error('Failed to load patient details')
    } finally {
      setLoading(false)
    }

    // 3. Fetch AI summary separately (can take time)
    setAiLoading(true)
    try {
      const aiRes = await api.get(`/ai/patient/${patientId}/summary`, {
        timeout: 120000 // 2 minutes for AI generation
      })
      setAiSummary(aiRes.data?.summary || 'No summary available.')
    } catch (err: any) {
      console.error("Error fetching AI summary:", err.response || err);
      const errMsg = err.response?.data?.message || err.message || 'AI summary unavailable.';
      setAiSummary(`AI summary unavailable. Reason: ${errMsg}`);
    } finally {
      setAiLoading(false)
    }
  }

  const fullName = patient
    ? patient.fullName ||
      `${patient.firstName || ''} ${patient.lastName || ''}`.trim() ||
      'Unknown Patient'
    : 'Loading...'

  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return parts[0][0]?.toUpperCase() || 'U'
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
      <Spin size="large" />
    </div>
  )

  return (
    <div className="patient-detail-page">
      <div
        onClick={() => navigate('/doctor/patients')}
        className='back-btn'
      >
        <ArrowLeftOutlined style={{ fontSize: 12 }} />
        Back to Patients
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #F3F4F6', padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#EFF6FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
            color: '#1479FF',
            flexShrink: 0
          }}>
            {getInitials(fullName)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
                {fullName}
              </h1>
              {patient?.bloodType && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: '#EFF6FF',
                  color: '#1479FF',
                  padding: '3px 10px',
                  borderRadius: 20,
                  border: '1px solid #BFDBFE',
                  letterSpacing: '0.03em'
                }}>
                  {patient.bloodType}
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 6px 0' }}>
              ID: #{patient?.identifier?.replace('PTN-', '') || patientId?.slice(0, 8).toUpperCase()}-PT
              {patient?.dateOfBirth && ` • DOB: ${dayjs(patient.dateOfBirth).format('D MMM YYYY')} (${dayjs().diff(patient.dateOfBirth, 'year')}y)`}
              {patient?.gender && ` • ${patient.gender}`}
            </p>
            <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#6B7280' }}>
              {(patient?.city || patient?.address) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <EnvironmentOutlined style={{ fontSize: 12 }} />
                  {patient.city || patient.address}
                </span>
              )}
              {patient?.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <PhoneOutlined style={{ fontSize: 12 }} />
                  {patient.phone}
                </span>
              )}
            </div>
            <Button
              icon={<MessageOutlined />}
              type="primary"
              style={{ borderRadius: 8, fontWeight: 600, marginTop: 10 }}
              onClick={() => navigate(`/doctor/messages?patientId=${patientId}`)}
            >
              Message
            </Button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <RobotOutlined style={{ color: '#1479FF', fontSize: 16 }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>AI-Generated Summary</span>
        </div>
        <div style={{
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #F3F4F6',
          padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <img
              src={ailogo}
              alt="AI Monitor"
              style={{
                width: 120,
                height: 'auto',
                maxHeight: 160,
                objectFit: 'contain',
                borderRadius: 8,
                flexShrink: 0
              }}
            />
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#9CA3AF',
                letterSpacing: '0.08em',
                margin: '0 0 10px 0'
              }}>
                PATIENT CONDITION OVERVIEW
              </p>
              {aiLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Spin size="small" />
                  <span style={{ fontSize: 13, color: '#6B7280' }}>
                    Generating AI summary...
                  </span>
                </div>
              ) : (
                <div style={{
                  fontSize: 13,
                  color: '#374151',
                  lineHeight: 1.7,
                  margin: 0,
                  whiteSpace: 'pre-line'
                }} dangerouslySetInnerHTML={{ __html: aiSummary }} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 12px 0' }}>
          Consultation History
        </h2>
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
          {records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9CA3AF' }}>
              <FileTextOutlined style={{ fontSize: 36, marginBottom: 10 }} />
              <p style={{ fontSize: 14, margin: 0 }}>No consultation records found</p>
            </div>
          ) : (
            records.map((record, idx) => (
              <div
                key={record.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 20px',
                  borderBottom: idx < records.length - 1 ? '1px solid #F3F4F6' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileTextOutlined style={{ color: '#1479FF', fontSize: 16 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 2px 0' }}>
                    {dayjs(record._startTime || record.consultationDate).format('MMM D, YYYY • hh:mm A')}
                  </p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                    {record._appointmentType || 'Consultation'}
                  </p>
                </div>
                <Button
                  onClick={() => navigate(`/doctor/consultations/${record.rendezvousId}`)}
                  style={{
                    borderColor: '#E5E7EB',
                    color: '#1479FF',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 12,
                    height: 34,
                    flexShrink: 0
                  }}
                >
                  View Consultation
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Spin, message } from 'antd'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TableOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import './Dashboard.css'
import { getExpiredScheduledAppointments } from '../../../utils/appointmentMaintenance'

dayjs.extend(relativeTime)

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const doctorId = Number(user?.id)
  const doctorName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()

  const [appointments, setAppointments] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [patientsMap, setPatientsMap] = useState<Record<string, any>>({})
  const [calendarMonth, setCalendarMonth] = useState<dayjs.Dayjs>(dayjs().startOf('month'))
  const [todayAvailableSlots, setTodayAvailableSlots] = useState<any[]>([])
  const [todaySlotsLoading, setTodaySlotsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!doctorId) return
      setLoading(true)
      try {
        const todayStr = dayjs().format('YYYY-MM-DD')
        const [apptRes, notifRes, slotsRes] = await Promise.all([
          api.get(`/rendezvous/users/${doctorId}/medecin`),
          api.get('/notifications'),
          api.get(`/disponibilites/${doctorId}/available-slots/${todayStr}`).catch(() => ({ data: [] })),
        ])
        setTodayAvailableSlots(Array.isArray(slotsRes.data) ? slotsRes.data : [])
        setTodaySlotsLoading(false)
        const appts = apptRes.data || []

        const now = dayjs()
        const expiredScheduled = getExpiredScheduledAppointments(appts, now)
        if (expiredScheduled.length > 0) {
          await Promise.all(
            expiredScheduled.map((a: any) =>
              api.post(`/rendezvous/${a.id}/cancel`, { doctorName }).catch(console.error)
            )
          )
          expiredScheduled.forEach((a: any) => {
            a.status = 'CANCELLED'
          })
        }

        const noShowUpdates = appts.filter((a: any) =>
          (a.status === 'CONFIRMED' || a.status === 'confirmed') &&
          dayjs(a.endTime || a.startTime).isBefore(now)
        )

        if (noShowUpdates.length > 0) {
          await Promise.allSettled(noShowUpdates.map((a: any) =>
            api.patch(`/rendezvous/users/${doctorId}/${a.id}`, { status: 'no_show' })
          ))
          noShowUpdates.forEach((a: any) => { a.status = 'no_show' })
        }

        setAppointments(appts)
        setNotifications(notifRes.data || [])

        // fetch patient details for each unique patientId
        const uniquePatientIds = [...new Set(appts.map((a: any) => a.patientId))] as string[]
        const patientDetails = await Promise.all(
          uniquePatientIds.map(id =>
            api.get(`/users/${id}`).then(r => ({ id, data: r.data?.data || r.data })).catch(() => ({ id, data: null }))
          )
        )
        const map: Record<string, any> = {}
        patientDetails.forEach(({ id, data }) => {
          if (data) map[id] = data
        })
        setPatientsMap(map)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [doctorId])

  const handleAccept = async (id: number) => {
    try {
      await api.patch(`/rendezvous/${id}/accept`, { doctorName })
      setAppointments(prev =>
        prev.map(a => (a.id === id ? { ...a, status: 'SCHEDULED' } : a))
      )
      message.success('Appointment accepted. Waiting for patient payment.')
    } catch {
      message.error('Failed to accept appointment')
    }
  }

  const handleDecline = async (id: number) => {
    try {
      await api.post(`/rendezvous/users/${doctorId}/${id}/cancel`, { doctorName })
      setAppointments(prev =>
        prev.map(a => (a.id === id ? { ...a, status: 'cancelled' } : a))
      )
      message.error('Appointment declined')
    } catch {
      message.error('Failed to decline appointment')
    }
  }

  const getPatientName = (patientId: string) => {
    const p = patientsMap[patientId]
    if (!p) return 'Loading...'
    return `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email
  }

  const getPatientInitials = (patientId: string) => {
    const p = patientsMap[patientId]
    if (!p) return '?'
    if (p.firstName && p.lastName) return `${p.firstName[0]}${p.lastName[0]}`.toUpperCase()
    return (p.firstName || p.email || '?')[0].toUpperCase()
  }

  const formatDate = (dateStr: string) => dayjs(dateStr).format('MMM D')
  const formatTime = (dateStr: string) => dayjs(dateStr).format('hh:mm A')
  const formatTimeAgo = (dateStr: string) => dayjs(dateStr).fromNow()

  const isNow = (startTime: string) => {
    const start = new Date(startTime)
    const now = new Date()
    const diff = Math.abs(now.getTime() - start.getTime())
    return diff < 30 * 60 * 1000 // within 30 minutes
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  // Stats
  const todayStr = new Date().toDateString()
  const todayVisits = appointments.filter(a => new Date(a.startTime).toDateString() === todayStr).length
  const completed = appointments.filter(a => a.status === 'COMPLETED' || a.status === 'completed').length
  const pending = appointments.filter(a => a.status === 'PENDING' || a.status === 'pending').length

  const pendingAppointments = appointments.filter(a => a.status === 'PENDING' || a.status === 'pending')

  const liveAppointments = appointments.filter(a => {
    const isToday = new Date(a.startTime).toDateString() === new Date().toDateString()
    const isConfirmed = a.status === 'CONFIRMED' || a.status === 'confirmed'
    return isToday && isConfirmed
  }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

  // Calendar logic
  const today = dayjs()
  const firstDayOfMonth = calendarMonth.day() // 0 = Sunday
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 // Monday start
  const daysInMonth = calendarMonth.daysInMonth()
  const isCurrentMonth = calendarMonth.isSame(today, 'month')

  const calendarDays: (number | null)[] = [
    ...Array(adjustedFirstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ]

  const appointmentDays = appointments
    .filter(a => dayjs(a.startTime).isSame(calendarMonth, 'month'))
    .map(a => dayjs(a.startTime).date())

  const todayBookedSlots = appointments.filter(a => dayjs(a.startTime).isSame(today, 'day')).length
  const totalTodaySlots = todayAvailableSlots.length + todayBookedSlots
  const availableSlots = todayAvailableSlots.length

  return (
    <div className="doctor-dashboard">
      <div className="dashboard-left">
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
            Consultation Overview
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
            Good morning, {doctorName}. Here's what's on your schedule today.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: '#EFF6FF' }}>
              <CalendarOutlined style={{ color: '#1479FF', fontSize: 20 }} />
            </div>
            <div>
              <p className="stat-label">TODAY'S VISITS</p>
              <p className="stat-value">{todayVisits}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: '#DCFCE7' }}>
              <CheckCircleOutlined style={{ color: '#22C55E', fontSize: 20 }} />
            </div>
            <div>
              <p className="stat-label">COMPLETED</p>
              <p className="stat-value">{completed}</p>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6B7280', fontWeight: 500 }}>
              {todayVisits > 0 ? Math.round((completed / todayVisits) * 100) : 0}%
            </span>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: '#FEF3C7' }}>
              <ClockCircleOutlined style={{ color: '#F59E0B', fontSize: 20 }} />
            </div>
            <div>
              <p className="stat-label">PENDING</p>
              <p className="stat-value">{pending}</p>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#EF4444', fontWeight: 600,
              background: '#FEE2E2', padding: '2px 8px', borderRadius: 20 }}>
              Urgent
            </span>
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TableOutlined style={{ color: '#1479FF', fontSize: 16 }} />
              <span className="section-title">Pending requests</span>
            </div>
            <span
              className="section-link"
              onClick={() => navigate('/doctor/appointments')}
            >
              View Requests
            </span>
          </div>
          {pendingAppointments.length === 0 ? (
            <div className="empty-state">No pending requests</div>
          ) : (
            pendingAppointments.slice(0, 3).map(appt => (
              <div key={appt.id} className="appointment-row">
                <div className="patient-avatar">
                  {getPatientInitials(appt.patientId)}
                </div>
                <div style={{ flex: 1 }}>
                  <p className="patient-name">{getPatientName(appt.patientId)}</p>
                  <p className="appointment-meta">
                    {formatDate(appt.startTime)} · {formatTime(appt.startTime)} · {appt.type}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    onClick={() => handleAccept(appt.id)}
                    style={{
                      borderStyle: 'none',
                      backgroundColor: '#22c55e',
                      color: '#ffffff',
                      borderRadius: 25,
                      fontWeight: 600,
                      fontSize: 13,
                      height: 34
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={() => handleDecline(appt.id)}
                    style={{
                      borderStyle: 'none',
                      backgroundColor: '#EF4444',
                      color: '#ffffff',
                      borderRadius: 25,
                      fontWeight: 600,
                      fontSize: 13,
                      height: 34
                    }}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TableOutlined style={{ color: '#1479FF', fontSize: 16 }} />
              <span className="section-title">Live Appointments</span>
            </div>
            <span
              className="section-link"
              onClick={() => navigate('/doctor/appointments')}
            >
              View Calendar
            </span>
          </div>
          {liveAppointments.length === 0 ? (
            <div className="empty-state">No appointments today</div>
          ) : (
            liveAppointments.map(appt => (
              <div key={appt.id} className="appointment-row">
                <div className="patient-avatar">
                  {getPatientInitials(appt.patientId)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p className="patient-name" style={{ margin: 0 }}>
                      {getPatientName(appt.patientId)}
                    </p>
                    {isNow(appt.startTime) && (
                      <span style={{
                        background: '#1479FF',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        letterSpacing: '0.05em'
                      }}>
                        NOW
                      </span>
                    )}
                  </div>
                  <p className="appointment-meta">{appt.type}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>
                    Scheduled: {formatTime(appt.startTime)}
                  </span>
                  {isNow(appt.startTime) ? (
                    <Button
                      type="primary"
                      icon={<VideoCameraOutlined />}
                      onClick={() => navigate(`/doctor/waiting-room/${appt.id}`)}
                      style={{
                        background: '#1479FF',
                        borderColor: '#1479FF',
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 12,
                        height: 32
                      }}
                    >
                      Join Call
                    </Button>
                  ) : (
                    <Button
                      icon={<FileTextOutlined />}
                      onClick={() => navigate(`/doctor/patients/${appt.patientId}`)}
                      style={{
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 12,
                        height: 32,
                        borderColor: '#E5E7EB',
                        color: '#374151'
                      }}
                    >
                      View Chart
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="dashboard-right">
        <div className="dashboard-section">
          <div className="section-header">
            <span className="section-title">Schedule Preview</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ cursor: 'pointer', padding: '0 4px', color: '#6B7280', userSelect: 'none' }} onClick={() => setCalendarMonth(prev => prev.subtract(1, 'month'))}>&lt;</span>
              <span style={{ fontSize: 12, color: '#6B7280', minWidth: 65, textAlign: 'center' }}>{calendarMonth.format('MMM YYYY')}</span>
              <span style={{ cursor: 'pointer', padding: '0 4px', color: '#6B7280', userSelect: 'none' }} onClick={() => setCalendarMonth(prev => prev.add(1, 'month'))}>&gt;</span>
            </div>
          </div>
          <div className="calendar-grid">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="calendar-day-label">{d}</div>
            ))}
            {calendarDays.map((day, i) => (
              <div
                key={i}
                className={`calendar-day 
                  ${day === null ? 'empty' : ''}
                  ${day === new Date().getDate() && isCurrentMonth ? 'today' : ''}
                  ${day !== null && appointmentDays.includes(day) ? 'has-appointment' : ''}
                `}
              >
                {day}
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid #F3F4F6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>Today's Available Slots</span>
            <span style={{ fontSize: 13, color: availableSlots === 0 && totalTodaySlots > 0 && !todaySlotsLoading ? '#EF4444' : availableSlots > 0 ? '#1479FF' : '#9CA3AF', fontWeight: 700 }}>
              {todaySlotsLoading ? '...' : totalTodaySlots === 0 ? 'No schedule today' : availableSlots === 0 ? 'Fully Booked' : `${availableSlots} Remaining`}
            </span>
          </div>
          <div style={{
            height: 6,
            background: '#F3F4F6',
            borderRadius: 3,
            marginTop: 8,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: totalTodaySlots > 0 ? `${Math.round((availableSlots / totalTodaySlots) * 100)}%` : '0%',
              background: availableSlots === 0 ? '#EF4444' : '#1479FF',
              borderRadius: 3,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <span className="section-title">Recent Notifications</span>
          </div>
          {notifications.slice(0, 3).map(notif => (
            <div key={notif.id} className="notification-row">
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: notif.isRead ? '#D1D5DB' : '#1479FF',
                flexShrink: 0,
                marginTop: 4
              }} />
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: 13,
                  fontWeight: notif.isRead ? 400 : 600,
                  color: '#111827',
                  margin: '0 0 2px 0',
                  lineHeight: 1.4
                }}>
                  {notif.message}
                </p>
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                  {formatTimeAgo(notif.createdAt)}
                </p>
              </div>
            </div>
          ))}
          <Button
            type="primary"
            block
            onClick={() => navigate('/doctor/notifications')}
            style={{
              marginTop: 14,
              background: '#1479FF',
              borderColor: '#1479FF',
              borderRadius: 8,
              fontWeight: 600,
              height: 36,
              fontSize: 13
            }}
          >
            View All Activity
          </Button>
        </div>
      </div>
    </div>
  )
}

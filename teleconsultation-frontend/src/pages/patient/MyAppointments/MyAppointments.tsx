import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Spin, message, Modal, Dropdown, type MenuProps } from 'antd'
import axios from 'axios'
import {
  CalendarOutlined,
  ClockCircleOutlined,
  VideoCameraOutlined,
  InboxOutlined,
  MoreOutlined,
  CloseCircleOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import AppointmentStatusBadge from '../../../components/AppointmentStatusBadge/AppointmentStatusBadge'
import './MyAppointments.css'

dayjs.extend(relativeTime)

function slotStartIso(slot: { startTime?: string | Date }) {
  return dayjs(slot.startTime).toISOString()
}

function extractErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data as any
    const m = d?.message
    if (typeof m === 'string' && m.trim()) return m
    if (Array.isArray(m)) return m.join(', ')
  }
  return fallback
}

export default function MyAppointments() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const patientId = user?.id ? String(user.id) : ''

  const [appointments, setAppointments] = useState<any[]>([])
  const [doctorsMap, setDoctorsMap] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('upcoming')

  // Reschedule modal state
  const [rescheduleModal, setRescheduleModal] = useState<{ open: boolean; appointmentId: number | null; doctorId: number | null }>({ open: false, appointmentId: null, doctorId: null })
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState<dayjs.Dayjs>(dayjs())
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState<dayjs.Dayjs>(dayjs().startOf('month'))
  const [rescheduleDaysWithSlots, setRescheduleDaysWithSlots] = useState<Record<string, number[]>>({})
  const [rescheduleMonthLoading, setRescheduleMonthLoading] = useState(false)
  const rescheduleMonthFetched = useRef<Set<string>>(new Set())
  const [paymentLoading, setPaymentLoading] = useState<number | null>(null)

  useEffect(() => {
    fetchAppointments()
  }, [patientId])

  const fetchAppointments = async () => {
    if (!patientId || patientId === 'undefined') return
    setLoading(true)
    try {
      const res = await api.get(`/rendezvous/users/${patientId}/patient`)
      const appts = Array.isArray(res.data) ? res.data : []

      const now = dayjs()

      // Auto-update: expired CONFIRMED/AWAITING → NO_SHOW
      const noShowUpdates = appts.filter((a: any) =>
        (a.status === 'CONFIRMED' || a.status === 'confirmed' || a.status === 'AWAITING_CONSULTATION') &&
        dayjs(a.endTime || a.startTime).isBefore(now)
      )

      if (noShowUpdates.length > 0) {
        await Promise.all(noShowUpdates.map((a: any) =>
          api.patch(`/rendezvous/${a.id}`, { status: 'no_show' })
            .catch(console.error)
        ))
        noShowUpdates.forEach((a: any) => { a.status = 'no_show' })
      }



      appts.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      setAppointments(appts)

      // Fetch unique doctor details
      const uniqueDoctorIds = [...new Set(appts.map((a: any) => a.medecinId))].filter(Boolean) as number[]
      const docRes = await Promise.all(
        uniqueDoctorIds.map(id =>
          api.get(`/register-doctors/${id}`)
            .then(r => ({ id, data: r.data }))
            .catch(() => null)
        )
      )
      const dMap: Record<string, any> = {}
      docRes.forEach(r => {
        if (r && r.data) dMap[r.id] = r.data
      })
      setDoctorsMap(dMap)
    } catch {
      message.error('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  const getDoctorDetails = (doctorId: number) => {
    const doc = doctorsMap[doctorId]
    if (!doc) return { name: 'Unknown Doctor', specialty: 'Doctor', profilePhotoUrl: null }
    return {
      name: doc.fullName || 'Doctor',
      specialty: doc.speciality || 'General Physician',
      profilePhotoUrl: doc.profilePhotoUrl || null,
    }
  }

  const getInitials = (name: string) => {
    return name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'D'
  }

  /* ─── Actions ─── */

  const handleCancel = async (appointmentId: number) => {
    try {
      await api.post(`/rendezvous/${appointmentId}/cancel`, {})
      setAppointments(prev =>
        prev.map(a => a.id === appointmentId ? { ...a, status: 'CANCELLED' } : a)
      )
      message.warning('Appointment cancelled')
    } catch {
      message.error('Failed to cancel appointment')
    }
  }

  const handlePayment = async (appointmentId: number) => {
    setPaymentLoading(appointmentId)
    try {
      const { data: payment } = await api.get(`/payments/rendezvous/${appointmentId}`)
      if (!payment || !payment.id) {
        message.error('Payment information not found')
        return
      }
      
      const { data } = await api.post(`/payments/${payment.id}/initiate`, {})
      if (data?.payUrl) {
        window.location.href = data.payUrl
      } else {
        message.error('Failed to get payment URL')
      }
    } catch (error) {
      console.error('Payment initiation failed', error)
      message.error('Payment initiation failed')
    } finally {
      setPaymentLoading(null)
    }
  }

  const isActionDisabled = (appt: any) => {
    const s = (appt.status || '').toUpperCase()
    return s === 'CANCELLED' || s === 'COMPLETED' || s === 'NO_SHOW' || s === 'NOSHOW' || s === 'RESCHEDULE_REQUESTED'
  }

  const getRowMenuItems = (appt: any): MenuProps['items'] => [
    {
      key: 'reschedule',
      icon: <CalendarOutlined />,
      label: 'Reschedule',
      onClick: () => openRescheduleModal(appt.id, appt.medecinId),
      disabled: isActionDisabled(appt),
    },
    { type: 'divider' as const },
    {
      key: 'cancel',
      icon: <CloseCircleOutlined style={{ color: isActionDisabled(appt) ? '#9CA3AF' : '#EF4444' }} />,
      label: (
        <span style={{ color: isActionDisabled(appt) ? '#9CA3AF' : '#EF4444' }}>Cancel appointment</span>
      ),
      onClick: () => handleCancel(appt.id),
      disabled: isActionDisabled(appt),
    },
  ]

  /* ─── Reschedule ─── */

  const resetRescheduleCalendarCache = () => {
    rescheduleMonthFetched.current.clear()
    setRescheduleDaysWithSlots({})
  }

  const fetchMonthDaysWithAvailability = async (doctorId: number, monthStart: dayjs.Dayjs) => {
    if (!doctorId) return
    const key = monthStart.format('YYYY-MM')
    if (rescheduleMonthFetched.current.has(key)) return
    setRescheduleMonthLoading(true)
    try {
      const dim = monthStart.daysInMonth()
      const checks = await Promise.all(
        Array.from({ length: dim }, (_, i) => {
          const d = monthStart.date(i + 1)
          const dateStr = d.format('YYYY-MM-DD')
          return api
            .get(`/disponibilites/${doctorId}/available-slots/${dateStr}`)
            .then(res => ({ day: i + 1, ok: Array.isArray(res.data) && res.data.length > 0 }))
            .catch(() => ({ day: i + 1, ok: false }))
        })
      )
      const days = checks.filter(c => c.ok).map(c => c.day)
      setRescheduleDaysWithSlots(prev => ({ ...prev, [key]: days }))
      rescheduleMonthFetched.current.add(key)
    } finally {
      setRescheduleMonthLoading(false)
    }
  }

  const fetchAvailableSlotsForReschedule = async (doctorId: number, date: dayjs.Dayjs) => {
    try {
      const dateStr = date.format('YYYY-MM-DD')
      const res = await api.get(`/disponibilites/${doctorId}/available-slots/${dateStr}`)
      setAvailableSlots(Array.isArray(res.data) ? res.data.filter((s: any) => s.isAvailable !== false) : [])
    } catch {
      setAvailableSlots([])
    }
  }

  const openRescheduleModal = async (appointmentId: number, doctorId: number) => {
    resetRescheduleCalendarCache()
    setRescheduleModal({ open: true, appointmentId, doctorId })
    setSelectedSlot(null)
    const today = dayjs()
    setRescheduleDate(today)
    setCalendarMonth(today.startOf('month'))
    await Promise.all([
      fetchAvailableSlotsForReschedule(doctorId, today),
      fetchMonthDaysWithAvailability(doctorId, today.startOf('month'))
    ])
  }

  const handleReschedule = async () => {
    if (!selectedSlot || !rescheduleModal.appointmentId) {
      message.error('Please select a time slot')
      return
    }
    setRescheduleLoading(true)
    try {
      const slot = availableSlots.find(s => slotStartIso(s) === selectedSlot)
      if (!slot) {
        message.error('Selected slot is no longer available.')
        setRescheduleLoading(false)
        return
      }
      const startISO = dayjs(slot.startTime).toISOString()
      const endISO = dayjs(slot.endTime).toISOString()
      await api.post(`/rendezvous/${rescheduleModal.appointmentId}/request-reschedule`, {
        proposedStartTime: startISO,
        proposedEndTime: endISO,
      })
      message.success('Reschedule request sent to your doctor for approval.')
      setRescheduleModal({ open: false, appointmentId: null, doctorId: null })
      setSelectedSlot(null)
      resetRescheduleCalendarCache()
      fetchAppointments()
    } catch (err) {
      message.error(extractErrorMessage(err, 'Failed to send reschedule request'))
    } finally {
      setRescheduleLoading(false)
    }
  }

  /* ─── Filters ─── */
  const now = dayjs()

  const upcomingAppts = appointments.filter(a => {
    const s = (a.status || '').toUpperCase()
    return (s === 'PENDING' || s === 'SCHEDULED' || s === 'CONFIRMED' || s === 'AWAITING_CONSULTATION')
      && dayjs(a.endTime || a.startTime).isAfter(now)
  })

  const pastAppts = appointments.filter(a => {
    const s = (a.status || '').toUpperCase()
    return s === 'COMPLETED' || s === 'CANCELLED' || s === 'NO_SHOW' || s === 'NOSHOW'
      || (dayjs(a.endTime || a.startTime).isBefore(now) && s !== 'RESCHEDULE_REQUESTED')
  }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

  const displayAppts = activeTab === 'upcoming' ? upcomingAppts
    : activeTab === 'past' ? pastAppts
    : appointments

  // Stats
  const totalAppts = appointments.length
  const confirmedCount = appointments.filter(a => {
    const s = (a.status || '').toUpperCase()
    return s === 'CONFIRMED' || s === 'AWAITING_CONSULTATION'
  }).length
  const pendingCount = appointments.filter(a => {
    const s = (a.status || '').toUpperCase()
    return s === 'PENDING' || s === 'SCHEDULED'
  }).length
  const cancelledCount = appointments.filter(a => (a.status || '').toUpperCase() === 'CANCELLED').length

  // Next upcoming appointment
  const nextAppt = upcomingAppts[0] || null

  // Group by date
  const groupByDate = (appts: any[]) => {
    const groups: Record<string, any[]> = {}
    appts.forEach(a => {
      const key = dayjs(a.startTime).format('YYYY-MM-DD')
      if (!groups[key]) groups[key] = []
      groups[key].push(a)
    })
    return groups
  }

  const groupedAppts = groupByDate(displayAppts)
  const sortedDateKeys = Object.keys(groupedAppts).sort((a, b) =>
    activeTab === 'upcoming' ? a.localeCompare(b) : b.localeCompare(a)
  )

  const formatDateLabel = (dateStr: string) => {
    const d = dayjs(dateStr)
    if (d.isSame(now, 'day')) return 'TODAY'
    if (d.isSame(now.add(1, 'day'), 'day')) return 'TOMORROW'
    if (d.isSame(now.subtract(1, 'day'), 'day')) return 'YESTERDAY'
    return d.format('dddd, MMM D, YYYY').toUpperCase()
  }

  /* ─── Reschedule calendar helpers ─── */
  const today = dayjs()
  const rescheduleFirstDay = calendarMonth.day()
  const rescheduleAdjustedFirst = rescheduleFirstDay === 0 ? 6 : rescheduleFirstDay - 1
  const rescheduleDaysInMonth = calendarMonth.daysInMonth()
  const rescheduleCalendarDays: (number | null)[] = [
    ...Array(rescheduleAdjustedFirst).fill(null),
    ...Array.from({ length: rescheduleDaysInMonth }, (_, i) => i + 1),
  ]
  const rescheduleMonthKey = calendarMonth.format('YYYY-MM')
  const rescheduleSlotDays = rescheduleDaysWithSlots[rescheduleMonthKey] || []

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="pat-appts-page">
      {/* ──── LEFT ──── */}
      <div className="pat-appts-left">
        <div className="pat-appts-page-header">
          <h1>My Appointments</h1>
          <p>View, manage, and track all your medical consultations.</p>
        </div>

        {/* Tabs */}
        <div className="pat-appts-tabs">
          {['upcoming', 'all', 'past'].map(tab => (
            <div
              key={tab}
              className={`pat-appts-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'upcoming' ? `Upcoming (${upcomingAppts.length})` :
               tab === 'past' ? `Past (${pastAppts.length})` :
               `All (${appointments.length})`}
            </div>
          ))}
        </div>

        {/* Next appointment highlight */}
        {activeTab === 'upcoming' && nextAppt && (() => {
          const doc = getDoctorDetails(nextAppt.medecinId)
          const displayName = doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`
          return (
            <div className="pat-next-card">
              <div className="pat-next-label">
                <div className="pat-next-dot" />
                NEXT APPOINTMENT
              </div>
              <div className="pat-next-content">
                <div className="pat-doc-avatar-lg">
                          {doc.profilePhotoUrl ? (
                            <img
                        src={
                          doc.profilePhotoUrl.startsWith('http')
                            ? doc.profilePhotoUrl
                            : `http://localhost:3000${doc.profilePhotoUrl}`
                        }
                        alt={doc.name}
                      />
                      ) : (
                      getInitials(doc.name)
                      )}
                        </div>
                <div style={{ flex: 1 }}>
                  <p className="pat-next-name">{displayName}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                    {doc.specialty} • {dayjs(nextAppt.startTime).format('MMM D, YYYY')} at {dayjs(nextAppt.startTime).format('hh:mm A')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(nextAppt.status === 'CONFIRMED' || nextAppt.status === 'AWAITING_CONSULTATION') && (
                    <Button className="pat-join-btn" icon={<VideoCameraOutlined />}
                      onClick={() => navigate(`/patient/waiting-room/${nextAppt.id}`)}>
                      Join
                    </Button>
                  )}
                  {nextAppt.status === 'SCHEDULED' && (
                    <Button 
                      className="pat-join-btn" 
                      style={{ background: '#F59E0B', color: 'white', border: 'none' }}
                      loading={paymentLoading === nextAppt.id}
                      onClick={() => handlePayment(nextAppt.id)}
                    >
                      Pay Now
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Appointment List */}
        {sortedDateKeys.length === 0 ? (
          <div className="pat-appts-empty">
            <InboxOutlined />
            <p>No appointments found.</p>
          </div>
        ) : (
          sortedDateKeys.map(dateKey => (
            <div key={dateKey}>
              <p className="pat-date-group-label">{formatDateLabel(dateKey)}</p>
              <div className="pat-appts-list-card">
                {groupedAppts[dateKey].map((appt: any, idx: number) => {
                  const doc = getDoctorDetails(appt.medecinId)
                  const displayName = doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`
                  const status = (appt.status || '').toUpperCase()
                  const canJoin = status === 'CONFIRMED' || status === 'AWAITING_CONSULTATION'
                  const minutesUntil = dayjs(appt.startTime).diff(dayjs(), 'minute')
                  const isWithin15Min = minutesUntil <= 15 && minutesUntil >= -60
                  const isDoctorReady = appt.doctorInWaitingRoom === true

                  return (
                    <div key={appt.id} className="pat-appt-row"
                      style={{ borderBottom: idx < groupedAppts[dateKey].length - 1 ? '1px solid #F3F4F6' : 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div className="pat-doc-avatar">
                          {doc.profilePhotoUrl ? (
                            <img
                        src={
                          doc.profilePhotoUrl.startsWith('http')
                            ? doc.profilePhotoUrl
                            : `http://localhost:3000${doc.profilePhotoUrl}`
                        }
                        alt={doc.name}
                      />
                      ) : (
                      getInitials(doc.name)
                      )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p className="pat-doc-name">{displayName}</p>
                          <p className="pat-doc-sub">{doc.specialty}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 38 }}>
                        <div className="pat-appt-detail-col">
                          <span className="pat-appt-detail-label">TIME</span>
                          <span className="pat-appt-detail-value">
                            {dayjs(appt.startTime).format('hh:mm A')}
                          </span>
                        </div>

                        <div className="pat-appt-detail-col">
                          <span className="pat-appt-detail-label">TYPE</span>
                          <span className="pat-appt-detail-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <VideoCameraOutlined style={{ fontSize: 11 }} /> Video Call
                          </span>
                        </div>

                        <div className="pat-appt-detail-col">
                          <span className="pat-appt-detail-label">STATUS</span>
                          <AppointmentStatusBadge status={appt.status} />
                        </div>

                        {canJoin && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isDoctorReady && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                                Doctor is ready!
                              </span>
                            )}
                            <Button
                              className="pat-join-btn"
                              icon={<VideoCameraOutlined />}
                              size="small"
                              disabled={!isWithin15Min}
                              onClick={() => navigate(`/patient/waiting-room/${appt.id}`)}
                              style={{
                                background: isDoctorReady && isWithin15Min ? '#22C55E' : isWithin15Min ? '#1479FF' : '#E2E8F0',
                                color: isWithin15Min ? '#fff' : '#94A3B8',
                                border: 'none',
                                opacity: isWithin15Min ? 1 : 0.6,
                              }}
                            >
                              {isWithin15Min ? 'Join' : dayjs(appt.startTime).format('hh:mm A')}
                            </Button>
                          </div>
                        )}
                        {status === 'SCHEDULED' && (
                          <Button 
                            className="pat-join-btn" 
                            size="small"
                            style={{ background: '#F59E0B', color: 'white', border: 'none' }}
                            loading={paymentLoading === appt.id}
                            onClick={() => handlePayment(appt.id)}
                          >
                            Pay Now
                          </Button>
                        )}

                        <Dropdown
                          menu={{ items: getRowMenuItems(appt) }}
                          trigger={['click']}
                          placement="bottomRight"
                        >
                          <Button
                            type="text"
                            icon={<MoreOutlined style={{ fontSize: 16, color: '#6B7280' }} />}
                            style={{ width: 32, height: 32, borderRadius: 8 }}
                          />
                        </Dropdown>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ──── RIGHT ──── */}
      <div className="pat-appts-right">
        {/* Overview */}
        <div className="pat-right-card">
          <p className="pat-right-card-title">OVERVIEW</p>
          <div className="pat-overview-row">
            <span className="pat-overview-label">Total</span>
            <span className="pat-overview-value">{totalAppts}</span>
          </div>
          <div className="pat-overview-row">
            <span className="pat-overview-label">Confirmed</span>
            <span className="pat-overview-value" style={{ color: '#16A34A' }}>{confirmedCount}</span>
          </div>
          <div className="pat-overview-row">
            <span className="pat-overview-label">Pending</span>
            <span className="pat-overview-value" style={{ color: '#F59E0B' }}>{pendingCount}</span>
          </div>
          <div className="pat-overview-row">
            <span className="pat-overview-label">Cancelled</span>
            <span className="pat-overview-value" style={{ color: '#EF4444' }}>{cancelledCount}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pat-right-card">
          <p className="pat-right-card-title">QUICK ACTIONS</p>
          <Button
            block
            type="primary"
            icon={<CalendarOutlined />}
            style={{ background: '#1479FF', fontWeight: 600, height: 40, borderRadius: 8, marginBottom: 8 }}
            onClick={() => navigate('/patient/find-doctor')}
          >
            Book New Appointment
          </Button>
          <Button
            block
            icon={<ClockCircleOutlined />}
            style={{ fontWeight: 600, height: 40, borderRadius: 8 }}
            onClick={() => navigate('/patient/consultations')}
          >
            Consultation History
          </Button>
        </div>
      </div>

      {/* ──── RESCHEDULE MODAL ──── */}
      <Modal
        open={rescheduleModal.open}
        title={<span style={{ fontWeight: 700, fontSize: 17 }}>Reschedule Appointment</span>}
        onCancel={() => {
          setRescheduleModal({ open: false, appointmentId: null, doctorId: null })
          setSelectedSlot(null)
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setRescheduleModal({ open: false, appointmentId: null, doctorId: null })
            setSelectedSlot(null)
          }}>
            Cancel
          </Button>,
          <Button
            key="confirm"
            type="primary"
            loading={rescheduleLoading}
            disabled={!selectedSlot}
            onClick={handleReschedule}
            style={{ background: '#1479FF' }}
          >
            Confirm Reschedule
          </Button>,
        ]}
        width={480}
      >
        {/* Mini Calendar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{calendarMonth.format('MMMM YYYY')}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <Button size="small" icon={<LeftOutlined />} type="text"
                onClick={() => {
                  const prev = calendarMonth.subtract(1, 'month')
                  setCalendarMonth(prev)
                  if (rescheduleModal.doctorId) fetchMonthDaysWithAvailability(rescheduleModal.doctorId, prev)
                }}
              />
              <Button size="small" icon={<RightOutlined />} type="text"
                onClick={() => {
                  const next = calendarMonth.add(1, 'month')
                  setCalendarMonth(next)
                  if (rescheduleModal.doctorId) fetchMonthDaysWithAvailability(rescheduleModal.doctorId, next)
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#94A3B8', padding: '4px 0' }}>{d}</div>
            ))}
            {rescheduleCalendarDays.map((day, i) => {
              if (day === null) return <div key={i} />
              const dateObj = calendarMonth.date(day)
              const isToday = dateObj.isSame(today, 'day')
              const isSelected = dateObj.isSame(rescheduleDate, 'day')
              const isPast = dateObj.isBefore(today, 'day')
              const hasSlots = rescheduleSlotDays.includes(day)

              return (
                <div
                  key={i}
                  onClick={() => {
                    if (isPast) return
                    setRescheduleDate(dateObj)
                    setSelectedSlot(null)
                    if (rescheduleModal.doctorId) fetchAvailableSlotsForReschedule(rescheduleModal.doctorId, dateObj)
                  }}
                  style={{
                    textAlign: 'center',
                    padding: '6px 2px',
                    fontSize: 13,
                    fontWeight: isSelected || isToday ? 700 : 500,
                    color: isPast ? '#D1D5DB' : isSelected ? '#FFFFFF' : isToday ? '#1479FF' : '#334155',
                    background: isSelected ? '#1479FF' : isToday ? '#EFF6FF' : hasSlots ? '#F0F9FF' : 'transparent',
                    borderRadius: 8,
                    cursor: isPast ? 'not-allowed' : 'pointer',
                    position: 'relative' as const,
                  }}
                >
                  {day}
                </div>
              )
            })}
          </div>
        </div>

        {/* Slots */}
        <p style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', margin: '0 0 10px 0' }}>Available Slots</p>
        {rescheduleMonthLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /></div>
        ) : availableSlots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#94A3B8', fontSize: 13, background: '#F8FAFC', borderRadius: 10 }}>
            No available slots for this date
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {availableSlots.map(slot => {
              const iso = slotStartIso(slot)
              const isPastSlot = dayjs(slot.startTime).isBefore(dayjs())
              return (
                <div
                  key={iso}
                  onClick={() => { if (!isPastSlot) setSelectedSlot(iso) }}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: `1.5px solid ${selectedSlot === iso ? '#1479FF' : '#E2E8F0'}`,
                    background: isPastSlot ? '#F8FAFC' : selectedSlot === iso ? '#EFF6FF' : '#FFFFFF',
                    textAlign: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    color: isPastSlot ? '#94A3B8' : selectedSlot === iso ? '#1479FF' : '#334155',
                    cursor: isPastSlot ? 'not-allowed' : 'pointer',
                    opacity: isPastSlot ? 0.5 : 1,
                  }}
                >
                  {dayjs(slot.startTime).format('hh:mm A')}
                </div>
              )
            })}
          </div>
        )}
      </Modal>
    </div>
  )
}

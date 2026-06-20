import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Modal, DatePicker, Dropdown, Spin, message, Tooltip, type MenuProps } from 'antd'
import axios from 'axios'
import {
  VideoCameraOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  FileTextOutlined,
  MoreOutlined,
  PhoneOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import dayjs from 'dayjs'
import AppointmentStatusBadge from '../../../components/AppointmentStatusBadge/AppointmentStatusBadge'
import { getExpiredScheduledAppointments } from '../../../utils/appointmentMaintenance'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import relativeTime from 'dayjs/plugin/relativeTime'
import './MyAppointments.css'

dayjs.extend(relativeTime)
dayjs.extend(isSameOrBefore)

function isPendingAppointmentStatus(status: string | undefined) {
  const u = (status || '').toUpperCase()
  return u === 'SCHEDULED' || u === 'PENDING' || u === 'PENDING_PAYMENT'
}

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
  const doctorId = Number(user?.id)
  const doctorName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()

  const [appointments, setAppointments] = useState<any[]>([])
  const [patientsMap, setPatientsMap] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null)
  const [rescheduleModal, setRescheduleModal] = useState<{ open: boolean; appointmentId: number | null }>({ open: false, appointmentId: null })
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState<dayjs.Dayjs>(dayjs())
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState<dayjs.Dayjs>(dayjs().startOf('month'))
  /** YYYY-MM → day-of-month numbers that have ≥1 available slot (reschedule picker) */
  const [rescheduleDaysWithSlots, setRescheduleDaysWithSlots] = useState<Record<string, number[]>>({})
  const [rescheduleMonthLoading, setRescheduleMonthLoading] = useState(false)
  const rescheduleMonthFetched = useRef<Set<string>>(new Set())

  // added: Doctor Ready states
  const [readyingId, setReadyingId] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const isWithin15Minutes = (startTime: string | Date): boolean => {
    try {
      const appointmentDateTime = new Date(startTime);
      const minutesUntil = (appointmentDateTime.getTime() - currentTime.getTime()) / 60000;
      return minutesUntil > -5 && minutesUntil <= 15; // 15 mins early, up to 5 mins late
    } catch {
      return false;
    }
  };

  const getTimeStatus = (startTime: string | Date): string => {
    try {
      const appointmentDateTime = new Date(startTime);
      const minutesUntil = (appointmentDateTime.getTime() - currentTime.getTime()) / 60000;

      if (minutesUntil > 15) {
        return `In ${Math.ceil(minutesUntil)} minutes`;
      } else if (minutesUntil > 0 && minutesUntil <= 15) {
        return 'Ready to join';
      } else if (minutesUntil <= 0 && minutesUntil > -5) {
        return 'Time to start';
      } else {
        return 'Time passed';
      }
    } catch {
      return 'Invalid time';
    }
  };

  const handleDoctorReady = async (appointmentId: number) => {
    setReadyingId(appointmentId);
    try {
      await api.post(`/rendezvous/${appointmentId}/doctor-ready`, { medecinId: doctorId });
      navigate(`/doctor/waiting-room/${appointmentId}`);
    } catch (error) {
      console.error('Failed to mark as ready:', error);
      message.error('Failed to enter waiting room. Please try again.');
    } finally {
      setReadyingId(null);
    }
  };

  const handleAcceptReschedule = async (appointmentId: number) => {
    try {
      await api.post(`/rendezvous/${appointmentId}/accept-reschedule`, { doctorName });
      message.success('Reschedule request accepted');
      fetchAppointments();
    } catch (error) {
      message.error('Failed to accept reschedule request');
    }
  };

  const handleDeclineReschedule = async (appointmentId: number) => {
    try {
      await api.post(`/rendezvous/${appointmentId}/decline-reschedule`, { doctorName });
      message.success('Reschedule request declined');
      fetchAppointments();
    } catch (error) {
      message.error('Failed to decline reschedule request');
    }
  };

  useEffect(() => {
    fetchAppointments()
  }, [doctorId])

  const fetchAppointments = async () => {
    if (!doctorId) return
    setLoading(true)
    try {
      const res = await api.get(`/rendezvous/medecin/${doctorId}`)
      const appts = res.data || []

      const now = dayjs()
      const expiredScheduled = getExpiredScheduledAppointments(appts, now)
      if (expiredScheduled.length > 0) {
        await Promise.all(
          expiredScheduled.map((a: any) =>
            api.post(`/rendezvous/users/${doctorId}/${a.id}/cancel`, { doctorName }).catch(console.error)
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
        await Promise.all(noShowUpdates.map((a: any) =>
          api.patch(`/rendezvous/users/${doctorId}/${a.id}`, { status: 'no_show' })
             .catch(console.error)
        ))
        
        noShowUpdates.forEach((a: any) => { a.status = 'no_show' });
      }

      setAppointments(appts)

      const uniqueIds = [...new Set(appts.map((a: any) => a.patientId))] as string[]
      const details = await Promise.all(
        uniqueIds.map(id =>
          api.get(`/users/${id}`)
            .then(r => ({ id, data: r.data?.data || r.data }))
            .catch(() => ({ id, data: null }))
        )
      )
      const map: Record<string, any> = {}
      details.forEach(({ id, data }) => { if (data) map[id] = data })
      setPatientsMap(map)
    } catch {
      message.error('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  const getFilteredAppointments = () => {
    let filtered = [...appointments]

    // date filter from calendar
    if (selectedDate) {
      filtered = filtered.filter(a =>
        dayjs(a.startTime).isSame(selectedDate, 'day')
      )
    }

    // tab filter
    switch (activeTab) {
      case 'pending':
        filtered = filtered.filter(a =>
          a.status === 'PENDING' || a.status === 'pending'
        )
        break
      case 'confirmed':
        filtered = filtered.filter(a => {
          const s = (a.status || '').toUpperCase();
          return s === 'CONFIRMED' || s === 'AWAITING_CONSULTATION' || s === 'IN_CONSULTATION'
        })
        break
      case 'reschedule':
        filtered = filtered.filter(a =>
          (a.status || '').toLowerCase() === 'reschedule_requested'
        )
        break
      case 'past':
        filtered = filtered.filter(a => {
          const s = (a.status || '').toUpperCase();
          return s === 'COMPLETED' || s === 'CANCELLED' || s === 'NO_SHOW' || s === 'NOSHOW' ||
            (dayjs(a.startTime).isBefore(dayjs(), 'day') && s !== 'IN_CONSULTATION')
        })
        break
      default:
        break
    }

    return filtered.sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )
  }

  const pendingCount = appointments.filter(a =>
    a.status === 'PENDING' || a.status === 'pending'
  ).length

  const confirmedCount = appointments.filter(a => {
    const s = (a.status || '').toUpperCase();
    return s === 'CONFIRMED' || s === 'AWAITING_CONSULTATION' || s === 'IN_CONSULTATION'
  }).length

  const rescheduleCount = appointments.filter(a =>
    (a.status || '').toLowerCase() === 'reschedule_requested'
  ).length

  const upcomingNext = appointments.find(a => {
    const start = dayjs(a.startTime)
    const now = dayjs()
    const s = (a.status || '').toUpperCase();
    const isConfirmed = s === 'CONFIRMED' || s === 'AWAITING_CONSULTATION' || s === 'IN_CONSULTATION'
    const isWithin30Min = start.diff(now, 'minute') <= 30 && start.diff(now, 'minute') >= -60
    return isConfirmed && (isWithin30Min || s === 'IN_CONSULTATION')
  })

  const groupAppointmentsByDate = (appts: any[]) => {
    const groups: Record<string, any[]> = {}
    appts.forEach(appt => {
      const dateKey = dayjs(appt.startTime).format('YYYY-MM-DD')
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(appt)
    })
    return groups
  }

  const getDateLabel = (dateKey: string) => {
    const d = dayjs(dateKey)
    if (d.isSame(dayjs(), 'day')) return `TODAY, ${d.format('MMM D').toUpperCase()}`
    if (d.isSame(dayjs().add(1, 'day'), 'day')) return `TOMORROW, ${d.format('MMM D').toUpperCase()}`
    return d.format('dddd, MMM D').toUpperCase()
  }

  const getPatientName = (patientId: string) => {
    const patient = patientsMap[patientId]
    if (!patient) return 'Unknown Patient'
    return patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.email || 'Unknown Patient'
  }

  const getPatientInitials = (patientId: string) => {
    const patient = patientsMap[patientId]
    if (!patient) return 'U'
    if (patient.firstName && patient.lastName) return `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase()
    return (patient.firstName || patient.email || 'U')[0].toUpperCase()
  }

  const menuDisabled =
    (appt: any) =>
      appt.status?.toUpperCase() === 'CANCELLED' ||
      appt.status?.toUpperCase() === 'COMPLETED' ||
      appt.status?.toUpperCase() === 'NO_SHOW' ||
      appt.status?.toUpperCase() === 'NOSHOW' ||
      isPendingAppointmentStatus(appt.status)

  const getRowMenuItems = (appt: any): MenuProps['items'] => [
    {
      key: 'view',
      icon: <FileTextOutlined />,
      label: 'View patient record',
      onClick: () => navigate(`/doctor/patients/${appt.patientId}`),
    },
    {
      key: 'reschedule',
      icon: <CalendarOutlined />,
      label: 'Reschedule',
      onClick: () => openRescheduleModal(appt.id),
      disabled: menuDisabled(appt),
    },
    { type: 'divider' },
    {
      key: 'cancel',
      icon: <CloseCircleOutlined style={{ color: menuDisabled(appt) ? '#9CA3AF' : '#EF4444' }} />,
      label: (
        <span style={{ color: menuDisabled(appt) ? '#9CA3AF' : '#EF4444' }}>Cancel appointment</span>
      ),
      onClick: () => handleDecline(appt.id),
      disabled: menuDisabled(appt),
    },
  ]

  const handleAccept = async (id: number) => {
    try {
      await api.patch(`/rendezvous/${id}/accept`, { doctorName })
      setAppointments(prev =>
        prev.map(a => a.id === id ? { ...a, status: 'SCHEDULED' } : a)
      )
      message.success('Appointment accepted. Waiting for patient payment.')
    } catch {
      message.error('Failed to accept appointment')
    }
  }

  const handleDecline = async (id: number) => {
    try {
      await api.post(`/rendezvous/${id}/cancel`, { doctorName })
      setAppointments(prev =>
        prev.map(a => a.id === id ? { ...a, status: 'CANCELLED' } : a)
      )
      message.warning('Appointment cancelled')
    } catch {
      message.error('Failed to cancel appointment')
    }
  }

  const resetRescheduleCalendarCache = () => {
    rescheduleMonthFetched.current.clear()
    setRescheduleDaysWithSlots({})
  }

  const fetchMonthDaysWithAvailability = async (monthStart: dayjs.Dayjs) => {
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

  const openRescheduleModal = async (appointmentId: number) => {
    resetRescheduleCalendarCache()
    setRescheduleModal({ open: true, appointmentId })
    const today = dayjs()
    setRescheduleDate(today)
    await Promise.all([fetchAvailableSlots(today), fetchMonthDaysWithAvailability(today.startOf('month'))])
  }

  const fetchAvailableSlots = async (date: dayjs.Dayjs) => {
    try {
      const dateStr = date.format('YYYY-MM-DD')
      const res = await api.get(`/disponibilites/${doctorId}/available-slots/${dateStr}`)
      setAvailableSlots(res.data || [])
    } catch {
      setAvailableSlots([])
    }
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
        message.error('Selected slot is no longer available. Pick another time.')
        setRescheduleLoading(false)
        return
      }
      const startISO = dayjs(slot.startTime).toISOString()
      const endISO = dayjs(slot.endTime).toISOString()
      await api.patch(`/rendezvous/users/${doctorId}/${rescheduleModal.appointmentId}`, {
        startTime: startISO,
        endTime: endISO,
      })
      message.success('Appointment rescheduled successfully')
      setRescheduleModal({ open: false, appointmentId: null })
      setSelectedSlot(null)
      resetRescheduleCalendarCache()
      fetchAppointments()
    } catch (err) {
      console.error('[reschedule]', err)
      message.error(extractErrorMessage(err, 'Failed to reschedule appointment'))
    } finally {
      setRescheduleLoading(false)
    }
  }

  const todayAppts = appointments.filter(a =>
    dayjs(a.startTime).isSame(dayjs(), 'day')
  )
  const todayCompleted = todayAppts.filter(a =>
    a.status === 'COMPLETED' || a.status === 'completed'
  ).length
  const todayUpcoming = todayAppts.filter(a => {
    const s = (a.status || '').toUpperCase();
    return s === 'CONFIRMED' || s === 'AWAITING_CONSULTATION' || s === 'SCHEDULED' || s === 'IN_CONSULTATION'
  }).length

  // Calendar days calculation
  const firstDayOfMonth = calendarMonth.day()
  const adjustedFirst = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1
  const daysInMonth = calendarMonth.daysInMonth()
  const calendarDays: (number | null)[] = [
    ...Array(adjustedFirst).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ]
  const appointmentDays = appointments
    .filter(a => dayjs(a.startTime).isSame(calendarMonth, 'month'))
    .map(a => dayjs(a.startTime).date())

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <Spin size="large" />
    </div>
  )

  const filteredAppointments = getFilteredAppointments()
  const groupedAppointments = groupAppointmentsByDate(filteredAppointments)

  return (
    <div className="appointments-page">
      <div className="appointments-left">
        {/* Page header */}
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
            Appointments
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
            Today - {dayjs().format('dddd - D MMMM YYYY')}
          </p>
        </div>

        {/* Tabs */}
        <div className="appointments-tabs">
          {[
            { key: 'all', label: `All (${appointments.length})` },
            { key: 'pending', label: `Pending Requests (${pendingCount})` },
            { key: 'confirmed', label: `Confirmed (${confirmedCount})` },
            { key: 'reschedule', label: `Reschedule Requests (${rescheduleCount})` },
            { key: 'past', label: 'Past' },
          ].map(tab => (
            <div
              key={tab.key}
              className={`appointments-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {upcomingNext && (activeTab === 'all' || activeTab === 'confirmed') && (
          <div className="upcoming-next-card">
            <div className="upcoming-next-label">
              <span className="upcoming-dot" />
              UPCOMING NEXT
            </div>
            <div className="upcoming-next-content">
              <div className="patient-avatar-lg">
                {getPatientInitials(upcomingNext.patientId)}
              </div>
              <div style={{ flex: 1 }}>
                <p className="upcoming-patient-name">
                  {getPatientName(upcomingNext.patientId)}
                </p>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <VideoCameraOutlined style={{ fontSize: 11 }} />
                    Video Consultation
                  </span>
                  <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ClockCircleOutlined style={{ fontSize: 11 }} />
                    {dayjs(upcomingNext.startTime).format('HH:mm')} - {dayjs(upcomingNext.endTime).format('HH:mm')}
                    {dayjs().isAfter(dayjs(upcomingNext.startTime)) && (
                      <span style={{ color: '#EF4444' }}>
                        (Started {dayjs(upcomingNext.startTime).fromNow()})
                      </span>
                    )}
                  </span>
                </div>
              </div>
              {(() => {
                const s = (upcomingNext.status || '').toUpperCase();
                const isConfirmed = s === 'CONFIRMED' || s === 'AWAITING_CONSULTATION' || s === 'IN_CONSULTATION';
                const isRejoin = s === 'IN_CONSULTATION';
                const canJoin = isWithin15Minutes(upcomingNext.startTime) || isRejoin;
                const timeStatus = getTimeStatus(upcomingNext.startTime);
                
                return (
                  <Tooltip title={isConfirmed ? (canJoin ? (isRejoin ? 'Rejoin consultation' : 'Enter waiting room now') : timeStatus) : 'Waiting for payment'}>
                    <Button
                      type={canJoin ? 'primary' : 'default'}
                      icon={<PhoneOutlined />}
                      onClick={() => canJoin ? handleDoctorReady(upcomingNext.id) : null}
                      loading={readyingId === upcomingNext.id}
                      disabled={!canJoin || !isConfirmed}
                      style={{
                        background: (canJoin && isConfirmed) ? (isRejoin ? '#22C55E' : '#1479FF') : undefined,
                        borderColor: (canJoin && isConfirmed) ? (isRejoin ? '#22C55E' : '#1479FF') : undefined,
                        borderRadius: 10,
                        fontWeight: 700,
                        height: 44,
                        padding: '0 20px',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {isConfirmed ? (isRejoin ? "REJOIN CALL" : (canJoin ? "I'M READY" : "START CALL")) : "AWAITING PAYMENT"}
                    </Button>
                  </Tooltip>
                );
              })()}
            </div>
          </div>
        )}

        {Object.keys(groupedAppointments).length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #F3F4F6'
          }}>
            <CalendarOutlined style={{ fontSize: 40, color: '#D1D5DB', marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>
              {selectedDate
                ? `No appointments on ${selectedDate.format('MMMM D, YYYY')}`
                : 'No appointments found'
              }
            </p>
            {selectedDate && (
              <span
                onClick={() => setSelectedDate(null)}
                style={{ fontSize: 13, color: '#1479FF', cursor: 'pointer', fontWeight: 600 }}
              >
                Clear filter
              </span>
            )}
          </div>
        ) : (
          Object.entries(groupedAppointments).map(([dateKey, appts]) => (
            <div key={dateKey}>
              <p className="date-group-label">{getDateLabel(dateKey)}</p>
              <div className="appointments-list-card">
                {appts.map((appt: any, idx) => (
                  <div
                    key={appt.id}
                    className="appointment-list-row"
                    style={{ borderBottom: idx < appts.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                  >
                    <div style={{display:'flex' , gap:'16px'}}>
                    <div className="patient-avatar-sm">
                      {getPatientInitials(appt.patientId)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="appt-patient-name">{getPatientName(appt.patientId)}</p>
                      <p className="appt-patient-sub">{appt.type || 'Standard'}</p>
                    </div>
                    </div>
                    <div style={{ display:'flex' , gap:'38px'}}>
                    <div className="appt-detail-col">
                      <span className="appt-detail-label">TIME</span>
                      <span className="appt-detail-value">{dayjs(appt.startTime).format('hh:mm A')}</span>
                    </div>
                    <div className="appt-detail-col">
                      <span className="appt-detail-label">TYPE</span>
                      <span className="appt-detail-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <VideoCameraOutlined style={{ fontSize: 11 }} /> Video Call
                      </span>
                    </div>
                    <div className="appt-detail-col">
                      <span className="appt-detail-label">STATUS</span>
                      <AppointmentStatusBadge status={appt.status} />
                    </div>
                    {(appt.status === 'PENDING' || appt.status === 'pending') && (
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
                    )}
                    {(() => {
                      const s = (appt.status || '').toUpperCase();
                      if (s !== 'CONFIRMED' && s !== 'AWAITING_CONSULTATION' && s !== 'IN_CONSULTATION') return null;
                      return (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(() => {
                          const isRejoin = s === 'IN_CONSULTATION';
                          const canJoin = isWithin15Minutes(appt.startTime) || isRejoin;
                          const timeStatus = getTimeStatus(appt.startTime);
                          return (
                            <Tooltip title={isRejoin ? 'Rejoin consultation' : (canJoin ? 'Enter waiting room now' : timeStatus)}>
                              <Button
                                type={canJoin ? 'primary' : 'default'}
                                onClick={() => handleDoctorReady(appt.id)}
                                loading={readyingId === appt.id}
                                disabled={!canJoin}
                                style={{
                                  backgroundColor: canJoin ? '#22c55e' : undefined,
                                  borderColor: canJoin ? '#22c55e' : undefined,
                                  color: canJoin ? '#ffffff' : undefined,
                                  borderRadius: 25,
                                  fontWeight: 600,
                                  fontSize: 13,
                                  height: 34,
                                  borderStyle: canJoin ? 'none' : 'solid'
                                }}
                              >
                                {isRejoin ? "Rejoin" : "I'm Ready"}
                              </Button>
                            </Tooltip>
                          );
                        })()}
                      </div>
                      )
                    })()}
                    {(appt.status || '').toLowerCase() === 'reschedule_requested' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#F97316', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          New: {dayjs(appt.proposedStartTime).format('MMM D, hh:mm A')}
                        </span>
                        <Button
                          onClick={() => handleAcceptReschedule(appt.id)}
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
                          onClick={() => handleDeclineReschedule(appt.id)}
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
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="appointments-right">
        {/* Schedule Overview */}
        <div className="right-card">
          <p className="right-card-title">SCHEDULE OVERVIEW</p>
          <div className="overview-row">
            <span className="overview-label">Total Sessions</span>
            <span className="overview-value" style={{ color: '#1479FF' }}>{todayAppts.length}</span>
          </div>
          <div className="overview-row">
            <span className="overview-label">Completed</span>
            <span className="overview-value">{todayCompleted}</span>
          </div>
          <div className="overview-row" style={{ borderBottom: 'none' }}>
            <span className="overview-label">Upcoming</span>
            <span className="overview-value">{todayUpcoming}</span>
          </div>
        </div>

        {/* Schedule Preview Calendar */}
        <div className="right-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p className="right-card-title" style={{ margin: 0 }}>SCHEDULE PREVIEW</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ cursor: 'pointer', padding: '0 4px', color: '#6B7280', userSelect: 'none' }} onClick={() => setCalendarMonth(prev => prev.subtract(1, 'month'))}>&lt;</span>
              <span style={{ fontSize: 12, color: '#6B7280', minWidth: 65, textAlign: 'center' }}>{calendarMonth.format('MMM YYYY')}</span>
              <span style={{ cursor: 'pointer', padding: '0 4px', color: '#6B7280', userSelect: 'none' }} onClick={() => setCalendarMonth(prev => prev.add(1, 'month'))}>&gt;</span>
            </div>
          </div>
          <div className="calendar-grid">
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={i} className="cal-header">{d}</div>
            ))}
            {calendarDays.map((day, i) => {
              const dateObj = day ? calendarMonth.date(day) : null
              const isSelected = selectedDate && dateObj?.isSame(selectedDate, 'day')
              const isToday = dateObj?.isSame(dayjs(), 'day')
              const hasAppt = day ? appointmentDays.includes(day) : false
              return (
                <div
                  key={i}
                  className={`cal-day
                    ${!day ? 'cal-empty' : ''}
                    ${isToday && !isSelected ? 'cal-today' : ''}
                    ${isSelected ? 'cal-selected' : ''}
                    ${hasAppt && !isSelected && !isToday ? 'cal-has-appt' : ''}
                  `}
                  onClick={() => {
                    if (!day) return
                    const clickedDate = calendarMonth.date(day)
                    if (selectedDate?.isSame(clickedDate, 'day')) {
                      setSelectedDate(null) // deselect to show all
                    } else {
                      setSelectedDate(clickedDate)
                    }
                  }}
                >
                  {day}
                </div>
              )
            })}
          </div>
          {selectedDate && (
            <div
              style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#1479FF', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setSelectedDate(null)}
            >
              Clear filter × 
            </div>
          )}
        </div>
      </div>

      <Modal
        title={
          <span style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 16 }}>
            Reschedule Appointment
          </span>
        }
        open={rescheduleModal.open}
        onCancel={() => {
          setRescheduleModal({ open: false, appointmentId: null })
          setSelectedSlot(null)
          resetRescheduleCalendarCache()
        }}
        footer={null}
        width={480}
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
            Select a new date and time slot:
          </p>
          <DatePicker
            value={rescheduleDate}
            onChange={async (date) => {
              if (date) {
                setRescheduleDate(date)
                setSelectedSlot(null)
                await fetchAvailableSlots(date)
                await fetchMonthDaysWithAvailability(date.startOf('month'))
              }
            }}
            onPanelChange={panelDate => {
              void fetchMonthDaysWithAvailability(panelDate.startOf('month'))
            }}
            onOpenChange={open => {
              if (open) void fetchMonthDaysWithAvailability(rescheduleDate.startOf('month'))
            }}
            cellRender={(current, info) => {
              if (info.type !== 'date') return info.originNode
              const cell = dayjs(current as string | number | dayjs.Dayjs)
              const key = cell.format('YYYY-MM')
              const days = rescheduleDaysWithSlots[key]
              const has = days?.includes(cell.date()) ?? false
              if (!has) return info.originNode
              return (
                <div
                  className="reschedule-cal-cell--has-slots"
                  style={{
                    borderRadius: 8,
                    background: 'rgba(99, 102, 241, 0.12)',
                    boxShadow: 'inset 0 0 0 1px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  {info.originNode}
                </div>
              )
            }}
            style={{ width: '100%', marginBottom: 16, borderRadius: 8, height: 38 }}
            disabledDate={d => d.isBefore(dayjs(), 'day')}
            format="DD/MM/YYYY"
          />
          {rescheduleMonthLoading && (
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 12px 0' }}>
              Loading available days for this month…
            </p>
          )}
          {availableSlots.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '24px',
              color: '#9CA3AF',
              fontSize: 13,
              background: '#F9FAFB',
              borderRadius: 8
            }}>
              No available slots for this date
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {availableSlots.map((slot: any) => {
                const iso = slotStartIso(slot)
                return (
                <div
                  key={iso}
                  onClick={() => setSelectedSlot(iso)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 8,
                    border: `1.5px solid ${selectedSlot === iso ? '#1479FF' : '#E5E7EB'}`,
                    background: selectedSlot === iso ? '#EFF6FF' : '#FFFFFF',
                    color: selectedSlot === iso ? '#1479FF' : '#374151',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'Manrope'
                  }}
                >
                  {dayjs(slot.startTime).format('HH:mm')}
                </div>
              )})}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Button
              onClick={() => {
                setRescheduleModal({ open: false, appointmentId: null })
                setSelectedSlot(null)
                resetRescheduleCalendarCache()
              }}
              style={{ flex: 1, height: 40, borderRadius: 8, fontWeight: 600, fontFamily: 'Manrope' }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              loading={rescheduleLoading}
              onClick={handleReschedule}
              disabled={!selectedSlot}
              style={{
                flex: 1,
                height: 40,
                background: '#1479FF',
                borderColor: '#1479FF',
                borderRadius: 8,
                fontWeight: 600,
                color: '#FFFFFF',
                fontFamily: 'Manrope'
              }}
            >
              Confirm Reschedule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

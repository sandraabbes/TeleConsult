import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Spin, message } from 'antd'
import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  LeftOutlined,
  RightOutlined,
  ClockCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  MedicineBoxOutlined,
  TrophyOutlined,
  HomeOutlined,
  UserOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import dayjs from 'dayjs'
import './DoctorProfile.css'

/* ───────── Types ───────── */
interface Doctor {
  id: number
  fullName: string
  email: string
  phone: string
  specialty: string
  experience: number
  practicePlace: string
  country: string
  city: string
  clinicAddress: string
  bio?: string
  consultationPrice?: number
  profilePhotoUrl?: string
  verificationStatus?: string
}

interface Slot {
  startTime: string
  endTime: string
  isAvailable?: boolean
}

/* ───────── Component ───────── */
export default function DoctorProfile() {
  const { doctorId } = useParams<{ doctorId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const patientId = user?.id ? String(user.id) : ''
  const patientName = user?.fullName || user?.firstName || 'Patient'

  // Doctor data
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Schedule
  const [calendarMonth, setCalendarMonth] = useState(dayjs().startOf('month'))
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs())
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [daysWithSlots, setDaysWithSlots] = useState<Record<string, number[]>>({})

  // Booking
  const [appointmentType, setAppointmentType] = useState<'standard' | 'followup'>('standard')
  const [bookingLoading, setBookingLoading] = useState(false)

  /* ── Fetch doctor data ── */
  useEffect(() => {
    const fetchDoctor = async () => {
      if (!doctorId) return
      setLoading(true)
      setError(false)
      try {
        const res = await api.get(`/register-doctors/${doctorId}`)
        setDoctor(res.data)
      } catch {
        setError(true)
        message.error('Failed to load doctor profile')
      } finally {
        setLoading(false)
      }
    }
    fetchDoctor()
  }, [doctorId])

  /* ── Fetch available slots ── */
  const fetchSlots = useCallback(async (docId: number, date: dayjs.Dayjs) => {
    setSlotsLoading(true)
    setSelectedSlot(null)
    try {
      const dateStr = date.format('YYYY-MM-DD')

      const [slotsRes, apptsRes] = await Promise.all([
        api.get(`/disponibilites/${docId}/available-slots/${dateStr}`),
        api.get('/rendezvous', { params: { medecinId: docId } }).catch(() => ({ data: [] }))
      ])

      let slots = Array.isArray(slotsRes.data) ? slotsRes.data.filter((s: any) => s.isAvailable !== false) : []
      const appts = Array.isArray(apptsRes.data) ? apptsRes.data : []

      const blockingAppts = appts.filter((a: any) =>
        ['PENDING', 'SCHEDULED', 'CONFIRMED'].includes(a.status) &&
        dayjs(a.startTime).format('YYYY-MM-DD') === dateStr
      )

      slots = slots.filter((slot: Slot) => {
        const slotStart = dayjs(slot.startTime)
        return !blockingAppts.some((appt: any) => dayjs(appt.startTime).isSame(slotStart))
      })

      setAvailableSlots(slots)
    } catch {
      setAvailableSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }, [])

  /* ── Fetch month availability dots ── */
  const fetchMonthAvailability = useCallback(async (docId: number, monthStart: dayjs.Dayjs) => {
    const key = monthStart.format('YYYY-MM')
    const dim = monthStart.daysInMonth()
    try {
      const apptsRes = await api.get('/rendezvous', { params: { medecinId: docId } }).catch(() => ({ data: [] }))
      const appts = Array.isArray(apptsRes.data)
        ? apptsRes.data.filter((a: any) => ['PENDING', 'SCHEDULED', 'CONFIRMED'].includes(a.status))
        : []

      const checks = await Promise.all(
        Array.from({ length: dim }, async (_, i) => {
          const d = monthStart.date(i + 1)
          const dateStr = d.format('YYYY-MM-DD')
          try {
            const res = await api.get(`/disponibilites/${docId}/available-slots/${dateStr}`)
            let slots = Array.isArray(res.data) ? res.data.filter((s: any) => s.isAvailable !== false) : []
            slots = slots.filter((slot: Slot) => {
              const slotStart = dayjs(slot.startTime)
              return !appts.some((appt: any) => dayjs(appt.startTime).isSame(slotStart))
            })
            return { day: i + 1, ok: slots.length > 0 }
          } catch {
            return { day: i + 1, ok: false }
          }
        })
      )
      const days = checks.filter(c => c.ok).map(c => c.day)
      setDaysWithSlots(prev => ({ ...prev, [key]: days }))
    } catch { /* ignore */ }
  }, [])

  /* ── Trigger slot fetch ── */
  useEffect(() => {
    if (!doctor) return
    fetchSlots(doctor.id, selectedDate)
  }, [doctor, selectedDate, fetchSlots])

  /* ── Trigger month dots ── */
  useEffect(() => {
    if (!doctor) return
    fetchMonthAvailability(doctor.id, calendarMonth)
  }, [doctor, calendarMonth, fetchMonthAvailability])

  /* ── Booking ── */
  const handleBooking = async () => {
    if (!doctor || !selectedSlot) return
    const slot = availableSlots.find(s => dayjs(s.startTime).toISOString() === selectedSlot)
    if (!slot) {
      message.error('Selected slot is no longer available')
      return
    }

    setBookingLoading(true)
    try {
      await api.post(`/rendezvous/users/${patientId}`, {
        medecinId: doctor.id,
        patientName,
        startTime: dayjs(slot.startTime).toISOString(),
        endTime: dayjs(slot.endTime).toISOString(),
        type: appointmentType,
      })
      message.success('Appointment booked successfully!')
      setAvailableSlots(prev => prev.filter(s => dayjs(s.startTime).toISOString() !== selectedSlot))
      setSelectedSlot(null)
      fetchSlots(doctor.id, selectedDate)
    } catch (err: any) {
      const msg = err?.response?.data?.message
      message.error(typeof msg === 'string' ? msg : 'Failed to book appointment')
    } finally {
      setBookingLoading(false)
    }
  }

  /* ── Helpers ── */
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const today = dayjs()
  const firstDay = calendarMonth.day()
  const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = calendarMonth.daysInMonth()
  const calendarDays: (number | null)[] = [
    ...Array(adjustedFirst).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const monthKey = calendarMonth.format('YYYY-MM')
  const slotDays = daysWithSlots[monthKey] || []

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="dp-loading-wrapper">
        <Spin size="large" />
      </div>
    )
  }

  /* ── Error / Not Found ── */
  if (error || !doctor) {
    return (
      <div className="dp-error-state">
        <UserOutlined />
        <h2>Doctor not found</h2>
        <p>We couldn't find the doctor you're looking for.</p>
        <button className="dp-error-back-btn" onClick={() => navigate('/patient/find-doctor')}>
          <ArrowLeftOutlined />
          Back to Find Doctor
        </button>
      </div>
    )
  }

  return (
    <div className="doctor-profile-page">
      {/* ──── LEFT PANEL ──── */}
      <div className="dp-left">
        <button className="dp-back-btn" onClick={() => navigate('/patient/find-doctor')}>
          <ArrowLeftOutlined />
          Back to Find Doctor
        </button>

        {/* Hero Card */}
        <div className="dp-hero-card">
          <div className="dp-hero-avatar">
            {doctor.profilePhotoUrl ? (
              <img
                src={
                  doctor.profilePhotoUrl.startsWith('http')
                    ? doctor.profilePhotoUrl
                    : `http://localhost:3045${doctor.profilePhotoUrl}`
                }
                alt={doctor.fullName}
              />
            ) : (
              getInitials(doctor.fullName)
            )}
          </div>

          <div className="dp-hero-info">
            <h1 className="dp-hero-name">
              Dr. {doctor.fullName}
              {doctor.verificationStatus === 'APPROVED' && (
                <span className="dp-verified-badge">
                  <CheckCircleOutlined style={{ fontSize: 12 }} />
                  Verified
                </span>
              )}
            </h1>

            <p className="dp-hero-specialty">
              {doctor.specialty}
            </p>

            <div className="dp-hero-tags">
              <span className="dp-tag">
                <TrophyOutlined />
                {doctor.experience} years experience
              </span>
              <span className="dp-tag">
                <MedicineBoxOutlined />
                {doctor.specialty}
              </span>
              <span className="dp-tag">
                <ClockCircleOutlined />
                {doctor.consultationPrice
                  ? `${Number(doctor.consultationPrice).toFixed(2)} DT`
                  : 'Free consultation'}
              </span>
            </div>

            <div className="dp-hero-location">
              <EnvironmentOutlined />
              {doctor.practicePlace || doctor.clinicAddress}, {doctor.city}, {doctor.country}
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="dp-section">
          <h2 className="dp-section-title">
            <InfoCircleOutlined />
            About
          </h2>
          {doctor.bio ? (
            <p className="dp-bio-text">{doctor.bio}</p>
          ) : (
            <p className="dp-bio-placeholder">
              Dr. {doctor.fullName} is a {doctor.specialty} specialist with {doctor.experience} years
              of professional experience. They practice at {doctor.practicePlace || doctor.clinicAddress} in {doctor.city}, {doctor.country}.
            </p>
          )}
        </div>

        {/* Contact & Location */}
        <div className="dp-section">
          <h2 className="dp-section-title">
            <EnvironmentOutlined />
            Contact & Location
          </h2>
          <div className="dp-contact-grid">
            <div className="dp-contact-item">
              <div className="dp-contact-icon">
                <MailOutlined />
              </div>
              <div>
                <div className="dp-contact-label">Email</div>
                <div className="dp-contact-value">{doctor.email}</div>
              </div>
            </div>

            <div className="dp-contact-item">
              <div className="dp-contact-icon">
                <PhoneOutlined />
              </div>
              <div>
                <div className="dp-contact-label">Phone</div>
                <div className="dp-contact-value">{doctor.phone}</div>
              </div>
            </div>

            <div className="dp-contact-item">
              <div className="dp-contact-icon">
                <HomeOutlined />
              </div>
              <div>
                <div className="dp-contact-label">Clinic Address</div>
                <div className="dp-contact-value">{doctor.clinicAddress || doctor.practicePlace}</div>
              </div>
            </div>

            <div className="dp-contact-item">
              <div className="dp-contact-icon">
                <EnvironmentOutlined />
              </div>
              <div>
                <div className="dp-contact-label">City / Country</div>
                <div className="dp-contact-value">{doctor.city}, {doctor.country}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ──── RIGHT PANEL (Booking) ──── */}
      <div className="dp-right">
        <div className="dp-booking-panel">
          <h3 className="dp-booking-title">Book a Consultation</h3>
          <p className="dp-booking-subtitle">Select a date and time to schedule your visit</p>

          {/* Mini Calendar */}
          <div className="dp-calendar-header">
            <span className="dp-calendar-month">{calendarMonth.format('MMMM YYYY')}</span>
            <div className="dp-calendar-nav">
              <button onClick={() => setCalendarMonth(prev => prev.subtract(1, 'month'))}>
                <LeftOutlined />
              </button>
              <button onClick={() => setCalendarMonth(prev => prev.add(1, 'month'))}>
                <RightOutlined />
              </button>
            </div>
          </div>

          <div className="dp-calendar-grid">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
              <div key={d} className="dp-cal-day-label">{d}</div>
            ))}
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={i} className="dp-cal-day dp-cal-empty" />
              const dateObj = calendarMonth.date(day)
              const isToday = dateObj.isSame(today, 'day')
              const isSelected = dateObj.isSame(selectedDate, 'day')
              const isPast = dateObj.isBefore(today, 'day')
              const hasSlots = slotDays.includes(day)

              return (
                <div
                  key={i}
                  className={`dp-cal-day
                    ${isToday && !isSelected ? 'dp-cal-today' : ''}
                    ${isSelected ? 'dp-cal-selected' : ''}
                    ${isPast ? 'dp-cal-disabled' : ''}
                    ${hasSlots && !isSelected ? 'dp-cal-has-slots' : ''}
                  `}
                  onClick={() => {
                    if (isPast) return
                    setSelectedDate(dateObj)
                  }}
                >
                  {day}
                </div>
              )
            })}
          </div>

          {/* Available Slots */}
          <p className="dp-slots-title">Available Slots</p>
          {slotsLoading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin size="small" />
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="dp-no-slots">
              No available slots for this date
            </div>
          ) : (
            <div className="dp-slots-grid">
              {availableSlots.map(slot => {
                const iso = dayjs(slot.startTime).toISOString()
                const isPast = dayjs(slot.startTime).isBefore(dayjs())

                return (
                  <div
                    key={iso}
                    className={`dp-slot ${selectedSlot === iso ? 'selected' : ''}`}
                    onClick={() => {
                      if (!isPast) setSelectedSlot(iso)
                    }}
                    style={isPast ? {
                      opacity: 0.4,
                      cursor: 'not-allowed',
                      borderColor: '#E2E8F0',
                      color: '#94A3B8',
                      background: '#F8FAFC'
                    } : {}}
                  >
                    {dayjs(slot.startTime).format('hh:mm A')}
                  </div>
                )
              })}
            </div>
          )}

          {/* Appointment Type */}
          <div className="dp-type-row">
            <p className="dp-type-label">Appointment Type</p>
            <div className="dp-type-options">
              <div
                className={`dp-type-option ${appointmentType === 'standard' ? 'selected' : ''}`}
                onClick={() => setAppointmentType('standard')}
              >
                Standard
              </div>
              <div
                className={`dp-type-option ${appointmentType === 'followup' ? 'selected' : ''}`}
                onClick={() => setAppointmentType('followup')}
              >
                Follow-up
              </div>
            </div>
          </div>

          {/* Consultation Fee */}
          <div className="dp-fee-row">
            <span className="dp-fee-label">Consultation Fee</span>
            <span className="dp-fee-value">
              {doctor.consultationPrice
                ? `${Number(doctor.consultationPrice).toFixed(2)} DT`
                : 'Free'}
            </span>
          </div>

          {/* Confirm Button */}
          <button
            className={`dp-confirm-btn ${bookingLoading ? 'loading' : ''}`}
            disabled={!selectedSlot || bookingLoading}
            onClick={handleBooking}
          >
            {bookingLoading ? <Spin size="small" /> : 'CONFIRM BOOKING'}
          </button>

          <p className="dp-terms-text">
            By booking, you agree to our Terms of Service. Free
            cancellation up to 24 hours before the appointment.
          </p>
        </div>
      </div>
    </div>
  )
}

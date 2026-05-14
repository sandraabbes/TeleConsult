import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Spin, message } from 'antd'
import {
  SearchOutlined,
  EnvironmentOutlined,
  CheckOutlined,
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import dayjs from 'dayjs'
import './FindDoctor.css'

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
export default function FindDoctor() {
  const { user } = useAuth()
  const patientId = user?.id ? String(user.id) : ''
  const patientName = user?.fullName || user?.firstName || 'Patient'
  const navigate = useNavigate()

  // Doctors
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')

  useEffect(() => {
    const q = searchParams.get('q')
    if (q !== null && q !== searchQuery) {
      setSearchQuery(q)
    }
  }, [searchParams])
  const [specialtyFilter, setSpecialtyFilter] = useState<string | null>(null)
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false)
  const specialtyRef = useRef<HTMLDivElement>(null)

  // Location filters
  const [countryFilter, setCountryFilter] = useState<string | null>(null)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const countryRef = useRef<HTMLDivElement>(null)

  const [cityFilter, setCityFilter] = useState<string | null>(null)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const cityRef = useRef<HTMLDivElement>(null)

  // Selected doctor
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)

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

  // Doctor availability status cache
  const [availabilityMap, setAvailabilityMap] = useState<Record<number, boolean>>({})

  /* ── Fetch all doctors ── */
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true)
      try {
        const res = await api.get('/register-doctors')
        setDoctors(Array.isArray(res.data) ? res.data : [])
      } catch {
        message.error('Failed to load doctors')
      } finally {
        setLoading(false)
      }
    }
    fetchDoctors()
  }, [])

  /* ── Check today availability for each doctor ── */
  useEffect(() => {
    if (doctors.length === 0) return
    const todayStr = dayjs().format('YYYY-MM-DD')
    const checkAvailability = async () => {
      const apptsRes = await api.get('/rendezvous').catch(() => ({ data: [] }))
      const allAppts = Array.isArray(apptsRes.data) ? apptsRes.data : []

      const results = await Promise.all(
        doctors.map(async doc => {
          try {
            const r = await api.get(`/disponibilites/${doc.id}/available-slots/${todayStr}`)
            let slots = Array.isArray(r.data) ? r.data.filter((s:any) => s.isAvailable !== false) : []
            // Filter out booked appointments (frontend check)
            const docAppts = allAppts.filter((a: any) => a.medecinId === doc.id && ['PENDING', 'SCHEDULED', 'CONFIRMED'].includes(a.status))
            slots = slots.filter((slot: Slot) => !docAppts.some((appt: any) => dayjs(appt.startTime).isSame(dayjs(slot.startTime))))
            return { id: doc.id, available: slots.length > 0 }
          } catch {
            return { id: doc.id, available: false }
          }
        })
      )
      const map: Record<number, boolean> = {}
      results.forEach(r => {
        map[r.id] = r.available
      })
      setAvailabilityMap(map)
    }
    checkAvailability()
  }, [doctors])

  /* ── Close dropdowns on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (specialtyRef.current && !specialtyRef.current.contains(e.target as Node)) {
        setShowSpecialtyDropdown(false)
      }
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false)
      }
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setShowCityDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ── Map dependent filters ── */
  useEffect(() => {
    // Note: Since specialties, countries, etc. are derived from `doctors`, 
    // nothing more is needed on mount. But we can ensure cityFilter makes sense.
    if (cityFilter && countryFilter) {
      const cityIsValid = doctors.some(d => d.country === countryFilter && d.city === cityFilter)
      if (!cityIsValid) {
        setCityFilter(null)
      }
    }
  }, [countryFilter, cityFilter, doctors])

  /* ── Fetch available slots when doctor or date changes ── */
  const fetchSlots = useCallback(async (doctorId: number, date: dayjs.Dayjs) => {
    setSlotsLoading(true)
    setSelectedSlot(null)
    try {
      const dateStr = date.format('YYYY-MM-DD')
      
      const [slotsRes, apptsRes] = await Promise.all([
        api.get(`/disponibilites/${doctorId}/available-slots/${dateStr}`),
        api.get('/rendezvous', { params: { medecinId: doctorId } }).catch(() => ({ data: [] }))
      ])

      let slots = Array.isArray(slotsRes.data) ? slotsRes.data.filter((s: any) => s.isAvailable !== false) : []
      const appts = Array.isArray(apptsRes.data) ? apptsRes.data : []
      
      const blockingAppts = appts.filter((a: any) => 
        ['PENDING', 'SCHEDULED', 'CONFIRMED'].includes(a.status) &&
        dayjs(a.startTime).format('YYYY-MM-DD') === dateStr
      )

      // Frontend Check: Remove slots that overlap with an existing scheduled appointment
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

  /* ── Fetch days with availability for the month (calendar dots) ── */
  const fetchMonthAvailability = useCallback(async (doctorId: number, monthStart: dayjs.Dayjs) => {
    const key = monthStart.format('YYYY-MM')
    const dim = monthStart.daysInMonth()
    try {
      // Pre-fetch all appointments for this doctor to do frontend subtraction efficiently
      const apptsRes = await api.get('/rendezvous', { params: { medecinId: doctorId } }).catch(() => ({ data: [] }))
      const appts = Array.isArray(apptsRes.data) ? apptsRes.data.filter((a: any) => ['PENDING', 'SCHEDULED', 'CONFIRMED'].includes(a.status)) : []

      const checks = await Promise.all(
        Array.from({ length: dim }, async (_, i) => {
          const d = monthStart.date(i + 1)
          const dateStr = d.format('YYYY-MM-DD')
          try {
            const res = await api.get(`/disponibilites/${doctorId}/available-slots/${dateStr}`)
            let slots = Array.isArray(res.data) ? res.data.filter((s: any) => s.isAvailable !== false) : []
            // Subtract booked appointments
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

  /* ── Fetch slots when doctor or selected date changes ── */
  useEffect(() => {
    if (!selectedDoctor) return
    fetchSlots(selectedDoctor.id, selectedDate)
  }, [selectedDoctor, selectedDate, fetchSlots])

  /* ── Fetch month availability dots when doctor or calendar month changes ── */
  useEffect(() => {
    if (!selectedDoctor) return
    fetchMonthAvailability(selectedDoctor.id, calendarMonth)
  }, [selectedDoctor, calendarMonth, fetchMonthAvailability])

  /* ── Select a doctor ── */
  const handleSelectDoctor = (doc: Doctor) => {
    setSelectedDoctor(doc)
    setSelectedSlot(null)
    setSelectedDate(dayjs())
    setCalendarMonth(dayjs().startOf('month'))
    setDaysWithSlots({})
  }

  /* ── Confirm booking ── */
  const handleBooking = async () => {
    if (!selectedDoctor || !selectedSlot) return
    const slot = availableSlots.find(s => dayjs(s.startTime).toISOString() === selectedSlot)
    if (!slot) {
      message.error('Selected slot is no longer available')
      return
    }

    setBookingLoading(true)
    try {
      await api.post(`/rendezvous/users/${patientId}`, {
        medecinId: selectedDoctor.id,
        patientName,
        startTime: dayjs(slot.startTime).toISOString(),
        endTime: dayjs(slot.endTime).toISOString(),
        type: appointmentType,
      })
      message.success('Appointment booked successfully!')
      // Optimistically remove the booked slot from the UI immediately
      setAvailableSlots(prev => prev.filter(s => dayjs(s.startTime).toISOString() !== selectedSlot))
      setSelectedSlot(null)
      // Fetch fresh slots from backend to guarantee consistency
      fetchSlots(selectedDoctor.id, selectedDate)
    } catch (err: any) {
      const msg = err?.response?.data?.message
      message.error(typeof msg === 'string' ? msg : 'Failed to book appointment')
    } finally {
      setBookingLoading(false)
    }
  }

  /* ── Filtering ── */
  const specialties = [...new Set(doctors.map(d => d.specialty).filter(Boolean))].sort()
  const countries = [...new Set(doctors.map(d => d.country).filter(Boolean))].sort()
  
  // If a country is selected, only show cities from that country. Otherwise, show all.
  const cities = [...new Set(doctors
    .filter(d => !countryFilter || d.country === countryFilter)
    .map(d => d.city)
    .filter(Boolean))].sort()

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch =
      !searchQuery ||
      doc.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.city?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSpecialty = !specialtyFilter || doc.specialty === specialtyFilter
    const matchesCountry = !countryFilter || doc.country === countryFilter
    const matchesCity = !cityFilter || doc.city === cityFilter
    return matchesSearch && matchesSpecialty && matchesCountry && matchesCity
  })

  const clearFilters = () => {
    setSearchQuery('')
    setSpecialtyFilter(null)
    setCountryFilter(null)
    setCityFilter(null)
  }

  /* ── Calendar helpers ── */
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="fd-loading-wrapper">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="find-doctor-page">
      {/* ──── LEFT PANEL ──── */}
      <div className="fd-left">
        <div className="fd-page-header">
          <h1>Book a Consultation</h1>
          <p>Discover top specialists and schedule your next visit in seconds.</p>
        </div>

        {/* Search */}
        <div className="fd-search-wrapper">
          <SearchOutlined className="fd-search-icon" />
          <input
            className="fd-search-input"
            placeholder="Search by name, specialty or city..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              if (e.target.value.trim()) {
                setSearchParams({ q: e.target.value })
              } else {
                searchParams.delete('q')
                setSearchParams(searchParams)
              }
            }}
          />
        </div>

        {/* Filters */}
        <div className="fd-filters">
          <div className="fd-filter-wrapper" ref={specialtyRef}>
            <button
              className={`fd-filter-btn ${specialtyFilter ? 'active' : ''}`}
              onClick={() => {
                setShowSpecialtyDropdown(!showSpecialtyDropdown)
                setShowCountryDropdown(false)
                setShowCityDropdown(false)
              }}
            >
              <span className="anticon" style={{ fontSize: 13 }}>⚕</span>
              {specialtyFilter || 'Specialty'}
              <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
            </button>
            {showSpecialtyDropdown && (
              <div className="fd-specialty-dropdown">
                <div
                  className={`fd-specialty-item ${!specialtyFilter ? 'active' : ''}`}
                  onClick={() => {
                    setSpecialtyFilter(null)
                    setShowSpecialtyDropdown(false)
                  }}
                >
                  All Specialties
                </div>
                {specialties.map(s => (
                  <div
                    key={s}
                    className={`fd-specialty-item ${specialtyFilter === s ? 'active' : ''}`}
                    onClick={() => {
                      setSpecialtyFilter(s)
                      setShowSpecialtyDropdown(false)
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="fd-filter-wrapper" ref={countryRef}>
            <button
              className={`fd-filter-btn ${countryFilter ? 'active' : ''}`}
              onClick={() => {
                setShowCountryDropdown(!showCountryDropdown)
                setShowSpecialtyDropdown(false)
                setShowCityDropdown(false)
              }}
            >
              <EnvironmentOutlined />
              {countryFilter || 'Country'}
              <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
            </button>
            {showCountryDropdown && (
              <div className="fd-specialty-dropdown">
                <div
                  className={`fd-specialty-item ${!countryFilter ? 'active' : ''}`}
                  onClick={() => {
                    setCountryFilter(null)
                    setShowCountryDropdown(false)
                  }}
                >
                  All Countries
                </div>
                {countries.map(c => (
                  <div
                    key={c}
                    className={`fd-specialty-item ${countryFilter === c ? 'active' : ''}`}
                    onClick={() => {
                      setCountryFilter(c)
                      setShowCountryDropdown(false)
                    }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="fd-filter-wrapper" ref={cityRef}>
            <button
              className={`fd-filter-btn ${cityFilter ? 'active' : ''}`}
              onClick={() => {
                setShowCityDropdown(!showCityDropdown)
                setShowSpecialtyDropdown(false)
                setShowCountryDropdown(false)
              }}
            >
              <EnvironmentOutlined />
              {cityFilter || 'City'}
              <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
            </button>
            {showCityDropdown && (
              <div className="fd-specialty-dropdown">
                <div
                  className={`fd-specialty-item ${!cityFilter ? 'active' : ''}`}
                  onClick={() => {
                    setCityFilter(null)
                    setShowCityDropdown(false)
                  }}
                >
                  All Cities
                </div>
                {cities.map(c => (
                  <div
                    key={c}
                    className={`fd-specialty-item ${cityFilter === c ? 'active' : ''}`}
                    onClick={() => {
                      setCityFilter(c)
                      setShowCityDropdown(false)
                    }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            className={`fd-filter-btn`}
            onClick={() => {
              /* Availability filter could be added here if needed */
            }}
          >
            <CalendarOutlined />
            Availability
            <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
          </button>

          {(searchQuery || specialtyFilter || countryFilter || cityFilter) && (
            <button className="fd-clear-btn" onClick={clearFilters}>
              Clear all
            </button>
          )}
        </div>

        {/* Doctor List */}
        {filteredDoctors.length === 0 ? (
          <div className="fd-empty-state">
            <UserOutlined />
            <p>No doctors found matching your filters.</p>
          </div>
        ) : (
          <div className="fd-doctor-list">
            {filteredDoctors.map(doc => {
              const isSelected = selectedDoctor?.id === doc.id
              const isAvailable = availabilityMap[doc.id]

              return (
                <div
                  key={doc.id}
                  className={`fd-doctor-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectDoctor(doc)}
                >
                  {isSelected && (
                    <div className="fd-selected-check">
                      <CheckOutlined />
                    </div>
                  )}

                  <div className="fd-doctor-avatar">
                    {doc.profilePhotoUrl ? (
                      <img
                        src={
                          doc.profilePhotoUrl.startsWith('http')
                            ? doc.profilePhotoUrl
                            : `http://localhost:3045${doc.profilePhotoUrl}`
                        }
                        alt={doc.fullName}
                      />
                    ) : (
                      getInitials(doc.fullName)
                    )}
                  </div>

                  <div className="fd-doctor-info">
                    <p className="fd-doctor-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Dr. {doc.fullName}
                      {doc.verificationStatus === 'APPROVED' && (
                        <span
                          title="Verified by Teleconsult"
                          style={{
                            display: 'inline-flex',
                            color: '#1479FF',
                          }}
                        >
                          <CheckCircleOutlined style={{ fontSize: 13 }} />
                        </span>
                      )}
                    </p>
                    <p className="fd-doctor-specialty">
                      {doc.specialty} • {doc.experience} years exp.
                    </p>
                    <div className="fd-doctor-meta">
                      <span className="fd-doctor-meta-item">
                        <EnvironmentOutlined />
                        {doc.practicePlace || doc.clinicAddress}, {doc.city}
                      </span>
                      <span
                        className={`fd-availability-badge ${isAvailable ? '' : 'unavailable'}`}
                      >
                        <span className="fd-avail-dot" />
                        {isAvailable ? (
                          <>
                            <ClockCircleOutlined style={{ fontSize: 10 }} />
                            AVAILABLE TODAY
                          </>
                        ) : (
                          'CHECK SCHEDULE'
                        )}
                      </span>
                    </div>
                  </div>

                  

                  <button
                    className="fd-view-profile-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/patient/doctor/${doc.id}`)
                    }}
                  >
                    View Profile
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ──── RIGHT PANEL ──── */}
      <div className="fd-right">
        <div className="fd-schedule-panel">
          {!selectedDoctor ? (
            <div className="fd-no-selection">
              <CalendarOutlined />
              <p>Select a doctor to view<br />available time slots</p>
            </div>
          ) : (
            <>
              <h3 className="fd-schedule-title">Select Schedule</h3>

              {/* Mini Calendar */}
              <div className="fd-calendar-header">
                <span className="fd-calendar-month">{calendarMonth.format('MMMM YYYY')}</span>
                <div className="fd-calendar-nav">
                  <button
                    onClick={() => setCalendarMonth(prev => prev.subtract(1, 'month'))}
                  >
                    <LeftOutlined />
                  </button>
                  <button
                    onClick={() => setCalendarMonth(prev => prev.add(1, 'month'))}
                  >
                    <RightOutlined />
                  </button>
                </div>
              </div>

              <div className="fd-calendar-grid">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
                  <div key={d} className="fd-cal-day-label">{d}</div>
                ))}
                {calendarDays.map((day, i) => {
                  if (day === null) return <div key={i} className="fd-cal-day fd-cal-empty" />
                  const dateObj = calendarMonth.date(day)
                  const isToday = dateObj.isSame(today, 'day')
                  const isSelected = dateObj.isSame(selectedDate, 'day')
                  const isPast = dateObj.isBefore(today, 'day')
                  const hasSlots = slotDays.includes(day)

                  return (
                    <div
                      key={i}
                      className={`fd-cal-day
                        ${isToday && !isSelected ? 'fd-cal-today' : ''}
                        ${isSelected ? 'fd-cal-selected' : ''}
                        ${isPast ? 'fd-cal-disabled' : ''}
                        ${hasSlots && !isSelected ? 'fd-cal-has-slots' : ''}
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
              <p className="fd-slots-section-title">Available Slots</p>
              {slotsLoading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin size="small" />
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="fd-no-slots">
                  No available slots for this date
                </div>
              ) : (
                <div className="fd-slots-grid">
                  {availableSlots.map(slot => {
                    const iso = dayjs(slot.startTime).toISOString()
                    const isPast = dayjs(slot.startTime).isBefore(dayjs())
                    
                    return (
                      <div
                        key={iso}
                        className={`fd-slot ${selectedSlot === iso ? 'selected' : ''}`}
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
              <div className="fd-type-row">
                <p className="fd-type-label">Appointment Type</p>
                <div className="fd-type-options">
                  <div
                    className={`fd-type-option ${appointmentType === 'standard' ? 'selected' : ''}`}
                    onClick={() => setAppointmentType('standard')}
                  >
                    Standard
                  </div>
                  <div
                    className={`fd-type-option ${appointmentType === 'followup' ? 'selected' : ''}`}
                    onClick={() => setAppointmentType('followup')}
                  >
                    Follow-up
                  </div>
                </div>
              </div>

              {/* Consultation Fee */}
              <div className="fd-fee-row">
                <span className="fd-fee-label">Consultation Fee</span>
                <span className="fd-fee-value">
                  {selectedDoctor.consultationPrice
                    ? `${Number(selectedDoctor.consultationPrice).toFixed(2)} DT`
                    : 'Free'}
                </span>
              </div>

              {/* Confirm Button */}
              <button
                className={`fd-confirm-btn ${bookingLoading ? 'loading' : ''}`}
                disabled={!selectedSlot || bookingLoading}
                onClick={handleBooking}
              >
                {bookingLoading ? <Spin size="small" /> : 'CONFIRM BOOKING'}
              </button>

              <p className="fd-terms-text">
                By booking, you agree to our Terms of Service. Free
                cancellation up to 24 hours before the appointment.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

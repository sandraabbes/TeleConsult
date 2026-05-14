import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Button, Pagination, Spin, message } from 'antd'
import {
  CalendarOutlined,
  FileTextOutlined,
  DownloadOutlined,
  InboxOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import dayjs from 'dayjs'
import './MyConsultations.css'

const PAGE_SIZE = 10

export default function MyConsultations() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const patientId = user?.id ? String(user.id) : ''

  const [allAppointments, setAllAppointments] = useState<any[]>([])
  const [doctorsMap, setDoctorsMap] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  // Filters
  const [dateFilter, setDateFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchHistory()
  }, [patientId])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [dateFilter])

  const fetchHistory = async () => {
    if (!patientId || patientId === 'undefined') return
    setLoading(true)
    try {
      const res = await api.get(`/rendezvous/users/${patientId}/patient`)
      const appts = Array.isArray(res.data) ? res.data : []
      setAllAppointments(appts)

      // Fetch unique doctor details
      const uniqueIds = [...new Set(appts.map((a: any) => a.medecinId))].filter(Boolean) as number[]
      const details = await Promise.all(
        uniqueIds.map(id =>
          api.get(`/register-doctors/${id}`)
            .then(r => ({ id, data: r.data }))
            .catch(() => ({ id, data: null }))
        )
      )
      const map: Record<string, any> = {}
      details.forEach(({ id, data }) => { if (data) map[id] = data })
      setDoctorsMap(map)
    } catch {
      message.error('Failed to load consultation history')
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

  // Filter: only completed (past consultations)
  const getFilteredHistory = () => {
    let filtered = allAppointments.filter(a => {
      const s = (a.status || '').toUpperCase()
      return s === 'COMPLETED'
    })

    // Date filter
    const now = dayjs()
    if (dateFilter === 'last7') {
      filtered = filtered.filter(a => dayjs(a.startTime).isAfter(now.subtract(7, 'day')))
    } else if (dateFilter === 'last30') {
      filtered = filtered.filter(a => dayjs(a.startTime).isAfter(now.subtract(30, 'day')))
    } else if (dateFilter === 'last90') {
      filtered = filtered.filter(a => dayjs(a.startTime).isAfter(now.subtract(90, 'day')))
    }

    // Sort newest first
    return filtered.sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )
  }

  const filteredHistory = getFilteredHistory()
  const totalCount = filteredHistory.length
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="pat-consults-page">
      {/* Header */}
      <div className="pat-consults-page-header">
        <h1>Consultation History</h1>
        <p>Review all your past medical consultations and records.</p>
      </div>

      {/* Filters */}
      <div className="pat-consults-filters">
        <div style={{ display: 'flex', gap: 12 }}>
          <Select
            defaultValue="all"
            value={dateFilter}
            onChange={setDateFilter}
            style={{ width: 160 }}
            className="filter-select"
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'last7', label: 'Last 7 Days' },
              { value: 'last30', label: 'Last 30 Days' },
              { value: 'last90', label: 'Last 90 Days' },
            ]}
            suffixIcon={<CalendarOutlined style={{ color: '#64748B' }} />}
          />
        </div>
        <span className="pat-consults-results-text">
          {totalCount} consultation{totalCount !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* List */}
      {paginatedHistory.length === 0 ? (
        <div className="pat-consults-empty">
          <InboxOutlined />
          <p>No completed consultations found matching your filters.</p>
        </div>
      ) : (
        <div className="pat-consults-list">
          {paginatedHistory.map((item: any) => {
            const doc = getDoctorDetails(item.medecinId)
            const displayName = doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`

            return (
              <div key={item.id} className="pat-consult-card">
                <div className="pat-consult-doc-section">
                  <div className="pat-consult-doc-avatar">
                    {doc.profilePhotoUrl ? (
                      <img
                        src={doc.profilePhotoUrl.startsWith('http') ? doc.profilePhotoUrl : `http://localhost:3045${doc.profilePhotoUrl}`}
                        alt={displayName}
                      />
                    ) : (
                      getInitials(doc.name)
                      )}
                  </div>
                  <div>
                    <span className="pat-consult-label-tag">DOCTOR</span>
                    <p className="pat-consult-doc-name">{displayName}</p>
                    <p className="pat-consult-doc-specialty">{doc.specialty}</p>
                  </div>
                </div>

                <div className="pat-consult-appt-section">
                  <span className="pat-consult-label-tag">APPOINTMENT</span>
                  <p className="pat-consult-appt-type">{item.reason || item.type || 'General Consultation'}</p>
                  <p className="pat-consult-appt-date">
                    <CalendarOutlined />
                    {dayjs(item.startTime).format('MMM D, YYYY • hh:mm A')}
                  </p>
                </div>

                <div className="pat-consult-id-section">
                  <span className="pat-consult-label-tag">CONSULTATION ID</span>
                  <div className="pat-consult-id-value">
                    #{item.id}
                  </div>
                </div>

                <div className="pat-consult-actions">
                  <Button
                    icon={<FileTextOutlined />}
                    className="pat-consult-view-btn"
                    onClick={() => navigate(`/patient/consultations/${item.id}`)}
                  >
                    View Summary
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    type="text"
                    className="pat-consult-download-btn"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination footer */}
      {totalCount > PAGE_SIZE && (
        <div className="pat-consults-footer">
          <span className="pat-consults-results-text">
            Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} consultations
          </span>
          <Pagination
            current={currentPage}
            total={totalCount}
            pageSize={PAGE_SIZE}
            onChange={setCurrentPage}
            showSizeChanger={false}
          />
        </div>
      )}
    </div>
  )
}

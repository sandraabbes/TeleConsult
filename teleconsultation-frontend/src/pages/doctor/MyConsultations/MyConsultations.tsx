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
  const doctorId = Number(user?.id)

  const [allAppointments, setAllAppointments] = useState<any[]>([])
  const [patientsMap, setPatientsMap] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  // Filters
  const [dateFilter, setDateFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchHistory()
  }, [doctorId])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [dateFilter])

  const fetchHistory = async () => {
    if (!doctorId) return
    setLoading(true)
    try {
      const res = await api.get(`/rendezvous/medecin/${doctorId}`)
      const appts = res.data || []
      setAllAppointments(appts)

      // Fetch unique patient details
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
      message.error('Failed to load consultation history')
    } finally {
      setLoading(false)
    }
  }

  const getPatientName = (patientId: string) => {
    const p = patientsMap[patientId]
    if (!p) return 'Unknown Patient'
    return p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || 'Unknown Patient'
  }

  const getPatientInitials = (patientId: string) => {
    const p = patientsMap[patientId]
    if (!p) return 'U'
    if (p.firstName && p.lastName) return `${p.firstName[0]}${p.lastName[0]}`.toUpperCase()
    return (p.firstName || p.email || 'U')[0].toUpperCase()
  }

  // Filter: only completed (past consultations)
  const getFilteredHistory = () => {
    let filtered = allAppointments.filter(a => {
      const s = a.status?.toUpperCase()
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

  const formatPatientId = (patientId: string) => {
    if (!patientId) return 'N/A'
    const short = String(patientId).slice(0, 8).toUpperCase()
    return `#${short}-PT`
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="history-page">
      <div className="history-container">
        {/* Header */}
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>
            Consultation History
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
            Review and manage your complete historical patient record.
          </p>
        </div>

        {/* Filters */}
        <div className="filters-row">
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
        </div>

        {/* List */}
        {paginatedHistory.length === 0 ? (
          <div className="history-empty-state">
            <InboxOutlined />
            <p>No consultations found matching your filters.</p>
          </div>
        ) : (
          <div className="history-list">
            {paginatedHistory.map((item: any) => {
              return (
                <div key={item.id} className="history-card">
                  <div className="patient-info-section">
                    <div className="consultation-avatar">
                      {getPatientInitials(item.patientId)}
                    </div>
                    <div>
                      <span className="label-tag">PATIENT</span>
                      <p className="patient-name">{getPatientName(item.patientId)}</p>
                      <p className="patient-id">ID: {formatPatientId(item.patientId)}</p>
                    </div>
                  </div>

                  <div className="appt-info-section">
                    <span className="label-tag">APPOINTMENT</span>
                    <p className="appt-type">{item.reason || item.type || 'General Consultation'}</p>
                    <p className="appt-date">
                      <CalendarOutlined />
                      {dayjs(item.startTime).format('MMM D, YYYY • hh:mm A')}
                    </p>
                  </div>

                  <div className="status-section">
                    <span className="label-tag">CONSULTATION ID</span>
                    <div style={{ marginTop: 4, fontWeight: 500, color: '#334155' }}>
                      #{item.id}
                    </div>
                  </div>

                  <div className="actions-section">
                    <Button
                      icon={<FileTextOutlined />}
                      className="summary-btn"
                      onClick={() => navigate(`/doctor/consultations/${item.id}`)}
                    >
                      View Summary
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      type="text"
                      className="download-btn"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination footer */}
        {totalCount > PAGE_SIZE && (
          <div className="history-footer">
            <span className="results-text">
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
    </div>
  )
}

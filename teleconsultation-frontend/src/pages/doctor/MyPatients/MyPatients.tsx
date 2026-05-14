import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Input, Select, Button, Dropdown, Pagination, Spin, message } from 'antd'
import {
  SearchOutlined,
  MoreOutlined,
  EyeOutlined,
  FileTextOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import dayjs from 'dayjs'
import './MyPatients.css'

export default function MyPatients() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const doctorId = Number(user?.id)

  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchText, setSearchText] = useState(searchParams.get('q') || '')

  useEffect(() => {
    const q = searchParams.get('q')
    if (q !== null && q !== searchText) {
      setSearchText(q)
    }
  }, [searchParams])
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState('recent')
  const pageSize = 10

  useEffect(() => {
    fetchPatients()
  }, [doctorId])

  const fetchPatients = async () => {
    if (!doctorId) return
    setLoading(true)
    try {
      const apptRes = await api.get(`/rendezvous/medecin/${doctorId}`)
      const appts = apptRes.data || []

      const uniquePatientIds = [...new Set(appts.map((a: any) => String(a.patientId)))] as string[]

      const patientDetails = await Promise.all(
        uniquePatientIds.map(async (id) => {
          try {
            const res = await api.get(`/users/${id}`)
            const p = res.data?.data || res.data

            const patientAppts = appts
              .filter((a: any) => String(a.patientId) === String(id))
              .sort((a: any, b: any) =>
                new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
              )
            const lastVisit = patientAppts[0]?.startTime || null
            const totalConsultations = patientAppts.length

            return {
              id: id,
              fullName: p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
              firstName: p.firstName || '',
              lastName: p.lastName || '',
              email: p.email || '',
              phone: p.phone || '',
              gender: p.gender || '',
              birthdate: p.birthdate || p.dateOfBirth || '',
              lastVisit,
              totalConsultations,
              identifier: p.identifier || '',
            }
          } catch {
            return null
          }
        })
      )

      setPatients(patientDetails.filter(Boolean))
    } catch {
      message.error('Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  const getAge = (birthdate: string) => {
    if (!birthdate) return null
    return dayjs().diff(dayjs(birthdate), 'year')
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return parts[0][0]?.toUpperCase() || 'U'
  }

  const getAvatarColor = () => {
    return { bg: '#1677ff', text: '#ffffff' }
  }

  const formatLastVisit = (dateStr: string) => {
    if (!dateStr) return 'No visits yet'
    const d = dayjs(dateStr)
    if (d.isSame(dayjs(), 'day')) return `Today, ${d.format('hh:mm A')}`
    return d.format('MMM DD, YYYY')
  }

  const filteredPatients = patients.filter(p => {
    const search = searchText.toLowerCase()
    return (
      p.fullName?.toLowerCase().includes(search) ||
      p.email?.toLowerCase().includes(search) ||
      p.identifier?.toLowerCase().includes(search)
    )
  }).sort((a, b) => {
    if (sortOrder === 'recent') {
      return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
    } else if (sortOrder === 'name') {
      return a.fullName.localeCompare(b.fullName)
    } else if (sortOrder === 'consultations') {
      return b.totalConsultations - a.totalConsultations
    }
    return 0
  })

  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
      <Spin size="large" />
    </div>
  )

  return (
    <div className="patients-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
            Patients
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
            Manage and monitor your {patients.length} active patient records.
          </p>
        </div>
      </div>

      <div style={{
        background: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #F3F4F6',
        padding: '14px 20px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
          placeholder="Filter by name, ID..."
          value={searchText}
          onChange={e => {
            setSearchText(e.target.value)
            setCurrentPage(1)
            if (e.target.value.trim()) {
              setSearchParams({ q: e.target.value })
            } else {
              searchParams.delete('q')
              setSearchParams(searchParams)
            }
          }}
          style={{ maxWidth: 300, borderRadius: 8, height: 36, fontSize: 13 }}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>Sort by:</span>
          <Select
            value={sortOrder}
            onChange={setSortOrder}
            style={{ width: 140, fontSize: 13 }}
            options={[
              { value: 'recent', label: 'Recent Visit' },
              { value: 'name', label: 'Name' },
              { value: 'consultations', label: 'Most Consultations' },
            ]}
          />
        </div>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
        <div className="patients-table-header">
          <div className="patients-col-id">ID</div>
          <div className="patients-col-name">PATIENT NAME</div>
          <div className="patients-col-contact">CONTACT</div>
          <div className="patients-col-visit">LAST VISIT</div>
          <div className="patients-col-actions">ACTIONS</div>
        </div>

        {paginatedPatients.map(patient => {
          const color = getAvatarColor()
          const age = getAge(patient.birthdate)
          return (
            <div
              key={patient.id}
              className="patients-table-row"
              onClick={() => navigate(`/doctor/patients/${patient.id}`)}
            >
              <div className="patients-col-id">
                <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>
                  #{patient.identifier?.replace('PTN-', '') || String(patient.id).slice(0, 6).toUpperCase()}
                </span>
              </div>
              <div className="patients-col-name">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: color.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 500,
                    color: color.text,
                    flexShrink: 0
                  }}>
                    {getInitials(patient.fullName)}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>
                      {patient.fullName}
                    </p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                      {age ? `${age} years` : ''}{age && patient.gender ? ' • ' : ''}{patient.gender}
                    </p>
                  </div>
                </div>
              </div>
              <div className="patients-col-contact">
                <span style={{ fontSize: 13, color: '#374151' }}>
                  {patient.phone || patient.email || 'N/A'}
                </span>
              </div>
              <div className="patients-col-visit">
                <span style={{ fontSize: 13, color: '#374151' }}>
                  {formatLastVisit(patient.lastVisit)}
                </span>
              </div>
              <div className="patients-col-actions" onClick={e => e.stopPropagation()}>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'view',
                        icon: <EyeOutlined />,
                        label: 'View profile',
                        onClick: () => navigate(`/doctor/patients/${patient.id}`),
                      },
                      {
                        key: 'records',
                        icon: <FileTextOutlined />,
                        label: 'Medical records',
                        onClick: () => navigate(`/doctor/patients/${patient.id}`),
                      },
                    ]
                  }}
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

        {paginatedPatients.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9CA3AF' }}>
            <TeamOutlined style={{ fontSize: 40, marginBottom: 12 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No patients found</p>
          </div>
        )}

        {filteredPatients.length > 0 && (
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid #F3F4F6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: 13, color: '#6B7280' }}>
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredPatients.length)}-{Math.min(currentPage * pageSize, filteredPatients.length)} of {filteredPatients.length} patients
            </span>
            <Pagination
              current={currentPage}
              total={filteredPatients.length}
              pageSize={pageSize}
              onChange={setCurrentPage}
              showSizeChanger={false}
              size="small"
            />
          </div>
        )}
      </div>
    </div>
  )
}

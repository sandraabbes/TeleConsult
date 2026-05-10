import { useState, useEffect, useCallback } from 'react'
import { Button, Spin, message, Popconfirm } from 'antd'
import {
  UserOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  LockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import './Profile.css'

/* ───────── Types ───────── */

interface PatientProfile {
  id: string
  firstName: string
  lastName: string
  fullName?: string
  email: string
  phone: string
  dateOfBirth?: string
}

type TabKey = 'personal' | 'security'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'security', label: 'Security' },
]

/* ───────── Component ───────── */

const Profile = () => {
  const { user, updateUser, logout } = useAuth()
  const patientId = String(user?.id)

  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState<PatientProfile | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('personal')

  // Editing state per section
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form values
  const [formValues, setFormValues] = useState<Record<string, string>>({})

  // Password fields
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Feedback messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  /* ── Fetch profile ── */
  const fetchProfile = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const res = await api.get(`/users/${patientId}`)
      // Extract the patient array/object from the response payload
      const patientData = res.data?.data || res.data
      setPatient(patientData)
    } catch {
      message.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Auto-dismiss messages
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4000)
      return () => clearTimeout(t)
    }
  }, [successMsg])

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 4000)
      return () => clearTimeout(t)
    }
  }, [errorMsg])

  /* ── Editing helpers ── */
  const startEditing = (section: string, initialValues: Record<string, string>) => {
    setEditingSection(section)
    setFormValues(initialValues)
    setPasswordError(null)
  }

  const cancelEditing = () => {
    setEditingSection(null)
    setFormValues({})
    setPasswordError(null)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormValues(prev => ({ ...prev, [field]: value }))
  }

  /* ── Save handlers ── */
  const savePersonalInfo = async () => {
    if (!patient) return
    setSaving(true)
    try {
      const payload: Record<string, any> = { ...patient } // PUT usually requires full payload
      if (formValues.firstName) payload.firstName = formValues.firstName
      if (formValues.lastName) payload.lastName = formValues.lastName
      if (formValues.phone) payload.phone = formValues.phone

      const res = await api.put(`/users/${patient.id}`, payload)
      const updatedPatient = res.data?.data || res.data
      
      setPatient(prev => prev ? { ...prev, ...updatedPatient } : prev)

      if (payload.firstName || payload.lastName || updatedPatient.firstName || updatedPatient.lastName) {
        updateUser({ 
          firstName: updatedPatient.firstName || payload.firstName, 
          lastName: updatedPatient.lastName || payload.lastName,
          fullName: `${updatedPatient.firstName || payload.firstName || ''} ${updatedPatient.lastName || payload.lastName || ''}`.trim()
        })
      }

      setSuccessMsg('Personal information updated successfully')
      cancelEditing()
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to update personal info')
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async () => {
    setPasswordError(null)
    const pwd = formValues.password || ''
    const confirmPwd = formValues.confirmPassword || ''

    if (!pwd) {
      setPasswordError('Please enter a new password')
      return
    }
    if (pwd.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    if (pwd !== confirmPwd) {
      setPasswordError('Passwords do not match')
      return
    }

    if (!patient) return
    setSaving(true)
    try {
      await api.put(`/users/${patient.id}`, {
        ...patient,
        password: pwd,
        confirmPassword: confirmPwd,
      })
      setSuccessMsg('Password updated successfully')
      cancelEditing()
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProfile = async () => {
    if (!patient) return
    try {
      await api.delete(`/users/${patient.id}`)
      message.success('Profile deleted successfully')
      logout()
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to delete profile')
    }
  }

  /* ── Render helpers ── */
  const renderValue = (value: string | number | null | undefined, fallback = 'Not set') => {
    if (value === null || value === undefined || value === '') {
      return <span className="profile-value empty">{fallback}</span>
    }
    return <span className="profile-value">{value}</span>
  }

  const getInitials = (first: string, last: string) => {
    return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase().slice(0, 2)
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="profile-page">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <Spin size="large" />
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="profile-page">
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9CA3AF' }}>
          <UserOutlined style={{ fontSize: 40, marginBottom: 12 }} />
          <p>Could not load profile</p>
          <Button onClick={fetchProfile}>Retry</Button>
        </div>
      </div>
    )
  }

  const displayName = patient.fullName || `${patient.firstName} ${patient.lastName}`

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <div>
          <h1>My Profile</h1>
          <p>View and manage your personal information and account settings.</p>
        </div>
        <div className="profile-header-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchProfile}
            style={{
              borderRadius: 20,
              fontWeight: 600,
              height: 36,
              fontSize: 13,
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Feedback messages */}
      {successMsg && (
        <div className="profile-success-msg">
          <CheckCircleOutlined />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="profile-error-msg">
          <CloseCircleOutlined />
          {errorMsg}
        </div>
      )}

      {/* Avatar section */}
      <div className="profile-avatar-section">
        <div className="profile-avatar-wrapper">
          <div className="profile-avatar-placeholder">
            {getInitials(patient.firstName || '', patient.lastName || '')}
          </div>
        </div>
        <div className="profile-avatar-info">
          <h2>{displayName}</h2>
          <p>{patient.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        {TABS.map(tab => (
          <div
            key={tab.key}
            className={`profile-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* ══════════ PERSONAL INFO TAB ══════════ */}
      {activeTab === 'personal' && (
        <div className="profile-section">
          <div className="profile-section-header">
            <h3>
              <UserOutlined />
              Basic Information
            </h3>
            {editingSection !== 'personal' ? (
              <Button
                icon={<EditOutlined />}
                size="small"
                onClick={() =>
                  startEditing('personal', {
                    firstName: patient.firstName || '',
                    lastName: patient.lastName || '',
                    phone: patient.phone || '',
                  })
                }
                style={{ borderRadius: 16, fontWeight: 600, fontSize: 12 }}
              >
                Edit
              </Button>
            ) : (
              <Button
                icon={<CloseOutlined />}
                size="small"
                onClick={cancelEditing}
                style={{ borderRadius: 16, fontWeight: 600, fontSize: 12 }}
              >
                Cancel
              </Button>
            )}
          </div>

          <div className="profile-section-body">
            {editingSection === 'personal' ? (
              <div className="profile-form-grid">
                <div className="profile-form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={formValues.firstName || ''}
                    onChange={e => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="profile-form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={formValues.lastName || ''}
                    onChange={e => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
                <div className="profile-form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={formValues.phone || ''}
                    onChange={e => handleInputChange('phone', e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="profile-form-group">
                  <label>Email</label>
                  <span className="profile-value">{patient.email}</span>
                </div>
                {patient.dateOfBirth && (
                  <div className="profile-form-group">
                    <label>Date of Birth</label>
                    <span className="profile-value">{new Date(patient.dateOfBirth).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="profile-form-grid">
                <div className="profile-form-group">
                  <label>First Name</label>
                  {renderValue(patient.firstName)}
                </div>
                <div className="profile-form-group">
                  <label>Last Name</label>
                  {renderValue(patient.lastName)}
                </div>
                <div className="profile-form-group">
                  <label>Phone</label>
                  {renderValue(patient.phone)}
                </div>
                <div className="profile-form-group">
                  <label>Email</label>
                  {renderValue(patient.email)}
                </div>
                {patient.dateOfBirth && (
                  <div className="profile-form-group">
                    <label>Date of Birth</label>
                    {renderValue(new Date(patient.dateOfBirth).toLocaleDateString())}
                  </div>
                )}
              </div>
            )}
          </div>

          {editingSection === 'personal' && (
            <div className="profile-section-footer">
              <Button
                onClick={cancelEditing}
                style={{ borderRadius: 20, fontWeight: 600, height: 34, fontSize: 13 }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={savePersonalInfo}
                style={{
                  background: '#1479FF',
                  borderColor: '#1479FF',
                  borderRadius: 20,
                  fontWeight: 600,
                  height: 34,
                  fontSize: 13,
                }}
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ══════════ SECURITY TAB ══════════ */}
      {activeTab === 'security' && (
        <div className="profile-security-container">
          <div className="profile-section">
            <div className="profile-section-header">
              <h3>
                <LockOutlined />
                Change Password
              </h3>
              {editingSection !== 'security' ? (
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() =>
                    startEditing('security', {
                      password: '',
                      confirmPassword: '',
                    })
                  }
                  style={{ borderRadius: 16, fontWeight: 600, fontSize: 12 }}
                >
                  Change
                </Button>
              ) : (
                <Button
                  icon={<CloseOutlined />}
                  size="small"
                  onClick={cancelEditing}
                  style={{ borderRadius: 16, fontWeight: 600, fontSize: 12 }}
                >
                  Cancel
                </Button>
              )}
            </div>

            <div className="profile-section-body">
              {editingSection === 'security' ? (
                <>
                  <div className="profile-password-grid">
                    <div className="profile-form-group">
                      <label>New Password</label>
                      <div className="profile-password-input-wrapper">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formValues.password || ''}
                          onChange={e => handleInputChange('password', e.target.value)}
                          placeholder="Enter new password"
                        />
                        <button
                          className="profile-password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          type="button"
                        >
                          {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        </button>
                      </div>
                      <span className="profile-password-hint">Minimum 8 characters</span>
                    </div>
                    <div className="profile-form-group">
                      <label>Confirm New Password</label>
                      <div className="profile-password-input-wrapper">
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          value={formValues.confirmPassword || ''}
                          onChange={e => handleInputChange('confirmPassword', e.target.value)}
                          placeholder="Re-enter new password"
                        />
                        <button
                          className="profile-password-toggle"
                          onClick={() => setShowConfirm(!showConfirm)}
                          type="button"
                        >
                          {showConfirm ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {passwordError && (
                    <p className="profile-password-error">
                      <CloseCircleOutlined style={{ marginRight: 4 }} />
                      {passwordError}
                    </p>
                  )}
                </>
              ) : (
                <div className="profile-form-grid">
                  <div className="profile-form-group">
                    <label>Password</label>
                    <span className="profile-value">••••••••••</span>
                  </div>
                  <div className="profile-form-group">
                    <label>Last Changed</label>
                    <span className="profile-value empty">Not tracked</span>
                  </div>
                </div>
              )}
            </div>

            {editingSection === 'security' && (
              <div className="profile-section-footer">
                <Button
                  onClick={cancelEditing}
                  style={{ borderRadius: 20, fontWeight: 600, height: 34, fontSize: 13 }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={savePassword}
                  style={{
                    background: '#1479FF',
                    borderColor: '#1479FF',
                    borderRadius: 20,
                    fontWeight: 600,
                    height: 34,
                    fontSize: 13,
                  }}
                >
                  Update Password
                </Button>
              </div>
            )}
          </div>

          <div className="profile-section profile-danger-zone">
            <div className="profile-section-header">
                <h3 style={{ color: '#DC2626' }}>
                <DeleteOutlined style={{ color: '#DC2626' }} />
                Danger Zone
                </h3>
            </div>
            <div className="profile-section-body">
                <p style={{ color: '#4B5563', marginBottom: '16px', fontSize: '13px' }}>
                Once you delete your account, there is no going back. Please be certain.
                </p>
                <Popconfirm
                title="Delete your account?"
                description="Are you sure you want to permanently delete your profile?"
                onConfirm={handleDeleteProfile}
                okText="Yes, delete it"
                okButtonProps={{ danger: true }}
                cancelText="No, cancel"
                >
                <Button className="danger_btn">
                    Delete Account
                </Button>
                </Popconfirm>
            </div>
            </div>
        </div>
      )}
    </div>
  )
}

export default Profile

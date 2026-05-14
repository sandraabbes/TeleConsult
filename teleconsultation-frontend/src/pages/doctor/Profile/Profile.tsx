import { useState, useEffect, useCallback, useRef } from 'react'
import { Button, Spin, message } from 'antd'
import {
  UserOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  LockOutlined,
  MedicineBoxOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import { Popconfirm } from 'antd'
import './Profile.css'

/* ───────── Types ───────── */

interface DoctorProfile {
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
  bio: string | null
  consultationPrice: number | null
  profilePhotoUrl: string | null
  verificationStatus?: string
}

type TabKey = 'personal' | 'address' | 'security'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'address', label: 'Address & Practice' },
  { key: 'security', label: 'Security' },
]

/* ───────── Component ───────── */

const Profile = () => {
  const { user, updateUser } = useAuth()
  const doctorId = Number(user?.id)

  const [loading, setLoading] = useState(true)
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null)
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
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── Fetch profile ── */
  const fetchProfile = useCallback(async () => {
    if (!doctorId) return
    setLoading(true)
    try {
      const res = await api.get(`/register-doctors/${doctorId}`)
      setDoctor(res.data)
      // Sync avatar to AuthContext for sidebar and other components
      if (res.data?.profilePhotoUrl) {
        updateUser({ avatarUrl: res.data.profilePhotoUrl })
      }
    } catch {
      message.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [doctorId])

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
    if (!doctor) return
    setSaving(true)
    try {
      const payload: Record<string, any> = {}
      if (formValues.fullName && formValues.fullName !== doctor.fullName) payload.fullName = formValues.fullName
      if (formValues.phone && formValues.phone !== doctor.phone) payload.phone = formValues.phone
      if (formValues.bio !== undefined && formValues.bio !== (doctor.bio || '')) payload.bio = formValues.bio
      if (formValues.consultationPrice && formValues.consultationPrice !== String(doctor.consultationPrice || ''))
        payload.consultationPrice = Number(formValues.consultationPrice)

      if (Object.keys(payload).length === 0) {
        cancelEditing()
        return
      }

      const res = await api.patch(`/register-doctors/${doctor.id}`, payload)
      setDoctor(prev => prev ? { ...prev, ...res.data } : prev)

      if (payload.fullName) {
        updateUser({ fullName: payload.fullName })
      }

      setSuccessMsg('Personal information updated successfully')
      cancelEditing()
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to update personal info')
    } finally {
      setSaving(false)
    }
  }

  const saveAddressInfo = async () => {
    if (!doctor) return
    setSaving(true)
    try {
      const payload: Record<string, any> = {}
      if (formValues.country && formValues.country !== doctor.country) payload.country = formValues.country
      if (formValues.city && formValues.city !== doctor.city) payload.city = formValues.city
      if (formValues.clinicAddress && formValues.clinicAddress !== doctor.clinicAddress) payload.clinicAddress = formValues.clinicAddress
      if (formValues.practicePlace && formValues.practicePlace !== doctor.practicePlace) payload.practicePlace = formValues.practicePlace

      if (Object.keys(payload).length === 0) {
        cancelEditing()
        return
      }

      const res = await api.patch(`/register-doctors/${doctor.id}`, payload)
      setDoctor(prev => prev ? { ...prev, ...res.data } : prev)
      setSuccessMsg('Address information updated successfully')
      cancelEditing()
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to update address info')
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

    if (!doctor) return
    setSaving(true)
    try {
      await api.patch(`/register-doctors/${doctor.id}`, {
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
    if (!doctor) return
    try {
      // NOTE: Replace with the actual delete endpoint when implemented on the server
      await api.delete(`/register-doctors/${doctor.id}`)
      message.success('Profile deleted successfully')
      // Note: Assuming logout function from useAuth is 'updateUser({ logout: true })' 
      // or similar. Since 'logout' isn't explicitly extracted from useAuth right now, 
      // we'll reload the page to kick the user out if their session is dead, 
      // or force a logout via context.
      window.location.href = '/'
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

  /* ── Avatar upload ── */
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !doctor) return

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      message.error('Please select a JPG, PNG, or WebP image')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      message.error('Image must be less than 5MB')
      return
    }

    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append('profilePhoto', file)

      const res = await api.patch(`/register-doctors/${doctor.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const newUrl = res.data?.profilePhotoUrl || doctor.profilePhotoUrl
      setDoctor(prev => prev ? { ...prev, profilePhotoUrl: newUrl } : prev)
      updateUser({ avatarUrl: newUrl })
      setSuccessMsg('Profile photo updated successfully')
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to upload photo')
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
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

  if (!doctor) {
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
          {doctor.profilePhotoUrl ? (
            <img
              src={doctor.profilePhotoUrl.startsWith('http') ? doctor.profilePhotoUrl : `http://localhost:3045${doctor.profilePhotoUrl}`}
              alt={doctor.fullName}
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar-placeholder">
              {getInitials(doctor.fullName)}
            </div>
          )}
          <button
            className="profile-avatar-edit-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            title="Change profile photo"
          >
            {avatarUploading ? <Spin size="small" /> : <EditOutlined />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>
        <div className="profile-avatar-info">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {doctor.fullName}
            {doctor.verificationStatus === 'APPROVED' && (
              <span
                title="Verified by Teleconsult"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: 20,
                  padding: '2px 10px 2px 6px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#1479FF',
                }}
              >
                <CheckCircleOutlined style={{ fontSize: 13 }} />
                Verified
              </span>
            )}
          </h2>
          <p>{doctor.email}</p>
          <div className="profile-badge">
            <MedicineBoxOutlined />
            {doctor.specialty} · {doctor.experience} yrs experience
          </div>
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
        <>
          {/* Basic Info Section */}
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
                      fullName: doctor.fullName,
                      phone: doctor.phone,
                      bio: doctor.bio || '',
                      consultationPrice: String(doctor.consultationPrice || ''),
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
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={formValues.fullName || ''}
                      onChange={e => handleInputChange('fullName', e.target.value)}
                      placeholder="Enter full name"
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
                    <span className="profile-value">{doctor.email}</span>
                  </div>
                  <div className="profile-form-group">
                    <label>Consultation Price (DT)</label>
                    <input
                      type="number"
                      value={formValues.consultationPrice || ''}
                      onChange={e => handleInputChange('consultationPrice', e.target.value)}
                      placeholder="e.g. 50"
                      min="0"
                      step="5"
                    />
                  </div>
                  <div className="profile-form-group full-width">
                    <label>Bio</label>
                    <textarea
                      value={formValues.bio || ''}
                      onChange={e => handleInputChange('bio', e.target.value)}
                      placeholder="Tell patients about yourself, your experience, and your approach to care..."
                      rows={4}
                    />
                  </div>
                </div>
              ) : (
                <div className="profile-form-grid">
                  <div className="profile-form-group">
                    <label>Full Name</label>
                    {renderValue(doctor.fullName)}
                  </div>
                  <div className="profile-form-group">
                    <label>Phone</label>
                    {renderValue(doctor.phone)}
                  </div>
                  <div className="profile-form-group">
                    <label>Email</label>
                    {renderValue(doctor.email)}
                  </div>
                  <div className="profile-form-group">
                    <label>Consultation Price</label>
                    {renderValue(
                      doctor.consultationPrice ? `${doctor.consultationPrice} DT` : null,
                      'Not set'
                    )}
                  </div>
                  <div className="profile-form-group full-width">
                    <label>Bio</label>
                    {renderValue(doctor.bio, 'No bio added yet')}
                  </div>
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

          {/* Professional Details (read-only) */}
          <div className="profile-section">
            <div className="profile-section-header">
              <h3>
                <MedicineBoxOutlined />
                Professional Details
              </h3>
            </div>
            <div className="profile-section-body">
              <div className="profile-form-grid">
                <div className="profile-form-group">
                  <label>Specialty</label>
                  {renderValue(doctor.specialty)}
                </div>
                <div className="profile-form-group">
                  <label>Years of Experience</label>
                  {renderValue(doctor.experience ? `${doctor.experience} years` : null)}
                </div>

              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════ ADDRESS TAB ══════════ */}
      {activeTab === 'address' && (
        <div className="profile-section">
          <div className="profile-section-header">
            <h3>
              <EnvironmentOutlined />
              Address & Practice Location
            </h3>
            {editingSection !== 'address' ? (
              <Button
                icon={<EditOutlined />}
                size="small"
                onClick={() =>
                  startEditing('address', {
                    country: doctor.country,
                    city: doctor.city,
                    clinicAddress: doctor.clinicAddress,
                    practicePlace: doctor.practicePlace,
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
            {editingSection === 'address' ? (
              <div className="profile-form-grid">
                <div className="profile-form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    value={formValues.country || ''}
                    onChange={e => handleInputChange('country', e.target.value)}
                    placeholder="Enter country"
                  />
                </div>
                <div className="profile-form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={formValues.city || ''}
                    onChange={e => handleInputChange('city', e.target.value)}
                    placeholder="Enter city"
                  />
                </div>
                <div className="profile-form-group full-width">
                  <label>Clinic Address</label>
                  <input
                    type="text"
                    value={formValues.clinicAddress || ''}
                    onChange={e => handleInputChange('clinicAddress', e.target.value)}
                    placeholder="Enter clinic address"
                  />
                </div>
                <div className="profile-form-group full-width">
                  <label>Practice Place</label>
                  <input
                    type="text"
                    value={formValues.practicePlace || ''}
                    onChange={e => handleInputChange('practicePlace', e.target.value)}
                    placeholder="Enter practice place / hospital"
                  />
                </div>
              </div>
            ) : (
              <div className="profile-form-grid">
                <div className="profile-form-group">
                  <label>Country</label>
                  {renderValue(doctor.country)}
                </div>
                <div className="profile-form-group">
                  <label>City</label>
                  {renderValue(doctor.city)}
                </div>
                <div className="profile-form-group full-width">
                  <label>Clinic Address</label>
                  {renderValue(doctor.clinicAddress)}
                </div>
                <div className="profile-form-group full-width">
                  <label>Practice Place</label>
                  {renderValue(doctor.practicePlace)}
                </div>
              </div>
            )}
          </div>

          {editingSection === 'address' && (
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
                onClick={saveAddressInfo}
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
        <>
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
      </>
      )}
    </div>
  )
}

export default Profile

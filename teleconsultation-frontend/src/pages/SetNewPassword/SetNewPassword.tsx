import React, { useState } from 'react';
import { Input, Button, message } from 'antd';
import { SafetyCertificateOutlined, SafetyOutlined, CheckCircleOutlined, KeyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { patientResetPassword, doctorResetPassword } from '../../api/auth';
import teleconsultLogo from '../../assets/images/Teleconsult.png';
import './SetNewPassword.css';

const requirements = [
  { text: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { text: 'At least one uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { text: 'At least one number', test: (p: string) => /[0-9]/.test(p) },
  { text: 'At least one special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const features = [
  { icon: <CheckCircleOutlined />, text: "Strong password protects your data" },
  { icon: <SafetyOutlined />, text: "Your data is always encrypted" },
];

const SetNewPassword: React.FC = () => {
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async () => {
    if (!code || !newPassword || !confirmPassword) {
      message.error('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      message.error('Passwords do not match');
      return;
    }

    const allPassed = requirements.every(r => r.test(newPassword));
    if (!allPassed) {
      message.error('Password does not meet all requirements');
      return;
    }

    setLoading(true);
    try {
      const email = localStorage.getItem('reset_email') || '';
      const userType = localStorage.getItem('reset_userType');

      if (!email || !userType) {
        message.error('Reset session expired. Please request a new code.');
        navigate('/forgot-password');
        return;
      }

      if (userType === 'patient') {
        await patientResetPassword(email, code, newPassword, confirmPassword);
      } else {
        await doctorResetPassword(email, code, newPassword, confirmPassword);
      }
      localStorage.removeItem('reset_email');
      localStorage.removeItem('reset_userType');
      setSuccess(true);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="set-password-page">
      <div className="set-password-left-panel">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div>
            <img
              src={teleconsultLogo}
              alt="Teleconsult"
              style={{ cursor: 'pointer', filter: 'brightness(0) invert(1)', maxWidth: 180, width: '100%', marginBottom: 32 }}
              onClick={() => navigate('/')}
            />
            <div style={{ color: '#FFF', opacity: 0.7, textTransform: 'uppercase', letterSpacing: 2, fontSize: 11, fontWeight: 600, marginBottom: 8, fontFamily: 'Manrope' }}>
              PASSWORD RESET
            </div>
            <h1 style={{ color: '#FFF', fontSize: 26, fontWeight: 800, lineHeight: 1.2, marginBottom: 10, fontFamily: 'Manrope' }}>
              Create a new password
            </h1>
            <p style={{ color: '#FFF', opacity: 0.75, fontSize: 13, marginBottom: 24, fontFamily: 'Manrope' }}>
              Choose a strong password to keep your account safe.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(8px)', marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: 'white' }}>
                  {f.icon}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontFamily: 'Manrope' }}>
                  {f.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="set-password-right-panel">
        <div className="set-password-topbar">
          <a href="#" style={{ color: '#6B7280', fontSize: 14, fontWeight: 500, fontFamily: 'Manrope' }}>Help Center</a>
          <Button type="default" style={{ color: '#1479FF', borderColor: '#1479FF', borderRadius: 24, fontWeight: 600, background: 'transparent', fontFamily: 'Manrope' }}>
            Contact Clinic
          </Button>
        </div>
        
        <div className="set-password-form-area">
          <div className="set-password-form-container">
            {success ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 72,
                  height: 72,
                  background: '#DCFCE7',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: 32
                }}>
                  <CheckCircleOutlined style={{ color: '#22C55E' }} />
                </div>
                <h2 style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#1479FF',
                  marginBottom: 8,
                  fontFamily: 'Manrope'
                }}>
                  Password reset successfully!
                </h2>
                <p style={{
                  fontSize: 13,
                  color: '#6B7280',
                  marginBottom: 28,
                  lineHeight: 1.6,
                  fontFamily: 'Manrope'
                }}>
                  Your password has been updated.<br />You can now sign in.
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  style={{
                    width: '100%',
                    height: 42,
                    background: '#1479FF',
                    border: 'none',
                    color: '#FFFFFF',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 14,
                    fontFamily: 'Manrope'
                  }}
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    background: '#DCFCE7',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px',
                    fontSize: 24
                  }}>
                    <SafetyCertificateOutlined style={{ color: '#22C55E' }} />
                  </div>
                  
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1479FF', margin: '0 0 4px 0', fontFamily: 'Manrope', textAlign: 'center' }}>
                    Set new password
                  </h1>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px 0', fontFamily: 'Manrope', textAlign: 'center' }}>
                    Enter the code from your email and choose a new password
                  </p>
                </div>

                <div style={{ marginBottom: 10, width: '100%' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#1479FF', marginBottom: 5, display: 'block', fontFamily: 'Manrope' }}>
                    Reset Code
                  </label>
                  <Input 
                    size="large" 
                    placeholder="Enter 6-digit code" 
                    suffix={<KeyOutlined style={{ color: '#9CA3AF' }} />}
                    value={code}
                    type="number"
                    onChange={e => setCode(e.target.value)}
                    style={{ height: 38, fontFamily: 'Manrope' }}
                  />
                </div>

                <div style={{ marginBottom: 10, width: '100%' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#1479FF', marginBottom: 5, display: 'block', fontFamily: 'Manrope' }}>
                    New Password
                  </label>
                  <Input.Password 
                    size="large" 
                    placeholder="Enter new password" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ height: 38, fontFamily: 'Manrope' }}
                  />
                </div>

                <div style={{
                  background: '#F9FAFB',
                  borderRadius: 8,
                  padding: '10px 12px',
                  marginBottom: 14,
                  width: '100%'
                }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 6px 0', fontFamily: 'Manrope' }}>
                    Password requirements:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {requirements.map((req, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {req.test(newPassword)
                          ? <CheckCircleOutlined style={{ color: '#22C55E', fontSize: 13, flexShrink: 0 }} />
                          : <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#E5E7EB', flexShrink: 0 }} />
                        }
                        <span style={{
                          fontSize: 12,
                          color: req.test(newPassword) ? '#22C55E' : '#6B7280',
                          transition: 'color 0.2s',
                          lineHeight: 1.4,
                          padding: '2px 0',
                          fontFamily: 'Manrope'
                        }}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 10, width: '100%' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#1479FF', marginBottom: 5, display: 'block', fontFamily: 'Manrope' }}>
                    Confirm Password
                  </label>
                  <Input.Password 
                    size="large" 
                    placeholder="Confirm new password" 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={{ height: 38, fontFamily: 'Manrope' }}
                  />
                </div>

                <Button 
                  type="primary" 
                  onClick={handleResetPassword} 
                  loading={loading}
                  style={{
                    width: '100%',
                    height: 42,
                    background: '#1479FF',
                    border: 'none',
                    color: '#FFFFFF',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 14,
                    marginTop: 6,
                    fontFamily: 'Manrope'
                  }}
                >
                  Reset Password
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetNewPassword;

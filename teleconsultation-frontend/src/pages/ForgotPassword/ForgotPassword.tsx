import React, { useState } from 'react';
import { Input, Button, message } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { patientForgotPassword, doctorForgotPassword } from '../../api/auth';
import AuthLayout from '../../components/AuthLayout/AuthLayout';
import './ForgotPassword.css';

const leftPanelContent = {
  label: "ACCOUNT RECOVERY",
  title: "Forgot your password?",
  subtitle: "No worries. Enter your email and we'll send you a reset code.",
  features: [
    { icon: <MailOutlined />, text: "Reset link sent to your email" },
    { icon: <LockOutlined />, text: "Your account stays secure" },
  ]
};

const ForgotPassword: React.FC = () => {
  const [userType, setUserType] = useState<'patient' | 'doctor'>('patient');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!email) {
      message.error('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      if (userType === 'patient') {
        await patientForgotPassword(email);
      } else {
        await doctorForgotPassword(email);
      }
      localStorage.setItem('reset_email', email);
      localStorage.setItem('reset_userType', userType);
      message.success('Reset code sent to your email!');
      navigate('/set-new-password');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout {...leftPanelContent}>
      <div className="forgot-form-wrapper">
        <div className="lock-icon-container">
          <LockOutlined style={{ color: '#F59E0B', fontSize: 28 }} />
        </div>
        
        <h1 className="forgot-title" style={{ textAlign: 'center' }}>Forgot your password?</h1>
        <p className="forgot-subtitle" style={{ textAlign: 'center' }}>
          Enter your email and we'll send you reset instructions
        </p>

        <div className="auth-toggle">
          <button 
            className={`auth-toggle-btn ${userType === 'patient' ? 'active' : ''}`}
            onClick={() => setUserType('patient')}
          >
            Patient
          </button>
          <button 
            className={`auth-toggle-btn ${userType === 'doctor' ? 'active' : ''}`}
            onClick={() => setUserType('doctor')}
          >
            Doctor
          </button>
        </div>

        <div style={{ marginBottom: 24, width: '100%' }}>
          <label className="auth-label">Email Address</label>
          <Input 
            size="large" 
            placeholder="Enter your email" 
            suffix={<MailOutlined style={{ color: '#9CA3AF' }} />}
            value={email}
            onChange={e => setEmail(e.target.value)}
            onPressEnter={handleForgotPassword}
          />
        </div>

        <Button 
          className="auth-primary-btn" 
          type="primary" 
          onClick={handleForgotPassword} 
          loading={loading}
        >
          Send Reset Code
        </Button>

        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 14 }}>
          <span style={{ color: '#6B7280' }}>Remember your password? </span>
          <Link to="/login" style={{ color: '#1479FF', fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;

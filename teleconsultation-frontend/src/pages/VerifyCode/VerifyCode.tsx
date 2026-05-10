import React, { useState, useEffect, useRef } from 'react';
import { Button, message } from 'antd';
import { MailOutlined, SafetyCertificateOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { patientVerify2FA, doctorVerify, patientResend2FA, doctorResendCode } from '../../api/auth';
import AuthLayout from '../../components/AuthLayout/AuthLayout';
import './VerifyCode.css';

const leftPanelContent = {
  label: "SECURE VERIFICATION",
  title: "Two-factor authentication",
  subtitle: "We take your security seriously. A verification code has been sent to confirm your identity.",
  features: [
    { icon: <SafetyCertificateOutlined />, text: "Your account is protected with 2FA" },
    { icon: <ClockCircleOutlined />, text: "Code expires in 10 minutes" },
  ]
};

const VerifyCode: React.FC = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(600);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const { login } = useAuth();

  const email = localStorage.getItem('pending_email') || 'your email';

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTimer = (t: number) => {
    const m = Math.floor(t / 60).toString().padStart(2, '0');
    const s = (t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pastedData.some(char => isNaN(Number(char)))) return;
    
    const newOtp = [...otp];
    pastedData.forEach((char, index) => {
      newOtp[index] = char;
    });
    setOtp(newOtp);
    
    if (pastedData.length < 6) {
      inputRefs.current[pastedData.length]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      message.error('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const userType = localStorage.getItem('pending_userType');

      if (userType === 'PATIENT') {
        const userId = localStorage.getItem('pending_userId');
        const response = await patientVerify2FA(userId!, code);
        const data = response.data;
        login(data.accessToken, {
          id: data.data.id,
          email: data.data.email,
          firstName: data.data.firstName,
          lastName: data.data.lastName,
          userType: 'PATIENT'
        });
        localStorage.removeItem('pending_userId');
        localStorage.removeItem('pending_userType');
        localStorage.removeItem('pending_email');
        message.success('Verified successfully!');
        navigate('/patient/dashboard');
      } else {
        const docEmail = localStorage.getItem('pending_email');
        const response = await doctorVerify(docEmail!, code);
        const data = response.data;
        login(data.accessToken, {
          id: String(data.doctor.id),
          email: data.doctor.email,
          fullName: data.doctor.fullName,
          specialty: data.doctor.specialty,
          userType: 'DOCTOR'
        });
        localStorage.removeItem('pending_email');
        localStorage.removeItem('pending_userType');
        message.success('Verified successfully!');
        navigate('/doctor/dashboard');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Invalid or expired code');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const userType = localStorage.getItem('pending_userType');

      if (userType === 'PATIENT') {
        const userId = localStorage.getItem('pending_userId');
        await patientResend2FA(userId!);
      } else {
        const docEmail = localStorage.getItem('pending_email');
        await doctorResendCode(docEmail!);
      }
      setTimer(600);
      message.success('Code resent successfully');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const codeFilled = otp.join('').length === 6;

  return (
    <AuthLayout {...leftPanelContent}>
      <div className="verify-form-wrapper">
        <div className="vc-icon-circle">
          <MailOutlined style={{ fontSize: 28, color: '#1479FF' }} />
        </div>
        
        <h1 className="verify-title">Check your email</h1>
        <p className="verify-subtitle">
          We sent a 6-digit code to <span style={{fontWeight: 'bold', color: '#111827'}}>{email}</span>
        </p>

        <div className="otp-inputs" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputRefs.current[index] = el; }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              className="otp-input-box"
            />
          ))}
        </div>

        <div className="vc-timer">
          Code expires in <span style={{ color: '#1479FF', fontWeight: 'bold' }}>{formatTimer(timer)}</span>
        </div>

        <Button 
          className="auth-primary-btn" 
          type="primary" 
          onClick={handleVerify} 
          loading={loading}
          disabled={!codeFilled}
        >
          Verify Code
        </Button>

        <div className="vc-resend">
          <span style={{ color: '#6B7280' }}>Didn't receive the code? </span>
          <button 
            className="resend-btn" 
            onClick={handleResend}
            disabled={resending || timer > 0}
            style={{ 
              color: timer > 0 ? '#9CA3AF' : '#1479FF', 
              fontWeight: 600, 
              background: 'none', 
              border: 'none', 
              cursor: timer > 0 ? 'not-allowed' : 'pointer' 
            }}
          >
            Resend
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default VerifyCode;

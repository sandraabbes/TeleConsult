import React, { useState } from 'react';
import { Input, Button, message, Divider } from 'antd';
import { MailOutlined, VideoCameraOutlined, FileTextOutlined, RobotOutlined, GoogleOutlined, FacebookFilled } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { patientLogin, doctorLogin, googleLogin, facebookLogin } from '../../api/auth';
import teleconsultLogo from '../../assets/images/Teleconsult.png';
import './Login.css';

const features = [
  { icon: <VideoCameraOutlined />, text: "HD video consultations with certified doctors" },
  { icon: <FileTextOutlined />, text: "Digital prescriptions and medical records" },
  { icon: <RobotOutlined />, text: "AI-powered medical history summaries" },
];

const Login: React.FC = () => {
  const [userType, setUserType] = useState<'PATIENT' | 'DOCTOR'>('PATIENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handlePatientLogin = async () => {
    if (!email || !password) {
      message.error('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const response = await patientLogin(email, password);
      const data = response.data;
      if (data.accessToken && data.user) {
        login(data.accessToken, {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          userType: 'PATIENT'
        }, data.refreshToken);
        message.success(`Welcome back, ${data.user.firstName}!`);
        navigate('/patient/dashboard');
      } else if (data.userId || data.codeSent) {
        localStorage.setItem('pending_userId', data.userId || '');
        localStorage.setItem('pending_userType', 'PATIENT');
        localStorage.setItem('pending_email', email);
        navigate('/verify');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorLogin = async () => {
    if (!email || !password) {
      message.error('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const response = await doctorLogin(email, password);
      const data = response.data;
      if (data.accessToken && data.doctor) {
        login(data.accessToken, {
          id: String(data.doctor.id),
          email: data.doctor.email,
          fullName: data.doctor.fullName,
          specialty: data.doctor.specialty,
          avatarUrl: data.doctor.profilePhotoUrl || undefined,
          userType: 'DOCTOR'
        }, data.refreshToken);
        message.success(`Welcome back, ${data.doctor.fullName}!`);
        navigate('/doctor/dashboard');
      } else if (data.codeSent) {
        localStorage.setItem('pending_email', email);
        localStorage.setItem('pending_userType', 'DOCTOR');
        navigate('/verify');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (userType === 'PATIENT') {
      handlePatientLogin();
    } else {
      handleDoctorLogin();
    }
  };

  return (
    <div className="login-page">
      <div className="login-left-panel">
        <div className="login-left-content">
          <div>
            <img
              src={teleconsultLogo}
              alt="Teleconsult"
              style={{ cursor: 'pointer', filter: 'brightness(0) invert(1)', maxWidth: 180, width: '100%', marginBottom: 32 }}
              onClick={() => navigate('/')}
            />
            <div style={{ color: '#FFF', opacity: 0.7, textTransform: 'uppercase', letterSpacing: 2, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>SECURE ACCESS</div>
            <h1 style={{ color: '#FFF', fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 12 }}>Healthcare at your fingertips</h1>
            <p style={{ color: '#FFF', opacity: 0.75, fontSize: 13, marginBottom: 32 }}>Connect with certified doctors from the comfort of your home. Book, consult, and get prescriptions online.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(8px)' }}>
                <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: 'white' }}>{f.icon}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="login-right-panel">
        <div className="login-topbar">
          <a href="#" style={{ color: '#6B7280', fontSize: 14, fontWeight: 500 }}>Help Center</a>
          <Button type="default" style={{ color: '#1479FF', borderColor: '#1479FF', borderRadius: 24, fontWeight: 600, background: 'transparent' }}>Contact Clinic</Button>
        </div>
        <div className="login-form-area">
          <div className="login-form-container">
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1479FF', marginBottom: 6, flexShrink: 0 }}>Welcome Back</h1>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, flexShrink: 0 }}>Please enter your details to continue.</p>

            <div
              className={`auth-toggle ${userType === 'DOCTOR' ? 'auth-toggle--doctor' : ''}`}
              style={{ marginBottom: 20, flexShrink: 0 }}
            >
              <span className="auth-toggle-thumb" aria-hidden />
              <button
                type="button"
                className={`auth-toggle-btn ${userType === 'PATIENT' ? 'active' : ''}`}
                onClick={() => setUserType('PATIENT')}
              >
                Patient
              </button>
              <button
                type="button"
                className={`auth-toggle-btn ${userType === 'DOCTOR' ? 'active' : ''}`}
                onClick={() => setUserType('DOCTOR')}
              >
                Doctor
              </button>
            </div>

            <div style={{ marginBottom: 12, flexShrink: 0 }}>
              <label className="auth-label" style={{ fontSize: 13, fontWeight: 600, color: '#1479FF', marginBottom: 6, display: 'block' }}>Email Address</label>
              <Input 
                size="large" 
                placeholder="Enter your email" 
                suffix={<MailOutlined style={{ color: '#9CA3AF' }} />}
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ height: 40 }}
              />
            </div>

            <div style={{ marginBottom: 12, flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="auth-label" style={{ fontSize: 13, fontWeight: 600, color: '#1479FF', marginBottom: 0 }}>Password</label>
                <Link to="/forgot-password" style={{ color: '#1479FF', fontSize: 13, fontWeight: 600 }}>Forgot password?</Link>
              </div>
              <Input.Password 
                size="large" 
                placeholder="Enter your password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                onPressEnter={handleSubmit}
                style={{ height: 40 }}
              />
            </div>

            <Button 
              type="primary" 
              onClick={handleSubmit} 
              loading={loading}
              className="sign-in-btn"
            >
              Sign In &rarr;
            </Button>

            <div
              className={`login-oauth-transition ${userType === 'PATIENT' ? 'login-oauth-transition--open' : ''}`}
              aria-hidden={userType !== 'PATIENT'}
            >
              <div className="login-oauth-transition-inner">
                <Divider plain style={{ color: '#9CA3AF', fontSize: 12, margin: '16px 0', flexShrink: 0 }}>
                  OR LOGIN WITH
                </Divider>
                <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                  {/* <button
                    type="button"
                    className="auth-oauth-btn"
                    onClick={facebookLogin}
                    style={{ height: 40 }}
                    tabIndex={userType === 'PATIENT' ? 0 : -1}
                  >
                    <FacebookFilled style={{ color: '#1877F2', fontSize: 18 }} /> Facebook
                  </button> */}
                  <button
                    type="button"
                    className="auth-oauth-btn"
                    onClick={googleLogin}
                    style={{ height: 40 }}
                    tabIndex={userType === 'PATIENT' ? 0 : -1}
                  >
                    <GoogleOutlined style={{ color: '#EA4335', fontSize: 18 }} /> Google
                  </button>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, flexShrink: 0 }}>
              <span style={{ color: '#6B7280' }}>New to TeleConsult? </span>
              <Link to="/register" style={{ color: '#1479FF', fontWeight: 600 }}>Create an account</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

import React, { useState } from 'react';
import { Input, Button, message } from 'antd';
import { MailOutlined, SafetyCertificateOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { adminLogin as apiAdminLogin } from '../../../api/admin';
import teleconsultLogo from '../../../assets/images/Teleconsult.png';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { adminLogin, isAdminAuthenticated } = useAdminAuth();

  if (isAdminAuthenticated) {
    navigate('/admin/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async () => {
    if (!email || !password) {
      message.error('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const response = await apiAdminLogin(email, password);
      const data = response.data;
      if (data.accessToken && data.admin) {
        adminLogin(data.accessToken, {
          id: data.admin.id,
          email: data.admin.email,
          role: data.admin.role,
        });
        message.success('Welcome, Administrator!');
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: '#FFFFFF',
    }}>
      {/* Left Panel */}
      <div style={{
        width: '33vw',
        flexShrink: 0,
        background: 'linear-gradient(135deg, #0D5FCC 0%, #1479FF 50%, #3B93FF 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '40px 36px',
        overflow: 'hidden',
        animation: 'panelSlideLeft 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <img
            src={teleconsultLogo}
            alt="Teleconsult"
            style={{ cursor: 'pointer', filter: 'brightness(0) invert(1)', maxWidth: 180, width: '100%', marginBottom: 32 }}
            onClick={() => navigate('/')}
          />
          <div style={{ color: '#FFF', opacity: 0.7, textTransform: 'uppercase', letterSpacing: 2, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>ADMIN ACCESS</div>
          <h1 style={{ color: '#FFF', fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 12 }}>Administration Panel</h1>
          <p style={{ color: '#FFF', opacity: 0.75, fontSize: 13, marginBottom: 32 }}>Manage doctor credentials, review applications, and oversee platform operations.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: <SafetyCertificateOutlined />, text: "Review and verify doctor credentials" },
              { icon: <LockOutlined />, text: "Manage doctor access and account status" },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(8px)' }}>
                <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: 'white' }}>{f.icon}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px 48px', flexShrink: 0 }}>
          <Button
            type="default"
            onClick={() => navigate('/login')}
            style={{ color: '#1479FF', borderColor: '#1479FF', borderRadius: 24, fontWeight: 600, background: 'transparent' }}
          >
            User Login
          </Button>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 48px', overflow: 'hidden' }}>
          <div style={{ width: '100%', maxWidth: 460, paddingTop: 80 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1479FF', marginBottom: 6 }}>Admin Login</h1>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 28 }}>Enter your admin credentials to continue.</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1479FF', marginBottom: 6, display: 'block' }}>Email Address</label>
              <Input
                size="large"
                placeholder="admin@teleconsult.com"
                suffix={<MailOutlined style={{ color: '#9CA3AF' }} />}
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ height: 44 }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1479FF', marginBottom: 6, display: 'block' }}>Password</label>
              <Input.Password
                size="large"
                placeholder="Enter admin password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onPressEnter={handleSubmit}
                style={{ height: 44 }}
              />
            </div>

            <Button
              type="primary"
              onClick={handleSubmit}
              loading={loading}
              style={{
                width: '100%',
                height: 44,
                background: '#1479FF',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              Sign In &rarr;
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

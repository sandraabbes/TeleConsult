import React from 'react';
import { Layout, Menu, Typography, Divider, Button } from 'antd';
import {
  AppstoreOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  MessageOutlined,
  ScheduleOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

import teleconsultLogo from '../../assets/images/Teleconsult.png';
import smallLogo from '../../assets/images/logo.png';

const { Sider } = Layout;
const { Text } = Typography;

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
}

const DoctorSideBar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, userType, user } = useAuth();

  const handleLogout = async () => {
    try {
      if (userType === 'DOCTOR') {
        await api.post('/auth/doctor/logout');
      }
    } catch {
      // ignore
    } finally {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const menuItems = [
    { key: 'dashboard', icon: <AppstoreOutlined style={{ fontSize: '18px' }} />, label: 'Dashboard' },
    { key: 'appointments', icon: <CalendarOutlined style={{ fontSize: '18px' }} />, label: 'Appointments' },
    { key: 'consultations', icon: <MedicineBoxOutlined style={{ fontSize: '18px' }} />, label: 'Consultations' },
    { key: 'patients', icon: <TeamOutlined style={{ fontSize: '18px' }} />, label: 'Patients' },
    { key: 'messages', icon: <MessageOutlined style={{ fontSize: '18px' }} />, label: 'Messages' },
    { key: 'schedule', icon: <ScheduleOutlined style={{ fontSize: '18px' }} />, label: 'Schedule' },
  ];

  const onMenuClick = (e: any) => {
    navigate(`/doctor/${e.key}`);
  };

  return (
    <Sider
      theme="light"
      collapsible
      collapsed={collapsed}
      onCollapse={(value) => setCollapsed(value)}
      trigger={null}
      width={260}
      collapsedWidth={80}
      style={{
        height: '100vh',
        borderRight: '1px solid #f0f0f0',
        position: 'sticky',
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div
          style={{
            padding: '20px 19px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            minHeight: '80px',
          }}
          onClick={() => setCollapsed(!collapsed)}
        >
          <img
            src={collapsed ? smallLogo : teleconsultLogo}
            alt="Logo"
            style={{
              maxHeight: '40px',
              maxWidth: '100%',
              objectFit: 'contain',
              transition: 'all 0.2s',
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 8px' }}>
          <Menu
            mode="inline"
            inlineCollapsed={collapsed} 
            selectedKeys={[menuItems.find(item => location.pathname.includes(`/${item.key}`))?.key || 'dashboard']}
            items={menuItems}
            onClick={onMenuClick}
            style={{ borderRight: 0 }}
          />
        </div>

        <div style={{ padding: '16px', background: '#fff' }}>
          <Divider style={{ margin: '8px 0 16px 0' }} />
          
          <div 
            onClick={() => navigate('/doctor/profile')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: collapsed ? '0' : '0 8px', 
              marginBottom: '16px', 
              justifyContent: collapsed ? 'center' : 'flex-start',
              cursor: 'pointer'
            }}
          >
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              backgroundColor: '#2a8b83', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              flexShrink: 0 
            }}>
              {user?.fullName?.[0]}
            </div>
            {!collapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Text strong style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>
                  {user?.fullName} 
                </Text>
                <Text type="secondary" style={{ fontSize: '11px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user?.specialty || 'Doctor'}
                </Text>
              </div>
            )}
          </div>
          
          <Button 
            type="text" 
            icon={<LogoutOutlined style={{ fontSize: '18px' }} />} 
            onClick={handleLogout}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: '#666',
            }}
          >
            {!collapsed && <span style={{ marginLeft: '8px' }}>Sign Out</span>}
          </Button>
        </div>
      </div>
    </Sider>
  );
};

export default DoctorSideBar;
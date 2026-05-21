import React from 'react';
import { Layout, Menu, Typography, Divider, Button, Drawer } from 'antd';
import {
  AppstoreOutlined,
  SearchOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  MessageOutlined,
  LogoutOutlined,
  UserOutlined,
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
  drawerMode?: boolean;
  drawerVisible?: boolean;
  onDrawerClose?: () => void;
}

const PatientSideBar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  drawerMode = false,
  drawerVisible = false,
  onDrawerClose,
}) => {
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
    { key: 'find-doctor', icon: <SearchOutlined style={{ fontSize: '18px' }} />, label: 'Find Doctor' },
    { key: 'appointments', icon: <CalendarOutlined style={{ fontSize: '18px' }} />, label: 'My Appointments' },
    { key: 'consultations', icon: <MedicineBoxOutlined style={{ fontSize: '18px' }} />, label: 'My Consultations' },
    { key: 'messages', icon: <MessageOutlined style={{ fontSize: '18px' }} />, label: 'Messages' },
  ];

  const onMenuClick = (e: any) => {
    navigate(`/patient/${e.key}`);
    if (drawerMode && onDrawerClose) {
      onDrawerClose();
    }
  };

  const sidebarContent = (
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
        onClick={() => {
          if (drawerMode && onDrawerClose) {
            onDrawerClose();
          } else {
            setCollapsed(!collapsed);
          }
        }}
      >
        <img
          src={collapsed && !drawerMode ? smallLogo : teleconsultLogo}
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
          inlineCollapsed={drawerMode ? false : collapsed}
          selectedKeys={[menuItems.find(item => location.pathname.includes(`/${item.key}`))?.key || 'dashboard']}
          items={menuItems}
          onClick={onMenuClick}
          style={{ borderRight: 0 }}
        />
      </div>
      <div style={{ padding: '16px', background: '#fff' }}>
        <Divider style={{ margin: '8px 0 16px 0' }} />
        
        <div 
          onClick={() => {
            navigate('/patient/profile');
            if (drawerMode && onDrawerClose) onDrawerClose();
          }}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: (collapsed && !drawerMode) ? '0' : '0 8px', 
            marginBottom: '16px', 
            justifyContent: (collapsed && !drawerMode) ? 'center' : 'flex-start',
            cursor: 'pointer'
          }}
        >
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            backgroundColor: '#1677ff', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            flexShrink: 0 
          }}>
            {user?.firstName ? `${user.firstName[0]}${user?.lastName?.[0] || ''}` : <UserOutlined style={{ fontSize: '20px' }} />}
          </div>
          {(!collapsed || drawerMode) && (
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Text strong style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text type="secondary" style={{ fontSize: '11px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                Patient ID: #{user?.id ? user.id.toString().slice(0, 6).toUpperCase() : '8821'}
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
            justifyContent: (collapsed && !drawerMode) ? 'center' : 'flex-start',
            color: '#666',
          }}
        >
          {(!collapsed || drawerMode) && <span style={{ marginLeft: '8px' }}>Sign Out</span>}
        </Button>
      </div>
    </div>
  );

  // Drawer mode for mobile
  if (drawerMode) {
    return (
      <Drawer
        placement="left"
        open={drawerVisible}
        onClose={onDrawerClose}
        width={280}
        styles={{ body: { padding: 0 } }}
        closable={false}
        className="sidebar-drawer"
      >
        {sidebarContent}
      </Drawer>
    );
  }

  // Normal sider for tablet/desktop
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
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
      }}
    >
      {sidebarContent}
    </Sider>
  );
};

export default PatientSideBar;
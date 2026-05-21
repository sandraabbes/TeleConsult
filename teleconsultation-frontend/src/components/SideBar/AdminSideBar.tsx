import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Divider, Button, Badge } from 'antd';
import {
  AppstoreOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { getPendingDoctors } from '../../api/admin';

import teleconsultLogo from '../../assets/images/Teleconsult.png';
import smallLogo from '../../assets/images/logo.png';

const { Sider } = Layout;
const { Text } = Typography;

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
}

const AdminSideBar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminLogout, adminUser } = useAdminAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await getPendingDoctors();
        setPendingCount(Array.isArray(res.data) ? res.data.length : 0);
      } catch {
        // ignore
      }
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { key: 'dashboard', icon: <AppstoreOutlined style={{ fontSize: '18px' }} />, label: 'Dashboard' },
    {
      key: 'verifications',
      icon: <SafetyCertificateOutlined style={{ fontSize: '18px' }} />,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          Verifications
          {pendingCount > 0 && (
            <Badge
              count={pendingCount}
              size="small"
              style={{ backgroundColor: '#F59E0B', marginLeft: 8 }}
            />
          )}
        </span>
      ),
    },
    { key: 'doctors', icon: <TeamOutlined style={{ fontSize: '18px' }} />, label: 'All Doctors' },
  ];

  const getSelectedKey = () => {
    if (location.pathname.includes('/verifications')) return 'verifications';
    if (location.pathname.includes('/doctors')) return 'doctors';
    if (location.pathname.includes('/settings')) return 'settings';
    return 'dashboard';
  };

  const onMenuClick = (e: any) => {
    navigate(`/admin/${e.key}`);
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
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
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

        {!collapsed && (
          <div style={{
            padding: '4px 20px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1479FF, #0D5FCC)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 6,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}>
              Admin Panel
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 8px' }}>
          <Menu
            mode="inline"
            inlineCollapsed={collapsed}
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            onClick={onMenuClick}
            style={{ borderRight: 0 }}
          />
        </div>

        <div style={{ padding: '16px', background: '#fff' }}>
          <Divider style={{ margin: '8px 0 16px 0' }} />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: collapsed ? '0' : '0 8px',
              marginBottom: '16px',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1479FF, #0D5FCC)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              flexShrink: 0
            }}>
              A
            </div>
            {!collapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Text strong style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>
                  {adminUser?.email || 'Admin'}
                </Text>
                <Text type="secondary" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                  Administrator
                </Text>
              </div>
            )}
          </div>

          <Button
            type="text"
            icon={<LogoutOutlined style={{ fontSize: '18px' }} />}
            onClick={adminLogout}
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

export default AdminSideBar;

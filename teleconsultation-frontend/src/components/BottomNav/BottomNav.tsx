import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppstoreOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  BellOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Badge } from 'antd';
import './BottomNav.css';

export interface BottomNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

interface BottomNavProps {
  role: 'doctor' | 'patient';
  unreadCount?: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ role, unreadCount = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const doctorItems: BottomNavItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <AppstoreOutlined />, path: '/doctor/dashboard' },
    { key: 'appointments', label: 'Appointments', icon: <CalendarOutlined />, path: '/doctor/appointments' },
    { key: 'patients', label: 'Patients', icon: <TeamOutlined />, path: '/doctor/patients' },
    { key: 'consultations', label: 'Consults', icon: <MedicineBoxOutlined />, path: '/doctor/consultations' },
    { key: 'notifications', label: 'Alerts', icon: <BellOutlined />, path: '/doctor/notifications', badge: unreadCount },
  ];

  const patientItems: BottomNavItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <AppstoreOutlined />, path: '/patient/dashboard' },
    { key: 'find-doctor', label: 'Find Doctor', icon: <SearchOutlined />, path: '/patient/find-doctor' },
    { key: 'appointments', label: 'Appointments', icon: <CalendarOutlined />, path: '/patient/appointments' },
    { key: 'consultations', label: 'Consults', icon: <MedicineBoxOutlined />, path: '/patient/consultations' },
    { key: 'notifications', label: 'Alerts', icon: <BellOutlined />, path: '/patient/notifications', badge: unreadCount },
  ];

  const items = role === 'doctor' ? doctorItems : patientItems;

  const isActive = (path: string) => {
    // Exact match for dashboard, prefix match for others
    if (path.endsWith('/dashboard')) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bottom-nav" id="bottom-nav">
      {items.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.key}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            id={`bottom-nav-${item.key}`}
          >
            <div className="bottom-nav-icon">
              {item.badge && item.badge > 0 ? (
                <Badge count={item.badge} size="small" offset={[2, -2]} color="#1479FF">
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
            </div>
            <span className="bottom-nav-label">{item.label}</span>
            {active && <div className="bottom-nav-indicator" />}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;

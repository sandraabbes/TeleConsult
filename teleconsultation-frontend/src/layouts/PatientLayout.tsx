import { useState, useEffect } from 'react';
import { Layout, Grid } from 'antd';
import { Outlet } from 'react-router-dom';
import PatientSideBar from '../components/SideBar/PatientSideBar';
import Header from '../components/Header/Header';
import './PatientLayout.css';

const { Content } = Layout;
const { useBreakpoint } = Grid;

const PatientLayout = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;           // < 768px
  const isTablet = screens.md && !screens.lg; // 768–1023px

  // Sidebar state: collapsed on tablet, hidden on mobile
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Auto-collapse on tablet, auto-hide on mobile
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    } else if (isTablet) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }, [isMobile, isTablet]);

  // Close drawer when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setDrawerVisible(false);
    }
  }, [isMobile]);

  return (
    <Layout style={{ minHeight: '100vh' }} className="app-layout">
      {/* Sidebar: hidden on mobile, shown on tablet/desktop */}
      {!isMobile && (
        <PatientSideBar collapsed={collapsed} setCollapsed={setCollapsed} />
      )}

      {/* Mobile drawer sidebar */}
      {isMobile && (
        <PatientSideBar
          collapsed={false}
          setCollapsed={setCollapsed}
          drawerMode
          drawerVisible={drawerVisible}
          onDrawerClose={() => setDrawerVisible(false)}
        />
      )}

      <Layout
        className={`main-layout ${isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'}`}
        style={{ 
          transition: 'all 0.2s ease-in-out',
          marginLeft: isMobile ? 0 : collapsed ? 80 : 260 
        }}
      >
        <Header
          onMenuClick={isMobile ? () => setDrawerVisible(true) : undefined}
        />
        <Content className="main-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default PatientLayout;
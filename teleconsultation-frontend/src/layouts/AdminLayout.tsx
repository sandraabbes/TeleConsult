import { useState } from 'react';
import { Layout } from 'antd';
import { Outlet, Navigate } from 'react-router-dom';
import AdminSideBar from '../components/SideBar/AdminSideBar';
import { useAdminAuth } from '../context/AdminAuthContext';

const { Content } = Layout;

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { isAdminAuthenticated } = useAdminAuth();

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AdminSideBar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Layout 
        className="main-layout" 
        style={{ 
          transition: 'all 0.2s ease-in-out',
          marginLeft: collapsed ? 80 : 260 
        }}
      >
        <Content>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;

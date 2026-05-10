import { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import DoctorSideBar from '../components/SideBar/DoctorSideBar';
import Header from '../components/Header/Header';

const { Content } = Layout;

const DoctorLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <DoctorSideBar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Layout style={{ transition: 'all 0.2s ease-in-out' }}>
        <Header />
        <Content >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default DoctorLayout;
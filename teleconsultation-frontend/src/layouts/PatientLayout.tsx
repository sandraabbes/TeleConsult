import { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import PatientSideBar from '../components/SideBar/PatientSideBar';
import Header from '../components/Header/Header';
import './PatientLayout.css';

const { Content } = Layout;

const PatientLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <PatientSideBar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <Layout style={{ transition: 'all 0.2s ease-in-out' }}>
        <Header />
        <Content>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default PatientLayout;
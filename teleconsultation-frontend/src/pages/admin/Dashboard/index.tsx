import { useState, useEffect } from 'react';
import { Card, Statistic, Table, Tag, Typography, Spin } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getAllDoctors, getPendingDoctors } from '../../../api/admin';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface DoctorRow {
  id: number;
  fullName: string;
  email: string;
  specialty: string;
  city: string;
  experience: number;
  verificationStatus: string;
  createdAt: string;
}

const statusColor: Record<string, string> = {
  PENDING_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  SUSPENDED: 'default',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [allDoctors, setAllDoctors] = useState<DoctorRow[]>([]);
  const [pendingDoctors, setPendingDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [allRes, pendingRes] = await Promise.all([
          getAllDoctors(),
          getPendingDoctors(),
        ]);
        setAllDoctors(Array.isArray(allRes.data) ? allRes.data : []);
        setPendingDoctors(Array.isArray(pendingRes.data) ? pendingRes.data : []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const counts = {
    pending: allDoctors.filter(d => d.verificationStatus === 'PENDING_REVIEW').length,
    approved: allDoctors.filter(d => d.verificationStatus === 'APPROVED').length,
    rejected: allDoctors.filter(d => d.verificationStatus === 'REJECTED').length,
    total: allDoctors.length,
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (name: string) => <Text strong>Dr. {name}</Text>,
    },
    { title: 'Specialty', dataIndex: 'specialty', key: 'specialty' },
    { title: 'City', dataIndex: 'city', key: 'city' },
    {
      title: 'Applied on',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => date ? dayjs(date).format('MMM DD, YYYY') : '—',
    },
    {
      title: 'Status',
      dataIndex: 'verificationStatus',
      key: 'verificationStatus',
      render: (status: string) => (
        <Tag color={statusColor[status] || 'default'}>
          {status?.replace('_', ' ')}
        </Tag>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', background: '#F6F8F8', minHeight: '100%' }}>
      <Title level={4} style={{ marginBottom: 4, fontFamily: 'Manrope' }}>Dashboard</Title>
      <Text type="secondary" style={{ fontSize: 13 }}>Overview of doctor credential verification</Text>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 24 }}>
        <Card style={{ border: '1px solid #E5E7EB', borderRadius: 12 }}>
          <Statistic
            title={<span style={{ color: '#6B7280', fontSize: 13 }}>Pending Review</span>}
            value={counts.pending}
            prefix={<ClockCircleOutlined style={{ color: '#F59E0B' }} />}
            valueStyle={{ color: '#F59E0B', fontWeight: 700 }}
          />
        </Card>
        <Card style={{ border: '1px solid #E5E7EB', borderRadius: 12 }}>
          <Statistic
            title={<span style={{ color: '#6B7280', fontSize: 13 }}>Approved</span>}
            value={counts.approved}
            prefix={<CheckCircleOutlined style={{ color: '#22C55E' }} />}
            valueStyle={{ color: '#22C55E', fontWeight: 700 }}
          />
        </Card>
        <Card style={{ border: '1px solid #E5E7EB', borderRadius: 12 }}>
          <Statistic
            title={<span style={{ color: '#6B7280', fontSize: 13 }}>Rejected</span>}
            value={counts.rejected}
            prefix={<CloseCircleOutlined style={{ color: '#EF4444' }} />}
            valueStyle={{ color: '#EF4444', fontWeight: 700 }}
          />
        </Card>
        <Card style={{ border: '1px solid #E5E7EB', borderRadius: 12 }}>
          <Statistic
            title={<span style={{ color: '#6B7280', fontSize: 13 }}>Total Doctors</span>}
            value={counts.total}
            prefix={<TeamOutlined style={{ color: '#1479FF' }} />}
            valueStyle={{ color: '#1479FF', fontWeight: 700 }}
          />
        </Card>
      </div>

      {/* Recent Pending Table */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Recent Pending Applications</span>
            <a
              onClick={() => navigate('/admin/verifications')}
              style={{ color: '#1479FF', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              View all →
            </a>
          </div>
        }
        style={{ marginTop: 24, border: '1px solid #E5E7EB', borderRadius: 12 }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          dataSource={pendingDoctors.slice(0, 5)}
          columns={columns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'No pending applications' }}
          style={{ borderRadius: 12 }}
        />
      </Card>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Tabs, Table, Tag, Button, Drawer, Spin, Modal, Input, message, Typography, Descriptions, Card, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  StopOutlined,
  EyeOutlined,
  FileImageOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { getAllDoctors, getDoctorDocs, verifyDoctor, suspendDoctor } from '../../../api/admin';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface DoctorRow {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  specialty: string;
  city: string;
  experience: number;
  practicePlace: string;
  verificationStatus: string;
  rejectionReason?: string;
  createdAt: string;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  PENDING_REVIEW: { color: 'warning', label: 'Pending Review' },
  APPROVED: { color: 'success', label: 'Approved' },
  REJECTED: { color: 'error', label: 'Rejected' },
  SUSPENDED: { color: 'default', label: 'Suspended' },
};

export default function Verifications() {
  const [activeTab, setActiveTab] = useState('PENDING_REVIEW');
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorRow | null>(null);

  // Documents
  const [docs, setDocs] = useState<{ licenceImg: string; identityImg: string } | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDoctors = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const res = await getAllDoctors(status);
      setDoctors(Array.isArray(res.data) ? res.data : []);
    } catch {
      message.error('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors(activeTab);
  }, [activeTab, fetchDoctors]);

  const openDrawer = (doctor: DoctorRow) => {
    setSelectedDoctor(doctor);
    setDocs(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedDoctor(null);
    setDocs(null);
  };

  const handleLoadDocs = async () => {
    if (!selectedDoctor) return;
    setDocsLoading(true);
    try {
      const res = await getDoctorDocs(selectedDoctor.id);
      setDocs(res.data);
    } catch {
      message.error('Failed to load documents');
    } finally {
      setDocsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedDoctor) return;
    setActionLoading(true);
    try {
      await verifyDoctor(selectedDoctor.id, 'APPROVE');
      message.success(`Dr. ${selectedDoctor.fullName} has been approved`);
      closeDrawer();
      fetchDoctors(activeTab);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to approve doctor');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDoctor || !rejectionReason.trim()) {
      message.error('Please provide a rejection reason');
      return;
    }
    setActionLoading(true);
    try {
      await verifyDoctor(selectedDoctor.id, 'REJECT', rejectionReason.trim());
      message.success(`Dr. ${selectedDoctor.fullName} has been rejected`);
      setRejectModalOpen(false);
      setRejectionReason('');
      closeDrawer();
      fetchDoctors(activeTab);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to reject doctor');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedDoctor) return;
    setActionLoading(true);
    try {
      await suspendDoctor(selectedDoctor.id);
      message.success(`Dr. ${selectedDoctor.fullName} has been suspended`);
      closeDrawer();
      fetchDoctors(activeTab);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to suspend doctor');
    } finally {
      setActionLoading(false);
    }
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
      title: 'Experience',
      dataIndex: 'experience',
      key: 'experience',
      render: (exp: number) => `${exp} yrs`,
    },
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
      render: (status: string) => {
        const cfg = statusConfig[status] || { color: 'default', label: status };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: DoctorRow) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={(e) => { e.stopPropagation(); openDrawer(record); }}
          style={{ color: '#1479FF', fontWeight: 600 }}
        >
          Review
        </Button>
      ),
    },
  ];

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const tabItems = [
    { key: 'PENDING_REVIEW', label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'REJECTED', label: 'Rejected' },
    { key: 'SUSPENDED', label: 'Suspended' },
  ];

  return (
    <div style={{ padding: '24px 28px', background: '#F6F8F8', minHeight: '100%' }}>
      <Title level={4} style={{ marginBottom: 4, fontFamily: 'Manrope' }}>Doctor Verifications</Title>
      <Text type="secondary" style={{ fontSize: 13 }}>Review and manage doctor credential applications</Text>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginTop: 20 }}
      />

      <Card style={{ border: '1px solid #E5E7EB', borderRadius: 12, marginTop: 8 }} bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={doctors}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({ onClick: () => openDrawer(record), style: { cursor: 'pointer' } })}
        />
      </Card>

      {/* Review Drawer */}
      <Drawer
        title="Doctor Review"
        width={520}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
      >
        {selectedDoctor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Doctor Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1479FF, #0D5FCC)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 18,
              }}>
                {getInitials(selectedDoctor.fullName)}
              </div>
              <div>
                <Text strong style={{ fontSize: 18, display: 'block' }}>Dr. {selectedDoctor.fullName}</Text>
                <Text type="secondary">{selectedDoctor.specialty} • {selectedDoctor.city}</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color={statusConfig[selectedDoctor.verificationStatus]?.color || 'default'}>
                    {statusConfig[selectedDoctor.verificationStatus]?.label || selectedDoctor.verificationStatus}
                  </Tag>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Email">{selectedDoctor.email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedDoctor.phone}</Descriptions.Item>
              <Descriptions.Item label="Experience">{selectedDoctor.experience} years</Descriptions.Item>
              <Descriptions.Item label="Practice Place">{selectedDoctor.practicePlace}</Descriptions.Item>
              <Descriptions.Item label="Registered" span={2}>
                {selectedDoctor.createdAt ? dayjs(selectedDoctor.createdAt).format('MMMM DD, YYYY') : '—'}
              </Descriptions.Item>
            </Descriptions>

            {selectedDoctor.rejectionReason && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 12 }}>
                <Text strong style={{ color: '#EF4444', fontSize: 12 }}>Rejection Reason:</Text>
                <div style={{ color: '#991B1B', fontSize: 13, marginTop: 4 }}>{selectedDoctor.rejectionReason}</div>
              </div>
            )}

            {/* Documents Section */}
            <div>
              <Text strong style={{ fontSize: 14, marginBottom: 12, display: 'block' }}>
                <FileImageOutlined style={{ marginRight: 8 }} />
                Documents
              </Text>

              {!docs && !docsLoading && (
                <Button
                  type="dashed"
                  icon={<FileImageOutlined />}
                  onClick={handleLoadDocs}
                  style={{ width: '100%', height: 48, borderRadius: 8 }}
                >
                  Load Documents
                </Button>
              )}

              {docsLoading && (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <Spin tip="Loading documents..." />
                </div>
              )}

              {docs && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Card size="small" title="Licence Image" style={{ borderRadius: 8 }}>
                    {docs.licenceImg ? (
                      <img
                        src={`data:image/jpeg;base64,${docs.licenceImg}`}
                        alt="Licence"
                        style={{ width: '100%', borderRadius: 6, cursor: 'pointer' }}
                        onClick={() => window.open(`data:image/jpeg;base64,${docs.licenceImg}`, '_blank')}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>
                        <UserOutlined style={{ fontSize: 24 }} />
                        <div style={{ marginTop: 4, fontSize: 12 }}>Not available</div>
                      </div>
                    )}
                  </Card>
                  <Card size="small" title="Identity Image" style={{ borderRadius: 8 }}>
                    {docs.identityImg ? (
                      <img
                        src={`data:image/jpeg;base64,${docs.identityImg}`}
                        alt="Identity"
                        style={{ width: '100%', borderRadius: 6, cursor: 'pointer' }}
                        onClick={() => window.open(`data:image/jpeg;base64,${docs.identityImg}`, '_blank')}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>
                        <UserOutlined style={{ fontSize: 24 }} />
                        <div style={{ marginTop: 4, fontSize: 12 }}>Not available</div>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
              {selectedDoctor.verificationStatus === 'PENDING_REVIEW' && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={handleApprove}
                    loading={actionLoading}
                    style={{ flex: 1, height: 42, background: '#22C55E', borderColor: '#22C55E', borderRadius: 8, fontWeight: 600 }}
                  >
                    Approve
                  </Button>
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => setRejectModalOpen(true)}
                    loading={actionLoading}
                    style={{ flex: 1, height: 42, borderRadius: 8, fontWeight: 600 }}
                  >
                    Reject
                  </Button>
                </div>
              )}

              {selectedDoctor.verificationStatus === 'APPROVED' && (
                <Button
                  icon={<StopOutlined />}
                  onClick={handleSuspend}
                  loading={actionLoading}
                  style={{ width: '100%', height: 42, borderRadius: 8, fontWeight: 600, borderColor: '#F59E0B', color: '#F59E0B' }}
                >
                  Suspend Doctor
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Reject Modal */}
      <Modal
        title="Reject Doctor Application"
        open={rejectModalOpen}
        onCancel={() => { setRejectModalOpen(false); setRejectionReason(''); }}
        onOk={handleReject}
        okText="Confirm Rejection"
        okButtonProps={{ danger: true, loading: actionLoading, disabled: !rejectionReason.trim() }}
        cancelButtonProps={{ disabled: actionLoading }}
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">Please provide a reason for rejecting this application. This will be sent to the doctor.</Text>
        </div>
        <TextArea
          rows={4}
          placeholder="Enter rejection reason..."
          value={rejectionReason}
          onChange={e => setRejectionReason(e.target.value)}
          maxLength={500}
          showCount
        />
      </Modal>
    </div>
  );
}

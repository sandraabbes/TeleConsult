import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spin, message } from 'antd';
import {
  FileTextOutlined,
  CalendarOutlined,
  TeamOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/axios';
import dayjs from 'dayjs';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const patientId = user?.id ? String(user.id) : '';
  const patientName = user?.firstName || 'Patient';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [doctorsMap, setDoctorsMap] = useState<Record<string, any>>({});
  const [paymentLoading, setPaymentLoading] = useState<number | null>(null);

  const getInitials = (name: string) => {
      return name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'D'
    }

  const handlePayment = async (appointmentId: number) => {
    setPaymentLoading(appointmentId);
    try {
      // Step 1: Immediately confirm the appointment (bypass Konnect verification)
      await api.post(`/rendezvous/confirm-after-payment`, { rendezvousId: appointmentId });
      setAppointments(prev =>
        prev.map(a => a.id === appointmentId ? { ...a, status: 'CONFIRMED' } : a)
      );
      message.success('Appointment confirmed! Opening payment page...');

      // Step 2: Try to open Konnect payment in a new tab (non-blocking)
      try {
        const payRes = await api.get(`/payments/rendezvous/${appointmentId}`);
        if (payRes?.data?.id) {
          const { data } = await api.post(`/payments/${payRes.data.id}/initiate`, {});
          if (data?.payUrl) {
            window.open(data.payUrl, '_blank', 'noopener,noreferrer');
          }
        }
      } catch (payErr) {
        console.warn('Konnect payment initiation skipped (non-blocking):', payErr);
        // Appointment is already confirmed — payment stays PENDING
      }
    } catch (error) {
      console.error('Appointment confirmation failed', error);
      message.error('Failed to confirm appointment');
    } finally {
      setPaymentLoading(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!patientId || patientId === 'undefined') return;
      try {
        setLoading(true);
        const [apptsRes, recordsRes] = await Promise.all([
          api.get(`/rendezvous/users/${patientId}/patient`).catch(() => ({ data: [] })),
          api.get(`/medical-records/patient/${patientId}`).catch(() => ({ data: [] }))
        ]);

        const appts = Array.isArray(apptsRes.data) ? apptsRes.data : [];
        const recordsRaw = recordsRes.data;
        const records = Array.isArray(recordsRaw) 
          ? recordsRaw 
          : Array.isArray(recordsRaw?.data) 
            ? recordsRaw.data 
            : [];

        // Sort appointments by date
        appts.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        
        // Sort records by date descending
        records.sort((a: any, b: any) => new Date(b.consultationDate || b.createdAt).getTime() - new Date(a.consultationDate || a.createdAt).getTime());

        setAppointments(appts);
        setMedicalRecords(records);

        // Fetch unique doctors
        const uniqueDoctorIds = [...new Set(appts.map((a: any) => a.medecinId))].filter(Boolean) as number[];
        
        const docRes = await Promise.all(
          uniqueDoctorIds.map(id => api.get(`/register-doctors/${id}`).then(r => ({ id, data: r.data })).catch(() => null))
        );
        
        const dMap: Record<string, any> = {};
        docRes.forEach(r => {
          if (r && r.data) {
            dMap[r.id] = r.data;
          }
        });
        setDoctorsMap(dMap);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [patientId]);

  const upcomingAppts = appointments.filter(
    (a) => {
      const s = (a.status || '').toUpperCase();
      return (
        ((s === 'PENDING' || s === 'SCHEDULED' || s === 'CONFIRMED' || s === 'AWAITING_CONSULTATION') &&
        dayjs(a.endTime || a.startTime).isAfter(dayjs())) || s === 'IN_CONSULTATION'
      );
    }
  ).slice(0, 4); // show top 4 upcoming

  const recentRecords = medicalRecords.slice(0, 4);

  const getDoctorDetails = (doctorId: number) => {
    const doc = doctorsMap[doctorId];
    if (!doc) return { name: 'Unknown Doctor', specialty: 'Doctor' };
    return {
      name: doc.fullName || `${doc.firstName || ''} ${doc.lastName || ''}`.trim() || 'Details Unavailable',
      specialty: doc.speciality || 'General Physician',
      profilePhotoUrl: doc.profilePhotoUrl || doc.identityImg || null,
    };
  };

  const myDoctors = Object.values(doctorsMap).slice(0, 4);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="patient-dashboard">
      <div className="dashboard-left">
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
            Welcome back, {patientName} 
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
            Everything looks good with your health goals this week.
          </p>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarOutlined style={{ color: '#1479FF', fontSize: 16 }} />
              <span className="section-title">Upcoming Consultations</span>
            </div>
            <span
              className="section-link"
              onClick={() => navigate('/patient/appointments')}
            >
              View all
            </span>
          </div>

          <div>
            {upcomingAppts.length === 0 ? (
              <div className="empty-state">No upcoming consultations</div>
            ) : (
              upcomingAppts.map((appt) => {
                const doc = getDoctorDetails(appt.medecinId);
                const startDayjs = dayjs(appt.startTime);
                const displayName = doc.name;
                return (
                  <div key={appt.id} className="appointment-row">
                    <div className="pat-doc-avatar">
                      {doc.profilePhotoUrl ? (
                        <img
                          src={
                            doc.profilePhotoUrl.startsWith('http')
                              ? doc.profilePhotoUrl
                              : `http://localhost:3045${doc.profilePhotoUrl}`
                          }
                          alt={displayName}
                        />
                      ) : (
                        getInitials(displayName)
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p className="row-title">{doc.name.startsWith('Dr. ') ? doc.name : `Dr. ${doc.name}`}</p>
                      <p className="row-meta">
                        {doc.specialty} • {startDayjs.format('MMM DD')} at {startDayjs.format('hh:mm A')}
                      </p>
                    </div>
                    <div>
                      {(appt.status || '').toUpperCase() === 'CONFIRMED' || (appt.status || '').toUpperCase() === 'AWAITING_CONSULTATION' || (appt.status || '').toUpperCase() === 'IN_CONSULTATION' ? (
                        (() => {
                          const status = (appt.status || '').toUpperCase();
                          const minutesUntil = dayjs(appt.startTime).diff(dayjs(), 'minute');
                          const isWithin15Min = minutesUntil <= 15 && minutesUntil >= -60;
                          const isJoinEnabled = isWithin15Min || status === 'IN_CONSULTATION';
                          const isDoctorReady = appt.doctorInWaitingRoom === true;
                          
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                              {isDoctorReady && status !== 'IN_CONSULTATION' && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                                  Doctor is ready!
                                </span>
                              )}
                              <Button 
                                className="action-btn-primary" 
                                disabled={!isJoinEnabled}
                                onClick={() => navigate(`/patient/waiting-room/${appt.id}`)}
                                style={{
                                  background: status === 'IN_CONSULTATION' ? '#22C55E' : (isDoctorReady && isWithin15Min ? '#22C55E' : isWithin15Min ? '#1479FF' : '#E2E8F0'),
                                  color: isJoinEnabled ? '#fff' : '#94A3B8',
                                  borderColor: status === 'IN_CONSULTATION' ? '#22C55E' : (isDoctorReady && isWithin15Min ? '#22C55E' : isWithin15Min ? '#1479FF' : '#E2E8F0'),
                                  opacity: isJoinEnabled ? 1 : 0.6,
                                }}
                              >
                                {status === 'IN_CONSULTATION' ? 'Rejoin Meeting' : (isWithin15Min ? 'Join Meeting' : startDayjs.format('hh:mm A'))}
                              </Button>
                            </div>
                          );
                        })()
                      ) : (appt.status || '').toUpperCase() === 'SCHEDULED' ? (
                        <Button 
                          className="action-btn-primary" 
                          style={{ background: '#F59E0B', borderColor: '#F59E0B' }} 
                          loading={paymentLoading === appt.id}
                          onClick={() => handlePayment(appt.id)}
                        >
                          Pay Now
                        </Button>
                      ) : (
                        <Button className="action-btn-secondary" onClick={() => navigate(`/patient/appointments`)}>
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileTextOutlined style={{ color: '#1479FF', fontSize: 16 }} />
              <span className="section-title">Recent medical records</span>
            </div>
            <span
              className="section-link"
              onClick={() => navigate('/patient/consultations')}
            >
              View All
            </span>
          </div>

          <div>
            {recentRecords.length === 0 ? (
              <div className="empty-state">No medical records yet</div>
            ) : (
              recentRecords.map((record) => {
                const dateStr = dayjs(record.consultationDate || record.createdAt).format('MMM DD, YYYY');
                const pres = record.prescriptions?.[0];
                const subtitle = pres ? `${pres.medicationName} ${pres.dosage ? pres.dosage : ''}` : 'General Consultation';
                return (
                  <div key={record.id} className="appointment-row">
                    <div className="record-icon">
                      <FileTextOutlined style={{ fontSize: 16 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p className="row-title">{record.diagnosis || 'Medical Record'}</p>
                      <p className="row-meta">{subtitle}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="row-meta" style={{ marginBottom: 4 }}>{dateStr}</p>
                      <Button className="action-btn-primary" onClick={() => navigate(`/patient/consultations/${record.rendezvousId || record.id}`)}>
                        View Record
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-right">
        <div className="dashboard-section">
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TeamOutlined style={{ color: '#1479FF', fontSize: 16 }} />
              <span className="section-title">My Doctors</span>
            </div>
          </div>

          <div>
            {myDoctors.length === 0 ? (
              <div className="empty-state">No doctors yet</div>
            ) : (
              myDoctors.map((doc) => {
                const nameStr = doc.fullName || `${doc.firstName || ''} ${doc.lastName || ''}`.trim();
                const displayName = nameStr.startsWith('Dr. ') ? nameStr : `Dr. ${nameStr}`;
                return (
                  <div key={doc.id} className="appointment-row">
                    <div className="pat-doc-avatar">
                      {doc.profilePhotoUrl ? (
                        <img
                          src={
                            doc.profilePhotoUrl.startsWith('http')
                              ? doc.profilePhotoUrl
                              : `http://localhost:3045${doc.profilePhotoUrl}`
                          }
                          alt={displayName}
                        />
                      ) : (
                        getInitials(displayName)
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="row-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {displayName}
                      </p>
                      <p className="row-meta">{doc.speciality || 'General Physician'}</p>
                    </div>
                    <Button 
                      type="text" 
                      icon={<MessageOutlined style={{ color: '#1479FF' }} />} 
                      style={{ background: '#F8FAFC' }}
                      onClick={() => navigate(`/patient/messages?doctorId=${doc.id}`)} 
                    />
                  </div>
                );
              })
            )}
          </div>
          
          <div style={{ marginTop: 16 }}>
             <Button block type="primary" style={{ background: '#1479FF', fontWeight: 600, height: 38, borderRadius: 8 }} onClick={() => navigate('/patient/find-doctor')}>
              Find a Doctor
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

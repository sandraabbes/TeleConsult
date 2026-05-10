import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Alert, message } from 'antd';
import { VideoCameraOutlined, ClockCircleOutlined, CalendarOutlined, LoadingOutlined } from '@ant-design/icons';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import api from '../../../api/axios';
import dayjs from 'dayjs';
import { useAuth } from '../../../context/AuthContext';
import './WaitingRoom.css';

export const PatientWaitingRoom = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const patientId = user?.id ? String(user.id) : '';

  const [appointment, setAppointment] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [consultationStarted, setConsultationStarted] = useState(false);
  const [markedReady, setMarkedReady] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // Mark patient as present in waiting room (API call)
  const markPatientReady = async () => {
    if (markedReady || !patientId) return;
    try {
      await api.post(`/rendezvous/${appointmentId}/patient-ready`, { patientId });
      setMarkedReady(true);
    } catch (error) {
      console.error('Failed to mark patient ready', error);
    }
  };

  const fetchDetails = async () => {
    try {
      const { data: appt } = await api.get(`/rendezvous/${appointmentId}`);
      setAppointment(appt);

      // Check if consultation already started
      if ((appt?.status || '').toUpperCase() === 'IN_CONSULTATION') {
        setConsultationStarted(true);
      }

      if (appt?.status === 'SCHEDULED') {
        const payRes = await api.get(`/payments/rendezvous/${appointmentId}`).catch(() => null);
        if (payRes?.data) setPayment(payRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch appointment', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    const interval = setInterval(fetchDetails, 5000);
    return () => clearInterval(interval);
  }, [appointmentId]);

  // Mark patient ready once we have a confirmed/awaiting appointment
  useEffect(() => {
    const status = (appointment?.status || '').toUpperCase();
    if (
      (status === 'CONFIRMED' || status === 'AWAITING_CONSULTATION' || status === 'IN_CONSULTATION') &&
      !markedReady
    ) {
      markPatientReady();
    }
  }, [appointment?.status, markedReady]);

  // Socket.io — listen for consultation-started from doctor
  useEffect(() => {
    const status = (appointment?.status || '').toUpperCase();
    if (status !== 'CONFIRMED' && status !== 'AWAITING_CONSULTATION' && status !== 'IN_CONSULTATION') return;

    const socket = io('http://localhost:3050/waiting-room', {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('patient-join-waiting-room', {
        roomId: appointmentId,
        consultationId: appointmentId,
        patientId,
        patientName: user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      });
    });

    // Doctor started the consultation — enable Join button
    socket.on('consultation-started', (data: any) => {
      console.log('[PatientWR] Consultation started:', data);
      setConsultationStarted(true);
      message.success('Your doctor has started the consultation!');
    });

    return () => {
      socket.emit('leave-waiting-room', { roomId: appointmentId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [appointmentId, patientId, appointment?.status]);

  const handlePayment = async () => {
    if (!payment?.id) return;
    try {
      const { data } = await api.post(`/payments/${payment.id}/initiate`, {});
      if (data?.payUrl) {
        window.location.href = data.payUrl;
      }
    } catch (error) {
      console.error('Payment initiation failed', error);
      message.error('Payment initiation failed. Please try again.');
    }
  };

  const handleJoinConsultation = async () => {
    setJoining(true);
    try {
      await api.post(`/rendezvous/${appointmentId}/join`, {});
      navigate(`/patient/consultation/${appointmentId}`);
    } catch (error: any) {
      console.error('Failed to join', error);
      // If already in consultation, just navigate
      navigate(`/patient/consultation/${appointmentId}`);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="patient-wr">
        <Alert message="Appointment not found" type="error" showIcon />
      </div>
    );
  }

  const status = (appointment.status || '').toUpperCase();
  const doctorReady = appointment.doctorInWaitingRoom;

  return (
    <div className="patient-wr">
      <div className="patient-wr-card">
        <h1 className="patient-wr-title">Waiting Room</h1>
        <p className="patient-wr-subtitle">
          {consultationStarted
            ? 'Your doctor is ready. You can join the consultation now.'
            : 'Please wait while your doctor prepares for the consultation.'}
        </p>

        {/* Payment required */}
        {status === 'SCHEDULED' && (
          <>
            <div className="pwr-doctor-status waiting">
              <div className="pwr-icon waiting">
                <ClockCircleOutlined style={{ fontSize: 20 }} />
              </div>
              <div>
                <p className="pwr-status-title">Payment Required</p>
                <p className="pwr-status-desc">Your doctor has accepted the appointment. Please complete payment to confirm.</p>
              </div>
            </div>
            <button className="pwr-payment-btn" onClick={handlePayment}>
              Proceed to Payment
            </button>
          </>
        )}

        {/* Waiting for doctor / Doctor ready / Consultation started */}
        {(status === 'CONFIRMED' || status === 'AWAITING_CONSULTATION') && (
          <>
            {consultationStarted ? (
              /* Doctor has started the call */
              <div className="pwr-doctor-status started">
                <div className="pwr-icon started">
                  <VideoCameraOutlined style={{ fontSize: 20 }} />
                </div>
                <div>
                  <p className="pwr-status-title">Consultation is Ready!</p>
                  <p className="pwr-status-desc">Your doctor has started the session. Click below to join.</p>
                </div>
              </div>
            ) : doctorReady ? (
              /* Doctor is in waiting room but hasn't started yet */
              <div className="pwr-doctor-status ready">
                <div className="pwr-icon ready">
                  <VideoCameraOutlined style={{ fontSize: 20 }} />
                </div>
                <div>
                  <p className="pwr-status-title">Your Doctor is Ready!</p>
                  <p className="pwr-status-desc">Waiting for them to start the consultation...</p>
                </div>
              </div>
            ) : (
              /* Doctor hasn't joined yet */
              <>
                <div className="pwr-doctor-status waiting">
                  <div className="pwr-icon waiting">
                    <ClockCircleOutlined style={{ fontSize: 20 }} />
                  </div>
                  <div>
                    <p className="pwr-status-title">Waiting for Your Doctor...</p>
                    <p className="pwr-status-desc">Your doctor will join the waiting room shortly.</p>
                  </div>
                </div>
                <div className="pwr-waiting-anim">
                  <span /><span /><span />
                </div>
              </>
            )}

            {/* Join button — disabled until consultation started */}
            <button
              className={`pwr-join-btn ${consultationStarted ? 'enabled' : 'disabled'}`}
              onClick={handleJoinConsultation}
              disabled={!consultationStarted || joining}
            >
              {joining ? (
                <><LoadingOutlined /> Joining...</>
              ) : consultationStarted ? (
                <><VideoCameraOutlined /> Join Consultation</>
              ) : (
                'Waiting for doctor to start...'
              )}
            </button>
          </>
        )}

        {/* Already in consultation */}
        {status === 'IN_CONSULTATION' && (
          <>
            <div className="pwr-doctor-status started">
              <div className="pwr-icon started">
                <VideoCameraOutlined style={{ fontSize: 20 }} />
              </div>
              <div>
                <p className="pwr-status-title">Consultation in Progress</p>
                <p className="pwr-status-desc">Your consultation is currently active.</p>
              </div>
            </div>
            <button
              className="pwr-join-btn enabled"
              onClick={() => navigate(`/patient/consultation/${appointmentId}`)}
            >
              <VideoCameraOutlined /> Re-join Consultation
            </button>
          </>
        )}

        {status === 'CANCELLED' && (
          <Alert message="Appointment cancelled" type="error" showIcon />
        )}
        {status === 'COMPLETED' && (
          <Alert message="Consultation has ended" type="info" showIcon />
        )}
        {(status === 'NO_SHOW' || status === 'NOSHOW') && (
          <Alert message="No show" description="This appointment was marked as a no-show." type="error" showIcon />
        )}

        {/* Appointment details */}
        <div className="pwr-details">
          <p className="pwr-details-title">Appointment Details</p>
          <div className="pwr-details-grid">
            <div className="pwr-detail-item">
              <div className="pwr-detail-label">DATE</div>
              <div className="pwr-detail-value">
                <CalendarOutlined style={{ marginRight: 6, color: '#1479FF' }} />
                {dayjs(appointment.startTime).format('MMM D, YYYY')}
              </div>
            </div>
            <div className="pwr-detail-item">
              <div className="pwr-detail-label">TIME</div>
              <div className="pwr-detail-value">
                <ClockCircleOutlined style={{ marginRight: 6, color: '#1479FF' }} />
                {dayjs(appointment.startTime).format('hh:mm A')}
              </div>
            </div>
          </div>
        </div>

        <button
          className="pwr-back-btn"
          onClick={() => navigate('/patient/appointments')}
        >
          ← Back to Appointments
        </button>
      </div>
    </div>
  );
};

export default PatientWaitingRoom;

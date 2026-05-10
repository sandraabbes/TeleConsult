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

export const DoctorWaitingRoom = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const medecinId = user?.id ? Number(user.id) : 0;
  const doctorName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [patientPresent, setPatientPresent] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // Fetch appointment data (polling fallback)
  const fetchAppointment = async () => {
    try {
      const { data } = await api.get(`/rendezvous/${appointmentId}`);
      setAppointment(data);
      if (data?.patientInWaitingRoom) {
        setPatientPresent(true);
      }
    } catch (error) {
      console.error('Failed to fetch appointment', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();
    const interval = setInterval(fetchAppointment, 5000);
    return () => clearInterval(interval);
  }, [appointmentId]);

  // Socket.io connection for real-time patient presence
  useEffect(() => {
    if (!appointment?.doctorInWaitingRoom) return;

    const socket = io('http://localhost:3050/waiting-room', {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-waiting-room-doctor', {
        roomId: appointmentId,
        doctorId: String(medecinId),
        doctorName,
      });
    });

    socket.on('patient-entered', (data: any) => {
      console.log('[WaitingRoom] Patient entered:', data);
      setPatientPresent(true);
      message.success('Patient has entered the waiting room!');
    });

    socket.on('patient-left', () => {
      setPatientPresent(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [appointmentId, medecinId, appointment?.doctorInWaitingRoom]);

  const handleEnterWaitingRoom = async () => {
    setMarkingReady(true);
    try {
      await api.post(`/rendezvous/${appointmentId}/doctor-ready`, { medecinId });
      setAppointment((prev: any) => ({ ...prev, doctorInWaitingRoom: true }));
    } catch (error) {
      console.error('Failed to mark as ready', error);
      message.error('Could not enter waiting room. Please try again.');
    } finally {
      setMarkingReady(false);
    }
  };

  const handleStartConsultation = async () => {
    setStarting(true);
    try {
      // 1. Transition appointment status to IN_CONSULTATION
      await api.post(`/rendezvous/${appointmentId}/join`, {});

      // 2. Emit socket event so patient gets notified
      socketRef.current?.emit('start-consultation', {
        roomId: appointmentId,
        appointmentId,
      });

      // 3. Navigate to video consultation
      navigate(`/doctor/consultation/${appointmentId}`);
    } catch (error) {
      // If already in consultation, just navigate
      navigate(`/doctor/consultation/${appointmentId}`);
    } finally {
      setStarting(false);
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
      <div className="doctor-wr">
        <Alert message="Appointment not found" type="error" showIcon />
      </div>
    );
  }

  const status = (appointment.status || '').toUpperCase();
  const isInWaitingRoom = appointment.doctorInWaitingRoom;

  return (
    <div className="doctor-wr">
      <div className="doctor-wr-card">
        <h1 className="doctor-wr-title">
          {isInWaitingRoom ? 'Waiting Room' : 'Ready for Consultation?'}
        </h1>
        <p className="doctor-wr-subtitle">
          {isInWaitingRoom
            ? 'You are in the waiting room. Start when your patient arrives.'
            : 'Enter the waiting room to notify your patient.'}
        </p>

        {/* IN_CONSULTATION — rejoin */}
        {status === 'IN_CONSULTATION' && (
          <div className="wr-status-box in-progress">
            <div className="wr-status-icon in-progress">
              <VideoCameraOutlined style={{ fontSize: 20 }} />
            </div>
            <div>
              <p className="wr-status-title">Consultation in Progress</p>
              <p className="wr-status-desc">The session is currently active.</p>
            </div>
          </div>
        )}

        {status === 'IN_CONSULTATION' && (
          <button
            className="wr-start-btn enabled"
            onClick={() => navigate(`/doctor/consultation/${appointmentId}`)}
          >
            <VideoCameraOutlined /> Re-join Consultation
          </button>
        )}

        {/* Not yet in waiting room */}
        {!isInWaitingRoom && status !== 'IN_CONSULTATION' && (
          (status === 'SCHEDULED' || status === 'CONFIRMED' || status === 'AWAITING_CONSULTATION') ? (
            <>
              <div className="wr-status-box waiting">
                <div className="wr-status-icon waiting">
                  <ClockCircleOutlined style={{ fontSize: 20 }} />
                </div>
                <div>
                  <p className="wr-status-title">Not in Waiting Room Yet</p>
                  <p className="wr-status-desc">Click the button below to enter and notify your patient.</p>
                </div>
              </div>

              <button
                className="wr-start-btn enabled"
                onClick={handleEnterWaitingRoom}
                disabled={markingReady}
                style={markingReady ? { opacity: 0.7 } : {}}
              >
                {markingReady ? <><LoadingOutlined /> Entering...</> : 'Enter Waiting Room'}
              </button>
            </>
          ) : (
            <Alert
              message={`Appointment status: ${status}`}
              description="You cannot join at this time."
              type="error"
              showIcon
            />
          )
        )}

        {/* In waiting room — show patient presence + start button */}
        {isInWaitingRoom && status !== 'IN_CONSULTATION' && (
          <>
            <div className="wr-status-box ready">
              <div className="wr-status-icon ready">
                <VideoCameraOutlined style={{ fontSize: 20 }} />
              </div>
              <div>
                <p className="wr-status-title">You're in the Waiting Room</p>
                <p className="wr-status-desc">Your patient has been notified.</p>
              </div>
            </div>

            {/* Patient presence indicator */}
            <div className={`wr-presence ${patientPresent ? 'present' : 'absent'}`}>
              <span className={`wr-pulse-dot ${patientPresent ? '' : 'absent'}`} />
              {patientPresent
                ? 'Patient is in the waiting room'
                : 'Waiting for patient to join...'}
            </div>

            <button
              className={`wr-start-btn ${patientPresent ? 'enabled' : 'disabled'}`}
              onClick={handleStartConsultation}
              disabled={!patientPresent || starting}
            >
              {starting ? (
                <><LoadingOutlined /> Starting...</>
              ) : (
                <><VideoCameraOutlined /> Start Consultation</>
              )}
            </button>
          </>
        )}

        {/* Appointment details */}
        <div className="wr-details">
          <p className="wr-details-title">Appointment Details</p>
          <div className="wr-details-grid">
            <div className="wr-detail-item">
              <div className="wr-detail-label">DATE</div>
              <div className="wr-detail-value">
                <CalendarOutlined style={{ marginRight: 6, color: '#1479FF' }} />
                {dayjs(appointment.startTime).format('MMM D, YYYY')}
              </div>
            </div>
            <div className="wr-detail-item">
              <div className="wr-detail-label">TIME</div>
              <div className="wr-detail-value">
                <ClockCircleOutlined style={{ marginRight: 6, color: '#1479FF' }} />
                {dayjs(appointment.startTime).format('hh:mm A')}
              </div>
            </div>
          </div>
        </div>

        <button
          className="wr-back-btn"
          onClick={() => navigate('/doctor/appointments')}
        >
          ← Back to Appointments
        </button>
      </div>
    </div>
  );
};

export default DoctorWaitingRoom;

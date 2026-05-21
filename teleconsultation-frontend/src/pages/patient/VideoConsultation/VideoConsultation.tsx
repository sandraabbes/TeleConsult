import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, Button, Modal, Badge, Spin } from 'antd';
import { 
  PhoneOutlined, 
  AudioOutlined, 
  AudioMutedOutlined, 
  VideoCameraOutlined, 
  EyeInvisibleOutlined, 
  DesktopOutlined 
} from '@ant-design/icons';
import { useConsultationLogic } from '../../../components/Consultation/useConsultationLogic';
import { ChatPanel } from '../../../components/Consultation/ChatPanel';
import { FilesPanel } from '../../../components/Consultation/FilesPanel';
import { useAuth } from '../../../context/AuthContext';
import '../../../components/Consultation/VideoConsultation.css';

export const PatientVideoConsultation = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ending, setEnding] = useState(false);

  const {
    state,
    refs: { localVideoRef, remoteVideoRef },
    controls,
  } = useConsultationLogic({
    appointmentId: appointmentId!,
    userId: user?.id as string,
    userName: user?.firstName || 'Patient',
    userRole: 'PATIENT',
  });

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleEndConsultation = () => {
    Modal.confirm({
      title: 'End Consultation?',
      content: 'Are you sure you want to end the consultation?',
      okText: 'End',
      cancelText: 'Continue',
      okButtonProps: { danger: true },
      onOk: async () => {
        setEnding(true);
        const success = await controls.endConsultation();
        setEnding(false);
        if (success) {
          navigate(`/patient/consultations/${appointmentId}`);
        }
      },
    });
  };

  if (state.status === 'WAITING') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" description="Initializing consultation..." />
      </div>
    );
  }

  return (
    <div className="video-consultation-container">
      <style>{`
        .consultation-tabs .ant-tabs-content-holder { flex: 1; overflow: hidden; }
        .consultation-tabs .ant-tabs-content { height: 100%; }
        .consultation-tabs .ant-tabs-tabpane { height: 100%; overflow: hidden; }
      `}</style>
      {/* Main Video Area */}
      <div className="video-main-area">
        {/* Header */}
        <div className="video-consultation-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4d4f', boxShadow: '0 0 8px #ff4d4f' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#ff4d4f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live</span>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                {state.participants?.doctorName || 'Doctor Name'}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              {state.participants?.doctorSpecialty || 'Specialist'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Badge status={state.otherUserReady ? 'success' : 'processing'} text={state.otherUserReady ? 'Connected' : 'Connecting...'} />
            <span style={{ 
              fontSize: '14px', 
              fontWeight: 600, 
              fontFamily: 'monospace',
              background: 'var(--color-background-tertiary)', 
              padding: '6px 16px', 
              borderRadius: '20px',
              border: '1px solid var(--color-border-tertiary)',
              color: 'var(--color-text-primary)'
            }}>
              {formatTime(state.elapsedTime)}
            </span>
          </div>
        </div>

        {/* Video Container - Google Meet Style */}
        <div className="video-container">
          
          {/* Doctor Video (Remote - Large Background) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              backgroundColor: '#1a1f3a',
            }}
          />
          
          {!state.otherUserReady && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', zIndex: 10 }}>
              <Spin description="Waiting for Doctor to join..." />
            </div>
          )}

          {/* Patient Video (Local - Small Overlay) */}
          <div className="local-video-overlay">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        </div>

          {/* Control Bar */}
          <div className="video-controls">
            <Button
              type={state.isMuted ? 'primary' : 'default'}
              danger={state.isMuted}
              shape="circle"
              icon={state.isMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
              style={{ width: '48px', height: '48px', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={controls.toggleMute}
              title="Mute/Unmute"
            />
            <Button
              type={!state.isVideoOn ? 'primary' : 'default'}
              danger={!state.isVideoOn}
              shape="circle"
              icon={state.isVideoOn ? <VideoCameraOutlined /> : <EyeInvisibleOutlined />}
              style={{ width: '48px', height: '48px', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={controls.toggleCamera}
              title="Camera on/off"
            />
            <Button
              type={state.isScreenSharing ? 'primary' : 'default'}
              shape="circle"
              icon={<DesktopOutlined />}
              style={{ width: '48px', height: '48px', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={controls.toggleScreenShare}
              title="Share screen"
            />
            <div style={{ width: '1px', background: 'var(--color-border-tertiary)', margin: '0 8px' }} />
            <Button
              danger
              type="primary"
              shape="round"
              icon={<PhoneOutlined rotate={135} />}
              style={{ height: '48px', padding: '0 24px', fontSize: '16px', fontWeight: 600, borderRadius: '24px' }}
              onClick={handleEndConsultation}
              loading={ending}
            >
              End Call
            </Button>
          </div>
      </div>

      {/* Right Sidebar: Chat/Files/Notes */}
      <div className="video-sidebar-area">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Tabs
            className="consultation-tabs"
            activeKey={state.activeTab}
            onChange={(key) => controls.setActiveTab(key as 'chat' | 'notes' | 'files')}
            items={[
              {
                key: 'chat',
                label: 'Chat',
                children: (
                  <div style={{ height: '100%', overflow: 'hidden' }}>
                    <ChatPanel
                      messages={state.messages}
                      files={state.files}
                      onSendMessage={controls.sendMessage}
                      onUploadFile={controls.uploadFile}
                      userId={user?.id as string}
                      userName={user?.firstName || 'You'}
                      userRole="PATIENT"
                    />
                  </div>
                ),
              },
            {
              key: 'files',
              label: `Files (${state.files.length})`,
              children: <FilesPanel files={state.files} />,
            }
          ]}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          tabBarStyle={{ padding: '0 12px' }}
        />
        </div>
      </div>
    </div>
  );
};
export default PatientVideoConsultation;

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { consultationAPI } from '../../api/consultation';
import type { ChatMessage, ConsultationFile, ConsultationState, ParticipantNames } from '../../types/consultation';

interface UseConsultationLogicProps {
  appointmentId: string;
  userId: string;
  userName: string;
  userRole: 'DOCTOR' | 'PATIENT';
}

export const useConsultationLogic = ({
  appointmentId,
  userId,
  userName,
  userRole,
}: UseConsultationLogicProps) => {
  const [state, setState] = useState<ConsultationState>({
    appointmentId,
    status: 'WAITING',
    elapsedTime: 0,
    otherUserReady: false,
    isMuted: false,
    isVideoOn: true,
    isScreenSharing: false,
    activeTab: 'chat',
    messages: [],
    files: [],
    doctorNotes: {
      diagnosis: '',
      notes: '',
      prescriptions: [],
    },
  });

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  // Track whether we are currently making an offer (to avoid glare)
  const makingOfferRef = useRef(false);
  // Track whether the connection has been established at least once
  const connectedOnceRef = useRef(false);

  // Determine role: DOCTOR is the "impolite" peer (always creates offers)
  // PATIENT is the "polite" peer (only responds to offers)
  const isOfferer = userRole === 'DOCTOR';

  // Initialize consultation
  useEffect(() => {
    let cancelled = false;

    const initializeConsultation = async () => {
      try {
        // Load initial data (wrap in try-catch as endpoints might return empty)
        try {
          const { data } = await consultationAPI.getDetails(appointmentId);
          if (data) {
            setState(prev => ({ ...prev, appointment: data }));
          }
        } catch (e) { console.warn('Could not fetch consultation details', e); }

        // Fetch rendezvous + participant profiles for dynamic names
        try {
          const axiosInst = (await import('../../api/axios')).default;
          const rdvRes = await axiosInst.get(`/rendezvous/${appointmentId}`);
          const rdv = rdvRes.data;
          const participants: ParticipantNames = {
            patientName: '',
            doctorName: '',
            doctorSpecialty: '',
            chiefComplaint: '',
          };

          // Fetch doctor profile
          if (rdv?.medecinId) {
            try {
              const docRes = await axiosInst.get(`/register-doctors/${rdv.medecinId}`);
              const doc = docRes.data;
              participants.doctorName = doc?.fullName || `Dr. ${doc?.firstName || ''} ${doc?.lastName || ''}`.trim();
              participants.doctorSpecialty = doc?.specialty || doc?.specialization || '';
            } catch (e) { console.warn('Could not fetch doctor profile', e); }
          }

          // Fetch patient profile
          if (rdv?.patientId) {
            try {
              const patRes = await axiosInst.get(`/users/${rdv.patientId}`);
              // ms-patients returns { statusCode, data: User } so unwrap if needed
              const pat = patRes.data?.data ? patRes.data.data : patRes.data;
              participants.patientName = pat?.fullName || `${pat?.firstName || ''} ${pat?.lastName || ''}`.trim();
            } catch (e) { console.warn('Could not fetch patient profile', e); }
          }

          participants.chiefComplaint = rdv?.reason || rdv?.chiefComplaint || '';
          setState(prev => ({ ...prev, participants }));
        } catch (e) { console.warn('Could not fetch rendezvous details', e); }

        try {
          const { data: messages } = await consultationAPI.getChatHistory(appointmentId);
          if (messages && Array.isArray(messages)) setState(prev => ({ ...prev, messages }));
        } catch (e) { console.warn('Could not fetch messages', e); }

        try {
          const { data: files } = await consultationAPI.getFiles(appointmentId);
          if (files && Array.isArray(files)) setState(prev => ({ ...prev, files }));
        } catch (e) { console.warn('Could not fetch files', e); }

        if (cancelled) return;

        // Initialize Socket.io directly to the signaling microservice
        const socket = io('http://localhost:3050/signaling', {
          auth: { token: localStorage.getItem('token') },
          transports: ['websocket'],
        });

        socketRef.current = socket;

        // Get local media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          socket.disconnect();
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: ['stun:stun.l.google.com:19302'] },
            { urls: ['stun:stun1.l.google.com:19302'] },
          ],
        });

        peerConnectionRef.current = peerConnection;

        // Add local tracks
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream();
          }
          // Avoid adding duplicate tracks
          const existingTrackIds = remoteStreamRef.current.getTracks().map(t => t.id);
          if (!existingTrackIds.includes(event.track.id)) {
            remoteStreamRef.current.addTrack(event.track);
          }
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
          }
        };

        // Handle ICE candidates — broadcast to room
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice-candidate', {
              roomId: appointmentId,
              candidate: event.candidate,
            });
          }
        };

        // Monitor connection state
        peerConnection.onconnectionstatechange = () => {
          console.log('[WebRTC] Connection state:', peerConnection.connectionState);
          if (peerConnection.connectionState === 'connected') {
            connectedOnceRef.current = true;
            setState(prev => ({ ...prev, otherUserReady: true }));
          } else if (peerConnection.connectionState === 'failed') {
            console.warn('[WebRTC] Connection failed');
          }
        };

        // ── Helper: create and send an offer (only DOCTOR does this) ──
        const createAndSendOffer = async () => {
          if (!isOfferer) return; // Only DOCTOR creates offers
          if (makingOfferRef.current) return; // Already making one

          try {
            makingOfferRef.current = true;
            const offer = await peerConnection.createOffer();
            // Check state hasn't changed to something unexpected
            if (peerConnection.signalingState !== 'stable' && peerConnection.signalingState !== 'have-local-offer') {
              console.warn('[WebRTC] Signaling state changed to ' + peerConnection.signalingState + ', aborting offer');
              return;
            }
            await peerConnection.setLocalDescription(offer);
            socket.emit('offer', {
              roomId: appointmentId,
              offer: peerConnection.localDescription,
            });
          } catch (err) {
            console.error('[WebRTC] Failed to create offer:', err);
          } finally {
            makingOfferRef.current = false;
          }
        };

        // Negotiation needed — triggered by WebRTC when tracks change etc.
        peerConnection.onnegotiationneeded = () => {
          console.log('[WebRTC] Negotiation needed');
          createAndSendOffer();
        };

        // Join the signaling room using appointmentId as roomId
        socket.emit('join-room', {
          roomId: appointmentId,
          userId,
          role: userRole,
        });

        // ─── Socket event listeners ───────────────────────────────────

        // When another peer joins the room → DOCTOR creates offer
        socket.on('user-joined', async (data: any) => {
          console.log('[Socket] Other peer joined:', data);
          setState(prev => ({ ...prev, otherUserReady: true }));

          // Only DOCTOR initiates the offer
          if (isOfferer) {
            // Small delay to let the other peer finish setting up
            setTimeout(() => createAndSendOffer(), 500);
          }
        });

        // When we get the room-joined acknowledgment
        socket.on('room-joined', (data: any) => {
          console.log('[Socket] Room joined, existing peers:', data?.peers);
          const peers = data?.peers || [];
          if (peers.length > 1) {
            setState(prev => ({ ...prev, otherUserReady: true }));
            // If DOCTOR and other peers exist, create offer
            if (isOfferer) {
              setTimeout(() => createAndSendOffer(), 500);
            }
          }
        });

        // Receive an offer — only PATIENT should process this
        socket.on('offer', async (data: any) => {
          console.log('[Socket] Received offer from:', data.from);

          // If we are the offerer (DOCTOR) and we get an offer, ignore it (glare)
          if (isOfferer) {
            console.log('[WebRTC] Ignoring offer — we are the offerer (DOCTOR)');
            return;
          }

          try {
            // Check signaling state before setting remote description
            const state = peerConnection.signalingState;
            if (state !== 'stable' && state !== 'have-local-offer') {
              console.warn(`[WebRTC] Ignoring offer in state: ${state}`);
              return;
            }

            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('answer', {
              roomId: appointmentId,
              answer: peerConnection.localDescription,
            });
          } catch (err) {
            console.error('[WebRTC] Failed to handle offer:', err);
          }
        });

        // Receive an answer — only DOCTOR should process this
        socket.on('answer', async (data: any) => {
          console.log('[Socket] Received answer from:', data.from);

          // If we are the answerer (PATIENT), ignore answers
          if (!isOfferer) {
            console.log('[WebRTC] Ignoring answer — we are the answerer (PATIENT)');
            return;
          }

          try {
            // Only accept answer if we're in have-local-offer state
            if (peerConnection.signalingState !== 'have-local-offer') {
              console.warn(`[WebRTC] Ignoring answer in state: ${peerConnection.signalingState}`);
              return;
            }
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          } catch (err) {
            console.error('[WebRTC] Failed to handle answer:', err);
          }
        });

        // Receive ICE candidate
        socket.on('ice-candidate', async (data: any) => {
          if (data.candidate) {
            try {
              // Only add ICE candidates if we have a remote description
              if (peerConnection.remoteDescription) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
              }
            } catch (error) {
              console.error('[WebRTC] Error adding ICE candidate:', error);
            }
          }
        });

        // Receive chat message (from the signaling server relay)
        socket.on('receive-message', (message: ChatMessage) => {
          setState(prev => {
            // Prevent duplicate message rendering
            if (prev.messages.some(m => m.id === message.id)) return prev;
            return { ...prev, messages: [...prev.messages, message] };
          });
        });

        // Receive shared file info
        socket.on('file-shared', (file: ConsultationFile) => {
          setState(prev => ({ ...prev, files: [...prev.files, file] }));
        });

        // Other peer left the room
        socket.on('peer-left', (data: any) => {
          console.log('[Socket] Peer left:', data);
          setState(prev => ({ ...prev, otherUserReady: false }));

          // Clean up remote stream
          if (remoteStreamRef.current) {
            remoteStreamRef.current.getTracks().forEach(t => t.stop());
            remoteStreamRef.current = null;
          }
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
        });

        // Consultation ended by the other user
        socket.on('consultation-ended', (data: any) => {
          console.log('[Socket] Consultation ended by other user:', data);
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
          }
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
          }
          setState(prev => ({ ...prev, status: 'COMPLETED', otherUserReady: false }));
        });

        setState(prev => ({ ...prev, status: 'IN_CONSULTATION' }));
      } catch (error) {
        console.error('Failed to initialize consultation:', error);
      }
    };

    initializeConsultation();

    return () => {
      cancelled = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.emit('leave-room', { roomId: appointmentId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [appointmentId, userId, userRole, isOfferer]);

  // Elapsed time timer
  useEffect(() => {
    if (state.status !== 'IN_CONSULTATION') return;

    const timer = setInterval(() => {
      setState(prev => ({ ...prev, elapsedTime: prev.elapsedTime + 1 }));
    }, 1000);

    return () => clearInterval(timer);
  }, [state.status]);

  // Sync local stream to video element when it becomes available
  // This handles the case where the video element is not mounted yet during initialization
  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  });

  // Media controls
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setState(prev => ({ ...prev, isVideoOn: !prev.isVideoOn }));
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!state.isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as any,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current!
          .getSenders()
          .find(s => s.track?.kind === 'video');

        if (sender) {
          await sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          toggleScreenShare(); // Reverts back
        };

        setState(prev => ({ ...prev, isScreenSharing: true }));
      } else {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        const cameraTrack = cameraStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current!
          .getSenders()
          .find(s => s.track?.kind === 'video');

        if (sender) {
          await sender.replaceTrack(cameraTrack);
        }

        setState(prev => ({ ...prev, isScreenSharing: false }));
      }
    } catch (error) {
      console.error('Screen share failed:', error);
    }
  }, [state.isScreenSharing]);

  // Chat — send message through signaling server
  const sendMessage = useCallback(
    (text: string) => {
      if (!socketRef.current || !text.trim()) return;

      socketRef.current.emit('send-message', {
        roomId: appointmentId,
        senderId: userId,
        senderName: userName,
        senderRole: userRole,
        message: text,
      });
    },
    [appointmentId, userId, userName, userRole]
  );

  const uploadFile = useCallback(
    async (file: File, description?: string) => {
      try {
        const { data } = await consultationAPI.uploadFile(appointmentId, file, description);

        // Build a complete file record client-side since the backend stub
        // may not return all metadata fields (fileName, fileSize, fileType, uploadedByRole, fileUrl)
        const fileUrl = data?.fileUrl || data?.url || (data?.fileName ? `/uploads/${data.fileName}` : URL.createObjectURL(file));
        const fileRecord: ConsultationFile = {
          id: data?.id || `file-${Date.now()}`,
          appointmentId,
          uploadedBy: userId,
          uploadedByRole: userRole,            // ← use the actual uploader's role
          fileName: data?.fileName || file.name,
          fileType: data?.fileType || file.type || 'application/octet-stream',
          fileSize: data?.fileSize ?? file.size,
          fileUrl,
          uploadedAt: data?.uploadedAt ? new Date(data.uploadedAt) : new Date(),
          description,
        };

        // Notify other peer via signaling
        socketRef.current?.emit('share-file', {
          roomId: appointmentId,
          file: fileRecord,
        });

        setState(prev => ({ ...prev, files: [...prev.files, fileRecord] }));
      } catch (error) {
        console.error('File upload failed:', error);
        throw error;
      }
    },
    [appointmentId, userId, userRole]
  );

  const updateDoctorNotes = useCallback((updates: Partial<typeof state.doctorNotes>) => {
    setState(prev => ({
      ...prev,
      doctorNotes: { ...prev.doctorNotes, ...updates },
    }));
  }, []);

  const endConsultation = useCallback(async () => {
    try {
      // 1. Notify other peer via WebSocket first
      socketRef.current?.emit('end-consultation', {
        roomId: appointmentId,
        endedBy: userId,
      });

      // 2. Call the API to persist in database
      try {
        await consultationAPI.endConsultation(appointmentId);
      } catch (apiError) {
        console.warn('API endConsultation call failed (non-blocking):', apiError);
      }

      // 3. Also directly call rendezvous end to guarantee status is COMPLETED
      try {
        // Direct axios call to rendezvous end endpoint
        const axios = (await import('../../api/axios')).default;
        await axios.post(`/rendezvous/${appointmentId}/end`, {});
      } catch (rdvError) {
        console.warn('Rendezvous end call failed (non-blocking):', rdvError);
      }

      // 3. Clean up local resources
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      // 4. Leave room and disconnect socket
      socketRef.current?.emit('leave-room', { roomId: appointmentId });
      socketRef.current?.disconnect();

      setState(prev => ({ ...prev, status: 'COMPLETED' }));
      return true;
    } catch (error) {
      console.error('Failed to end consultation:', error);
      return false;
    }
  }, [appointmentId, userId]);

  return {
    state,
    setState,
    refs: {
      localVideoRef,
      remoteVideoRef,
      socketRef,
      peerConnectionRef,
    },
    controls: {
      toggleMute,
      toggleCamera,
      toggleScreenShare,
      sendMessage,
      uploadFile,
      updateDoctorNotes,
      endConsultation,
      setActiveTab: (tab: 'chat' | 'notes' | 'files') =>
        setState(prev => ({ ...prev, activeTab: tab })),
    },
  };
};

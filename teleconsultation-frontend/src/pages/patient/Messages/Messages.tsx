import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input, Avatar, Spin, message as antdMessage, Tooltip, Grid } from 'antd';
import { SearchOutlined, PaperClipOutlined, SendOutlined, FileOutlined, DownloadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../../context/AuthContext';
import { messagesApi, type ConversationEntity, type MessageEntity } from '../../../api/messages';
import api from '../../../api/axios';
import './Messages.css';

const { useBreakpoint } = Grid;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ATTACHMENT_PREFIX = '::FILE::';

const parseAttachment = (text: string) => {
  if (!text.startsWith(ATTACHMENT_PREFIX)) return null;
  try {
    const json = text.slice(ATTACHMENT_PREFIX.length);
    return JSON.parse(json) as { name: string; type: string; dataUrl: string };
  } catch {
    return null;
  }
};

interface DoctorInfo {
  id: string;
  fullName: string;
  initials: string;
  profilePhotoUrl?: string;
}

const Messages: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [showSidebar, setShowSidebar] = useState(true);

  const [conversations, setConversations] = useState<ConversationEntity[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageEntity[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Doctor data
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [doctorsMap, setDoctorsMap] = useState<Record<string, DoctorInfo>>({});
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const initialDoctorHandled = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitialsFromName = (name: string) => {
    if (!name || name === 'Unknown') return 'D';
    const parts = name.replace('Dr. ', '').trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0][0]?.toUpperCase() || 'D';
  };

  // Fetch the patient's doctors list
  const fetchDoctors = useCallback(async () => {
    if (!user) return;
    setDoctorsLoading(true);
    try {
      const patientId = String(user.id);
      const apptRes = await api.get(`/rendezvous/users/${patientId}/patient`);
      const appts = apptRes.data || [];
      const uniqueIds = [...new Set(appts.map((a: any) => String(a.medecinId)))] as string[];

      const details = await Promise.all(
        uniqueIds.map((id) =>
          api
            .get(`/register-doctors/${id}`)
            .then((r) => {
              const p = r.data?.data || r.data;
              let fullName = p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || 'Unknown';
              if (!fullName.startsWith('Dr. ')) fullName = `Dr. ${fullName}`;
              const initials = getInitialsFromName(fullName);
              const profilePhotoUrl = p.profilePhotoUrl || null;
              return { id, fullName, initials, profilePhotoUrl } as DoctorInfo;
            })
            .catch(() => ({ id, fullName: `Doctor ${id.substring(0, 6)}`, initials: 'D' } as DoctorInfo))
        )
      );

      setDoctors(details);
      const map: Record<string, DoctorInfo> = {};
      details.forEach((p) => {
        map[p.id] = p;
      });
      setDoctorsMap(map);
    } catch (err) {
      console.error('Failed to load doctors', err);
    } finally {
      setDoctorsLoading(false);
    }
  }, [user]);

  // Initialize Socket and fetch conversations + doctors
  useEffect(() => {
    if (!user) return;

    socketRef.current = io('http://localhost:3060/messages', {
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to chat server');
    });

    socketRef.current.on('message_received', (newMsg: MessageEntity) => {
      setMessages((prev) => {
        if (prev.length > 0 && prev[0].conversationId === newMsg.conversationId) {
          return [...prev, newMsg];
        }
        if (prev.length === 0) {
          return [newMsg];
        }
        return prev;
      });

      setConversations((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((c) => c.id === newMsg.conversationId);
        if (idx > -1) {
          const conv = updated[idx];
          conv.lastMessageAt = newMsg.createdAt;
          updated.splice(idx, 1);
          updated.unshift(conv);
        }
        return updated;
      });
    });

    socketRef.current.on('messages_read', ({ userId }: { userId: string }) => {
      setMessages((prev) =>
        prev.map((m) => (!m.isRead && m.senderId !== userId ? { ...m, isRead: true } : m))
      );
    });

    const loadConversations = async () => {
      try {
        const data = await messagesApi.getConversations(user.id, user.userType);
        setConversations(data);
      } catch (err) {
        console.error('Failed to load conversations', err);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
    fetchDoctors();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user, fetchDoctors]);

  // Handle ?doctorId= query param (from Dashboard "Message" button)
  useEffect(() => {
    if (initialDoctorHandled.current) return;
    if (loading || doctorsLoading) return;
    if (!user) return;

    const doctorIdParam = searchParams.get('doctorId');
    if (!doctorIdParam) return;

    initialDoctorHandled.current = true;
    openOrCreateConversation(doctorIdParam);
  }, [loading, doctorsLoading, searchParams, user]);

  // Open or create a conversation with a doctor
  const openOrCreateConversation = async (doctorId: string) => {
    if (!user || creatingConversation) return;

    // Check if a conversation already exists
    const existing = conversations.find(
      (c) => String(c.doctorId) === String(doctorId)
    );

    if (existing) {
      setActiveConversationId(existing.id);
      setSearchQuery('');
      setShowSearchResults(false);
      return;
    }

    // Create a new conversation
    setCreatingConversation(true);
    try {
      const newConv = await messagesApi.createConversation(doctorId, user.id);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create conversation', err);
    } finally {
      setCreatingConversation(false);
      setSearchQuery('');
      setShowSearchResults(false);
    }
  };

  // Handle active conversation change
  useEffect(() => {
    if (!activeConversationId) return;

    const fetchHistory = async () => {
      try {
        const data = await messagesApi.getHistory(activeConversationId);
        setMessages(data);
        if (user) {
          await messagesApi.markAsRead(activeConversationId, user.id);
          socketRef.current?.emit('mark_as_read', {
            conversationId: activeConversationId,
            userId: user.id,
          });
        }
      } catch (err) {
        console.error('Failed to load history', err);
      }
    };

    fetchHistory();

    socketRef.current?.emit('join_conversation', { conversationId: activeConversationId });

    return () => {
      socketRef.current?.emit('leave_conversation', { conversationId: activeConversationId });
    };
  }, [activeConversationId, user]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeConversationId || !user) return;

    const messagePayload = {
      conversationId: activeConversationId,
      senderId: user.id,
      senderType: user.userType.toLowerCase(),
      text: inputValue.trim(),
    };

    setInputValue('');
    socketRef.current?.emit('send_message', messagePayload);
  };

  const handleAttachClick = () => {
    if (!activeConversationId) {
      antdMessage.warning('Please select a conversation first.');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId || !user) return;

    if (file.size > MAX_FILE_SIZE) {
      antdMessage.error('File is too large. Maximum size is 5MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const attachmentData = JSON.stringify({
        name: file.name,
        type: file.type,
        dataUrl,
      });

      const messagePayload = {
        conversationId: activeConversationId,
        senderId: user.id,
        senderType: user.userType.toLowerCase(),
        text: `${ATTACHMENT_PREFIX}${attachmentData}`,
      };

      socketRef.current?.emit('send_message', messagePayload);
      antdMessage.success(`${file.name} sent!`);
    };
    reader.onerror = () => {
      antdMessage.error('Failed to read file.');
    };
    reader.readAsDataURL(file);

    // Reset so the same file can be selected again
    e.target.value = '';
  };

  const renderMessageContent = (msg: MessageEntity) => {
    const attachment = parseAttachment(msg.text);
    if (attachment) {
      const isImage = attachment.type.startsWith('image/');
      if (isImage) {
        return (
          <div className="attachment-content">
            <img
              src={attachment.dataUrl}
              alt={attachment.name}
              className="attachment-image"
              onClick={() => window.open(attachment.dataUrl, '_blank')}
            />
            <span className="attachment-name">{attachment.name}</span>
          </div>
        );
      }
      return (
        <div className="attachment-content">
          <a
            href={attachment.dataUrl}
            download={attachment.name}
            className="attachment-file-link"
          >
            <FileOutlined style={{ fontSize: 24 }} />
            <div className="attachment-file-info">
              <span className="attachment-name">{attachment.name}</span>
              <span className="attachment-download"><DownloadOutlined /> Download</span>
            </div>
          </a>
        </div>
      );
    }
    return msg.text;
  };

  const getOtherUser = (conv: ConversationEntity) => {
    const otherId = conv.doctorId; // Since we are PATIENT, the other is DOCTOR

    const doctorData = doctorsMap[otherId];
    if (doctorData) {
      return {
        name: doctorData.fullName,
        initial: doctorData.initials,
        id: otherId,
        profilePhotoUrl: doctorData.profilePhotoUrl,
      };
    }

    return {
      name: `Doctor ${otherId.substring(0, 6)}`,
      initial: 'D',
      id: otherId,
      profilePhotoUrl: undefined,
    };
  };

  const formatMessageTime = (dateStr: string) => {
    const d = dayjs(dateStr);
    if (d.isSame(dayjs(), 'day')) return d.format('hh:mm A');
    return d.format('MMM D');
  };

  // Filter doctors for search results (exclude those with existing conversations)
  const searchResults = searchQuery.trim()
    ? doctors.filter((p) =>
        p.fullName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    return getOtherUser(c).name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const activeConvData = conversations.find((c) => c.id === activeConversationId);
  const otherUser = activeConvData ? getOtherUser(activeConvData) : null;

  const handleConversationSelect = (convId: string) => {
    setActiveConversationId(convId);
    if (isMobile) setShowSidebar(false);
  };

  const handleBackToSidebar = () => {
    setShowSidebar(true);
  };

  return (
    <div className="messages-container">
      {/* Sidebar Area */}
      <div className={`messages-sidebar ${isMobile && !showSidebar ? 'sidebar-hidden' : ''}`}>
        <div className="messages-sidebar-header">
          <h2>Messages</h2>
          <div ref={searchContainerRef} style={{ position: 'relative' }}>
            <Input
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Search doctors..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(e.target.value.trim().length > 0);
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 0) setShowSearchResults(true);
              }}
              style={{ borderRadius: '6px', backgroundColor: '#f3f4f6', border: 'none' }}
            />
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="patient-search-dropdown">
                <div className="search-dropdown-label">Start conversation with:</div>
                {searchResults.map((p) => {
                  const hasConversation = conversations.some(
                    (c) => String(c.doctorId) === String(p.id)
                  );
                  return (
                    <div
                      key={p.id}
                      className="search-dropdown-item"
                      onClick={() => openOrCreateConversation(p.id)}
                    >
                      <Avatar size={32} style={{ backgroundColor: '#1677ff', flexShrink: 0 }} src={p.profilePhotoUrl ? (p.profilePhotoUrl.startsWith('http') ? p.profilePhotoUrl : `http://localhost:3045${p.profilePhotoUrl}`) : undefined}>
                        {p.initials}
                      </Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="search-dropdown-name">{p.fullName}</div>
                        <div className="search-dropdown-sub">
                          {hasConversation ? 'Open existing conversation' : 'Start new conversation'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {showSearchResults && searchQuery.trim().length > 0 && searchResults.length === 0 && (
              <div className="patient-search-dropdown">
                <div style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
                  No doctors found matching "{searchQuery}"
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="messages-list">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#9ca3af', fontSize: 13 }}>
              {conversations.length === 0
                ? 'No conversations yet. Search for a doctor to start messaging.'
                : 'No conversations match your search.'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const u = getOtherUser(conv);
              const isActive = activeConversationId === conv.id;
              return (
                <div
                  key={conv.id}
                  className={`conversation-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleConversationSelect(conv.id)}
                >
                  <div className="conversation-avatar-container">
                    <Avatar size={48} style={{ backgroundColor: '#1677ff' }} src={u.profilePhotoUrl ? (u.profilePhotoUrl.startsWith('http') ? u.profilePhotoUrl : `http://localhost:3045${u.profilePhotoUrl}`) : undefined}>
                      {u.initial}
                    </Avatar>
                    <div className="online-indicator"></div>
                  </div>
                  <div className="conversation-preview">
                    <div className="conversation-header">
                      <span className="conversation-name">{u.name}</span>
                      <span className="conversation-time">
                        {conv.lastMessageAt ? formatMessageTime(conv.lastMessageAt) : ''}
                      </span>
                    </div>
                    <p className="conversation-text">Click to view conversation...</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`chat-main ${isMobile && showSidebar ? 'chat-hidden' : ''}`}>
        {activeConversationId && otherUser ? (
          <>
            <div className="chat-header">
              {isMobile && (
                <ArrowLeftOutlined
                  className="chat-back-btn"
                  onClick={handleBackToSidebar}
                />
              )}
              <Avatar size={40} style={{ backgroundColor: '#1677ff' }} src={otherUser.profilePhotoUrl ? (otherUser.profilePhotoUrl.startsWith('http') ? otherUser.profilePhotoUrl : `http://localhost:3045${otherUser.profilePhotoUrl}`) : undefined}>
                {otherUser.initial}
              </Avatar>
              <div className="chat-header-info">
                <h3 className="chat-header-name">{otherUser.name}</h3>
                <div className="chat-header-status">
                  <div className="status-dot"></div>
                  Online • Doctor
                </div>
              </div>
            </div>

            <div className="chat-history">
              <div className="timeline-divider">
                <span className="timeline-pill">START OF CONVERSATION</span>
              </div>

              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>
                  No messages yet. Say hello to {otherUser.name}!
                </div>
              )}

              {messages.map((msg) => {
                const isSent = msg.senderId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`message-row ${isSent ? 'message-row-sent' : 'message-row-received'}`}
                  >
                    {!isSent && (
                      <Avatar
                        className="message-avatar"
                        size={32}
                        style={{ backgroundColor: '#1677ff' }}
                        src={otherUser.profilePhotoUrl ? (otherUser.profilePhotoUrl.startsWith('http') ? otherUser.profilePhotoUrl : `http://localhost:3045${otherUser.profilePhotoUrl}`) : undefined}
                      >
                        {otherUser.initial}
                      </Avatar>
                    )}
                    <div className="message-content">
                      <div
                        className={`message-bubble ${
                          isSent ? 'message-bubble-sent' : 'message-bubble-received'
                        }`}
                      >
                        {renderMessageContent(msg)}
                      </div>
                      <div className="message-meta">
                        {formatMessageTime(msg.createdAt)} {isSent && msg.isRead && ' • Read'}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelected}
                style={{ display: 'none' }}
                accept="image/*,.pdf,.doc,.docx,.txt,.zip"
              />
              <Tooltip title="Attach file (max 5MB)">
                <PaperClipOutlined
                  className="chat-attach-btn"
                  onClick={handleAttachClick}
                />
              </Tooltip>
              <Input
                className="chat-input"
                placeholder="Type a message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onPressEnter={handleSendMessage}
              />
              <Tooltip title="Send message">
                <div
                  className={`chat-send-btn ${inputValue.trim() ? 'active' : ''}`}
                  onClick={handleSendMessage}
                >
                  <SendOutlined />
                </div>
              </Tooltip>
            </div>
          </>
        ) : (
          <div className="chat-empty">
            {creatingConversation ? (
              <Spin tip="Creating conversation..." />
            ) : (
              'Select a conversation or search for a doctor to start messaging'
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;

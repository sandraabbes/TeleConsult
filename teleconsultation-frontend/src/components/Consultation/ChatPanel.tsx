import React, { useState, useRef, useEffect } from 'react';
import { Input, Upload, message, Spin, Empty, Tooltip, Avatar } from 'antd';
import { PaperClipOutlined, SendOutlined, FileOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ChatMessage, ConsultationFile } from '../../types/consultation';
import styles from './ChatPanel.module.css';

interface ChatPanelProps {
  messages: ChatMessage[];
  files: ConsultationFile[];
  onSendMessage: (text: string) => void;
  onUploadFile: (file: File, description?: string) => Promise<void>;
  userId: string;
  userName: string;
  userRole: 'DOCTOR' | 'PATIENT';
  isLoading?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  onUploadFile,
  userId,
  isLoading,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    onSendMessage(chatInput);
    setChatInput('');
  };

  const handleUploadFile = async (file: File) => {
    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      message.error('File is too large. Maximum size is 5MB.');
      return;
    }
    
    setUploading(true);
    try {
      await onUploadFile(file);
      message.success('File uploaded successfully');
    } catch (error) {
      message.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f9fafb' }}>
      {/* Messages */}
      <div className={styles.messageContainer}>
        {messages.length === 0 ? (
          <Empty description="No messages yet" style={{ marginTop: '40px' }} />
        ) : (
          messages.map((msg, idx) => {
            const isSent = msg.senderId === userId;
            // Use fileType from ConsultationFile if available, or guess based on extension/type
            // Note: chat messages in state usually have isFile, fileName, fileUrl
            const isImage = msg.isFile && (msg.fileType?.startsWith('image/') || msg.fileName?.match(/\.(jpeg|jpg|gif|png)$/i));

            return (
              <div
                key={idx}
                className={`${styles.messageRow} ${isSent ? styles.messageRowSent : styles.messageRowReceived}`}
              >
                {!isSent && (
                  <Avatar className={styles.messageAvatar} size={32} style={{ backgroundColor: '#1677ff' }}>
                    {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'U'}
                  </Avatar>
                )}
                
                <div className={styles.messageContent}>
                  <div className={`${styles.messageBubble} ${isSent ? styles.messageBubbleSent : styles.messageBubbleReceived}`}>
                    {msg.isFile ? (
                      isImage ? (
                        <div className={styles.attachmentContent}>
                          <img
                            src={msg.fileUrl}
                            alt={msg.fileName}
                            className={styles.attachmentImage}
                            onClick={() => window.open(msg.fileUrl, '_blank')}
                          />
                          <span className={styles.attachmentName}>{msg.fileName}</span>
                        </div>
                      ) : (
                        <div className={styles.attachmentContent}>
                          <a
                            href={msg.fileUrl}
                            download={msg.fileName}
                            className={styles.attachmentFileLink}
                          >
                            <FileOutlined style={{ fontSize: 24 }} />
                            <div className={styles.attachmentFileInfo}>
                              <span className={styles.attachmentName}>{msg.fileName}</span>
                              <span className={styles.attachmentDownload}><DownloadOutlined /> Download</span>
                            </div>
                          </a>
                        </div>
                      )
                    ) : (
                      msg.message
                    )}
                  </div>
                  <div className={styles.messageMeta}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input + file upload */}
      <div className={styles.chatInputContainer}>
        <Upload
          beforeUpload={(file) => {
            handleUploadFile(file);
            return false;
          }}
          maxCount={1}
          disabled={uploading}
          showUploadList={false}
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        >
          <Tooltip title="Attach file">
            <PaperClipOutlined className={styles.chatAttachBtn} />
          </Tooltip>
        </Upload>
        
        <Input
          className={styles.chatInput}
          placeholder={uploading ? "Uploading file..." : "Type a message..."}
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={uploading}
        />
        
        <Tooltip title="Send message">
          <div
            className={`${styles.chatSendBtn} ${chatInput.trim() && !uploading ? styles.active : ''}`}
            onClick={() => {
              if (chatInput.trim() && !uploading) {
                handleSendMessage();
              }
            }}
          >
            <SendOutlined />
          </div>
        </Tooltip>
      </div>
    </div>
  );
};

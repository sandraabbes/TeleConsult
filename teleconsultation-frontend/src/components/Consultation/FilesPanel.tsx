import React from 'react';
import { Button, Empty, Tag, Tooltip } from 'antd';
import {
  DownloadOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileOutlined,
  UserOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import type { ConsultationFile } from '../../types/consultation';

interface FilesPanelProps {
  files: ConsultationFile[];
}

const getFileIcon = (fileType: string = '') => {
  const type = fileType.toLowerCase();
  if (type.includes('image') || type.includes('jpg') || type.includes('png') || type.includes('jpeg') || type.includes('gif')) {
    return <FileImageOutlined style={{ fontSize: '24px', color: '#1677ff' }} />;
  }
  if (type.includes('pdf')) {
    return <FilePdfOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />;
  }
  if (type.includes('word') || type.includes('doc')) {
    return <FileWordOutlined style={{ fontSize: '24px', color: '#1677ff' }} />;
  }
  if (type.includes('excel') || type.includes('sheet') || type.includes('xls')) {
    return <FileExcelOutlined style={{ fontSize: '24px', color: '#52c41a' }} />;
  }
  return <FileOutlined style={{ fontSize: '24px', color: 'var(--color-text-secondary)' }} />;
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return 'Unknown size';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 10) / 10} ${sizes[i]}`;
};

const getFileExtension = (fileName?: string, fileType?: string): string => {
  if (fileName) {
    const ext = fileName.split('.').pop()?.toUpperCase();
    if (ext && ext.length <= 5) return ext;
  }
  if (fileType) {
    const parts = fileType.split('/');
    return (parts[parts.length - 1] || fileType).toUpperCase().slice(0, 8);
  }
  return 'FILE';
};

const formatDate = (date?: Date | string): string => {
  if (!date) return 'Unknown date';
  try {
    return new Date(date).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown date';
  }
};

import config from '../../config/global.config';

const handleDownload = (file: ConsultationFile) => {
  if (!file.fileUrl) return;
  const link = document.createElement('a');
  
  // Prefix with backend URL if it's a relative path (and not a blob)
  const finalUrl = file.fileUrl.startsWith('http') || file.fileUrl.startsWith('blob:') 
    ? file.fileUrl 
    : `${config.API_BASE_URL.replace('/api', '')}${file.fileUrl}`;
    
  link.href = finalUrl;
  link.download = file.fileName || 'download';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const FilesPanel: React.FC<FilesPanelProps> = ({ files }) => {
  if (files.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px' }}>
        <Empty
          description={<span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>No files shared yet</span>}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '12px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {files.map((file, idx) => (
        <div
          key={file.id || idx}
          style={{
            background: 'var(--color-background-secondary)',
            border: '1px solid var(--color-border-tertiary)',
            borderRadius: '10px',
            padding: '12px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            transition: 'box-shadow 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
        >
          {/* Icon */}
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '8px',
            background: 'var(--color-background-primary)',
            border: '1px solid var(--color-border-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {getFileIcon(file.fileType)}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Tooltip title={file.fileName}>
              <p style={{
                margin: '0 0 4px 0',
                fontWeight: 600,
                fontSize: '13px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: 'var(--color-text-primary)',
              }}>
                {file.fileName || 'Unnamed file'}
              </p>
            </Tooltip>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '6px' }}>
              <Tag style={{ margin: 0, fontSize: '11px', padding: '0 6px', lineHeight: '18px' }}>
                {getFileExtension(file.fileName, file.fileType)}
              </Tag>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                {formatFileSize(file.fileSize)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {file.uploadedByRole === 'DOCTOR' ? (
                  <MedicineBoxOutlined style={{ fontSize: '11px', color: '#1677ff' }} />
                ) : (
                  <UserOutlined style={{ fontSize: '11px', color: '#52c41a' }} />
                )}
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  {file.uploadedByRole === 'DOCTOR' ? 'Doctor' : 'Patient'} · {formatDate(file.uploadedAt)}
                </span>
              </div>

              <Button
                type="primary"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(file)}
                disabled={!file.fileUrl}
                style={{ fontSize: '11px', height: '24px', padding: '0 8px', borderRadius: '6px' }}
              >
                Download
              </Button>
            </div>

            {file.description && (
              <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                {file.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

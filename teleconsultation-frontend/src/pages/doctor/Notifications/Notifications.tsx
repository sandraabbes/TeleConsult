import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Spin, message } from 'antd'
import {
  BellOutlined,
  CalendarOutlined,
  VideoCameraOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import api from '../../../api/axios'
import dayjs from 'dayjs'
import './Notifications.css'

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'consultations', label: 'Consultations' },
  { key: 'payments', label: 'Payments' },
]

const getNavigationPath = (notification: any): string | null => {
  switch (notification.type) {
    case 'APPOINTMENT_REQUESTED':
    case 'APPOINTMENT_CONFIRMED':
    case 'APPOINTMENT_CANCELLED':
      return '/doctor/appointments'
    case 'CONSULTATION_STARTING':
    case 'CONSULTATION_ENDED':
    case 'DOCTOR_READY':
      return '/doctor/consultations'
    case 'PAYMENT_SUCCESS':
    case 'PAYMENT_FAILED':
      return '/doctor/appointments'
    default:
      return null
  }
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'APPOINTMENT_REQUESTED':
    case 'APPOINTMENT_CONFIRMED':
    case 'APPOINTMENT_CANCELLED':
      return { icon: <CalendarOutlined />, bg: '#EFF6FF', color: '#1479FF' }
    case 'CONSULTATION_STARTING':
    case 'CONSULTATION_ENDED':
    case 'DOCTOR_READY':
      return { icon: <VideoCameraOutlined />, bg: '#DCFCE7', color: '#166534' }
    case 'PAYMENT_SUCCESS':
      return { icon: <CheckCircleOutlined />, bg: '#DCFCE7', color: '#166534' }
    case 'PAYMENT_FAILED':
      return { icon: <CloseCircleOutlined />, bg: '#FEE2E2', color: '#991B1B' }
    default:
      return { icon: <BellOutlined />, bg: '#F3F4F6', color: '#6B7280' }
  }
}

const getNotificationTitle = (type: string): string => {
  const map: Record<string, string> = {
    APPOINTMENT_REQUESTED: 'New Appointment Request',
    APPOINTMENT_CONFIRMED: 'Appointment Confirmed',
    APPOINTMENT_CANCELLED: 'Appointment Cancelled',
    CONSULTATION_STARTING: 'Consultation Starting',
    CONSULTATION_ENDED: 'Consultation Ended',
    DOCTOR_READY: 'Doctor is Ready',
    PAYMENT_SUCCESS: 'Payment Received',
    PAYMENT_FAILED: 'Payment Failed',
  }
  return map[type] || 'Notification'
}

const getNotificationAction = (notification: any): string | null => {
  switch (notification.type) {
    case 'APPOINTMENT_REQUESTED':
      return 'View Request'
    case 'APPOINTMENT_CONFIRMED':
      return 'View Appointment'
    case 'CONSULTATION_STARTING':
      return 'Join Consultation'
    case 'CONSULTATION_ENDED':
      return 'View Summary'
    case 'PAYMENT_SUCCESS':
    case 'PAYMENT_FAILED':
      return 'View Payment'
    default:
      return null
  }
}

const groupNotificationsByDate = (notifs: any[]) => {
  const groups: Record<string, any[]> = {}
  notifs.forEach(n => {
    const date = dayjs(n.createdAt)
    let key: string
    if (date.isSame(dayjs(), 'day')) key = 'TODAY'
    else if (date.isSame(dayjs().subtract(1, 'day'), 'day')) key = 'YESTERDAY'
    else key = date.format('MMM D, YYYY').toUpperCase()
    if (!groups[key]) groups[key] = []
    groups[key].push(n)
  })
  return groups
}

const Notifications = () => {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications')
      setNotifications(res.data || [])
    } catch {
      message.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`)
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
      window.dispatchEvent(new Event('notifications_updated'))
    } catch {
      // silent fail
    }
  }

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true)
    try {
      await api.patch('/notifications/mark-all-read')
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      message.success('All notifications marked as read')
      window.dispatchEvent(new Event('notifications_updated'))
    } catch {
      message.error('Failed to mark all as read')
    } finally {
      setMarkingAll(false)
    }
  }

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id)
    }
    const path = getNavigationPath(notification)
    if (path) navigate(path)
  }

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'appointments':
        return notifications.filter(n =>
          ['APPOINTMENT_REQUESTED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED'].includes(n.type)
        )
      case 'consultations':
        return notifications.filter(n =>
          ['CONSULTATION_STARTING', 'CONSULTATION_ENDED', 'DOCTOR_READY'].includes(n.type)
        )
      case 'payments':
        return notifications.filter(n =>
          ['PAYMENT_SUCCESS', 'PAYMENT_FAILED'].includes(n.type)
        )
      default:
        return notifications
    }
  }

  return (
    <div className="notifications-page">
      {/* Header */}
      <div className="notifications-header">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
            Notifications
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
            Stay updated with your latest health appointments and messages.
          </p>
        </div>
        <Button
          icon={<CheckCircleOutlined />}
          loading={markingAll}
          onClick={handleMarkAllAsRead}
          type="primary"
          style={{
            background: '#1479FF',
            borderColor: '#1479FF',
            borderRadius: 20,
            fontWeight: 600,
            height: 36,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Mark all as read
        </Button>
      </div>

      {/* Tabs */}
      <div className="notifications-tabs">
        {tabs.map(tab => (
          <div
            key={tab.key}
            className={`notifications-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Spin size="large" />
        </div>
      ) : Object.keys(groupNotificationsByDate(getFilteredNotifications())).length === 0 ? (
        <div className="notifications-empty">
          <HistoryOutlined style={{ fontSize: 40, color: '#D1D5DB', marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>
            No notifications found
          </p>
        </div>
      ) : (
        Object.entries(groupNotificationsByDate(getFilteredNotifications())).map(([dateLabel, notifs]) => (
          <div key={dateLabel} className="notifications-group">
            <p className="notifications-date-label">{dateLabel}</p>
            <div className="notifications-list">
              {notifs.map((notif: any, idx: number) => {
                const { icon, bg, color } = getNotificationIcon(notif.type)
                const isLast = idx === notifs.length - 1
                return (
                  <div
                    key={notif.id}
                    className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                    style={{ borderBottom: isLast ? 'none' : '1px solid #F3F4F6' }}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        color: color,
                        flexShrink: 0,
                      }}
                    >
                      {icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: notif.isRead ? 500 : 700,
                          color: '#111827',
                          margin: '0 0 4px 0',
                          lineHeight: 1.4,
                        }}
                      >
                        {getNotificationTitle(notif.type)}
                      </p>
                      <p
                        style={{
                          fontSize: 13,
                          color: '#6B7280',
                          margin: '0 0 8px 0',
                          lineHeight: 1.5,
                        }}
                      >
                        {notif.message}
                      </p>
                      {getNotificationAction(notif) && (
                        <div style={{ display: 'flex', gap: 12 }}>
                          <span
                            style={{
                              fontSize: 13,
                              color: '#1479FF',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            onClick={e => {
                              e.stopPropagation()
                              handleNotificationClick(notif)
                            }}
                          >
                            {getNotificationAction(notif)}
                          </span>
                          {!notif.isRead && (
                            <span
                              style={{
                                fontSize: 13,
                                color: '#9CA3AF',
                                cursor: 'pointer',
                              }}
                              onClick={e => {
                                e.stopPropagation()
                                handleMarkAsRead(notif.id)
                              }}
                            >
                              Dismiss
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side: time + unread dot */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 12, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                        {dayjs(notif.createdAt).format('MMM D, hh:mm A')}
                      </span>
                      {!notif.isRead ? (
                        <div
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            background: '#1479FF',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <CheckCircleOutlined style={{ fontSize: 14, color: '#D1D5DB' }} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

    </div>
  )
}

export default Notifications

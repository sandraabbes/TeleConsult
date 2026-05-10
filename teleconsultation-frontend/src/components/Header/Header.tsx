import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, Badge, Spin } from 'antd'
import {
  SearchOutlined,
  BellOutlined,
  CalendarOutlined,
  VideoCameraOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import './Header.css'

dayjs.extend(relativeTime)

/* ── helpers shared with Notifications page ── */

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

const getNavigationPath = (notification: any, userType: string | null): string | null => {
  const prefix = userType === 'DOCTOR' ? '/doctor' : '/patient'
  switch (notification.type) {
    case 'APPOINTMENT_REQUESTED':
    case 'APPOINTMENT_CONFIRMED':
    case 'APPOINTMENT_CANCELLED':
      return `${prefix}/appointments`
    case 'CONSULTATION_STARTING':
    case 'CONSULTATION_ENDED':
    case 'DOCTOR_READY':
      return `${prefix}/consultations`
    case 'PAYMENT_SUCCESS':
    case 'PAYMENT_FAILED':
      return `${prefix}/appointments`
    default:
      return null
  }
}

const Header = () => {
  const navigate = useNavigate()
  const { userType, isAuthenticated } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  // fetch unread count and recent notifications
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countRes, notifsRes] = await Promise.all([
          api.get('/notifications/unread-count'),
          api.get('/notifications')
        ])
        setUnreadCount(countRes.data.count ?? countRes.data ?? 0)
        setNotifications(notifsRes.data || [])
      } catch {
        // ignore
      }
    }
    if (isAuthenticated) {
      fetchData()
      const interval = setInterval(fetchData, 30000)
      window.addEventListener('notifications_updated', fetchData)
      return () => {
        clearInterval(interval)
        window.removeEventListener('notifications_updated', fetchData)
      }
    }
  }, [isAuthenticated])

  // close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleMarkAsRead = async (notificationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await api.patch(`/notifications/${notificationId}/read`)
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      window.dispatchEvent(new Event('notifications_updated'))
    } catch {
      // silent fail
    }
  }

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.patch('/notifications/mark-all-read')
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
      window.dispatchEvent(new Event('notifications_updated'))
    } catch {
      // silent fail
    }
  }

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id)
    }
    setOpen(false)
    const path = getNavigationPath(notification, userType)
    if (path) navigate(path)
  }

  const handleViewAll = () => {
    setOpen(false)
    navigate(userType === 'DOCTOR' ? '/doctor/notifications' : '/patient/notifications')
  }

  const recent = notifications.slice(0, 6)

  return (
    <div className="header">
      <div className="header-search">
        <Input
          prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
          placeholder="Search..."
          style={{
            maxWidth: 400,
            borderRadius: 10,
            background: '#F6F8F8',
            border: '1px solid #F3F4F6',
            height: 38,
            fontFamily: 'Manrope',
            fontSize: 14,
          }}
        />
      </div>
      <div className="header-right">
        <div className="notif-dropdown-wrapper">
          <Badge count={unreadCount} size="small" color="#1479FF" style={{ cursor: 'pointer' }}>
            <div
              ref={bellRef}
              className={`header-icon-btn ${open ? 'active' : ''}`}
              onClick={() => setOpen(prev => !prev)}
            >
              <BellOutlined style={{ fontSize: 16, color: open ? '#1479FF' : '#6B7280' }} />
            </div>
          </Badge>

          {open && (
            <div className="notif-popover" ref={popoverRef}>
              {/* Popover header */}
              <div className="notif-popover-header">
                <div className="notif-popover-title">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="notif-popover-badge">{unreadCount}</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button className="notif-mark-all-btn" onClick={handleMarkAllAsRead}>
                    <CheckCircleOutlined style={{ fontSize: 12 }} />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="notif-popover-list">
                {loading ? (
                  <div className="notif-popover-loading">
                    <Spin size="small" />
                  </div>
                ) : recent.length === 0 ? (
                  <div className="notif-popover-empty">
                    <BellOutlined style={{ fontSize: 28, color: '#D1D5DB', marginBottom: 8 }} />
                    <span>No notifications yet</span>
                  </div>
                ) : (
                  recent.map((n) => {
                    const { icon, bg, color } = getNotificationIcon(n.type)
                    return (
                      <div
                        key={n.id}
                        className={`notif-popover-item ${!n.isRead ? 'unread' : ''}`}
                        onClick={() => handleNotificationClick(n)}
                      >
                        <div className="notif-popover-icon" style={{ background: bg, color }}>
                          {icon}
                        </div>
                        <div className="notif-popover-content">
                          <div className="notif-popover-item-title">
                            {getNotificationTitle(n.type)}
                          </div>
                          <div className="notif-popover-item-msg">
                            {n.message}
                          </div>
                          <div className="notif-popover-item-time">
                            {dayjs(n.createdAt).fromNow()}
                          </div>
                        </div>
                        <div className="notif-popover-item-right">
                          {!n.isRead && (
                            <div
                              className="notif-unread-dot"
                              title="Mark as read"
                              onClick={(e) => handleMarkAsRead(n.id, e)}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Popover footer */}
              <div className="notif-popover-footer" onClick={handleViewAll}>
                <span>View all notifications</span>
                <ArrowRightOutlined style={{ fontSize: 11 }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Header

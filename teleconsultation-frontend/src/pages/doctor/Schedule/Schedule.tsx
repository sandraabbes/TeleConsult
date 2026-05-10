import { useState, useEffect, useCallback } from 'react'
import { Button, Switch, Table, Spin, message, Modal, InputNumber, TimePicker } from 'antd'
import {
  SaveOutlined,
  DeleteOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useAuth } from '../../../context/AuthContext'
import api from '../../../api/axios'
import dayjs from 'dayjs'
import './Schedule.css'

/* ───────── Types ───────── */

interface WorkSchedule {
  id?: number
  medecinId?: number
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDuration: number
}

interface DayConfig {
  enabled: boolean
  startTime: string | null
  endTime: string | null
  slotDuration: number
  selectedSlots: string[] // e.g. ['09:00', '09:30', ...]
}

/* ───────── Constants ───────── */

const DAYS = [
  { key: 1, label: 'Monday' },
  { key: 2, label: 'Tuesday' },
  { key: 3, label: 'Wednesday' },
  { key: 4, label: 'Thursday' },
  { key: 5, label: 'Friday' },
  { key: 6, label: 'Saturday' },
  { key: 0, label: 'Sunday' },
]

const DAY_LABELS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

const TIME_FORMAT = 'HH:mm'

/* ───────── Helpers ───────── */

/** Generate all slot start-times between startTime and endTime with given duration */
const generateSlots = (start: string, end: string, duration: number): string[] => {
  const slots: string[] = []
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let totalMin = sh * 60 + sm
  const endMin = eh * 60 + em

  while (totalMin + duration <= endMin) {
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    totalMin += duration
  }
  return slots
}

/** Merge consecutive selected slots back into time blocks */
const mergeSlots = (
  dayOfWeek: number,
  selectedSlots: string[],
  slotDuration: number
): WorkSchedule[] => {
  if (selectedSlots.length === 0) return []

  const sorted = [...selectedSlots].sort()
  const blocks: WorkSchedule[] = []
  let blockStart = sorted[0]
  let prevMin = timeToMin(sorted[0])

  for (let i = 1; i < sorted.length; i++) {
    const curMin = timeToMin(sorted[i])
    if (curMin !== prevMin + slotDuration) {
      // end the current block
      blocks.push({
        dayOfWeek,
        startTime: blockStart,
        endTime: minToTime(prevMin + slotDuration),
        slotDuration,
      })
      blockStart = sorted[i]
    }
    prevMin = curMin
  }

  // close final block
  blocks.push({
    dayOfWeek,
    startTime: blockStart,
    endTime: minToTime(prevMin + slotDuration),
    slotDuration,
  })

  return blocks
}

const timeToMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const minToTime = (min: number) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const formatTime12 = (t: string) => dayjs(t, 'HH:mm').format('hh:mm A')

/* ───────── Component ───────── */

const Schedule = () => {
  const { user } = useAuth()
  const doctorId = Number(user?.id)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [existingSchedules, setExistingSchedules] = useState<WorkSchedule[]>([])

  // Per-day config, keyed by dayOfWeek (0-6)
  const [dayConfigs, setDayConfigs] = useState<Record<number, DayConfig>>(() => {
    const init: Record<number, DayConfig> = {}
    DAYS.forEach(d => {
      init[d.key] = {
        enabled: false,
        startTime: null,
        endTime: null,
        slotDuration: 30,
        selectedSlots: [],
      }
    })
    return init
  })

  /* ── Fetch existing schedule ── */

  const fetchSchedule = useCallback(async () => {
    if (!doctorId) return
    setLoading(true)
    try {
      const res = await api.get(`/work-schedule/${doctorId}`)
      const schedules: WorkSchedule[] = res.data || []
      setExistingSchedules(schedules)

      // Populate form from existing schedules
      const newConfigs: Record<number, DayConfig> = {}
      DAYS.forEach(d => {
        newConfigs[d.key] = {
          enabled: false,
          startTime: null,
          endTime: null,
          slotDuration: 30,
          selectedSlots: [],
        }
      })

      // Group schedules by day
      const byDay: Record<number, WorkSchedule[]> = {}
      schedules.forEach(s => {
        if (!byDay[s.dayOfWeek]) byDay[s.dayOfWeek] = []
        byDay[s.dayOfWeek].push(s)
      })

      Object.entries(byDay).forEach(([dayStr, blocks]) => {
        const day = Number(dayStr)
        if (!newConfigs[day]) return

        // Find min start, max end across all blocks for this day
        const allStarts = blocks.map(b => timeToMin(b.startTime))
        const allEnds = blocks.map(b => timeToMin(b.endTime))
        const minStart = Math.min(...allStarts)
        const maxEnd = Math.max(...allEnds)
        const duration = blocks[0].slotDuration || 30

        // Generate full slot range
        const startStr = minToTime(minStart)
        const endStr = minToTime(maxEnd)
        const allSlots = generateSlots(startStr, endStr, duration)

        // Mark only slots within the saved blocks as selected
        const selected: string[] = []
        allSlots.forEach(slot => {
          const slotMin = timeToMin(slot)
          const isInBlock = blocks.some(
            b => slotMin >= timeToMin(b.startTime) && slotMin + duration <= timeToMin(b.endTime)
          )
          if (isInBlock) selected.push(slot)
        })

        newConfigs[day] = {
          enabled: true,
          startTime: startStr,
          endTime: endStr,
          slotDuration: duration,
          selectedSlots: selected,
        }
      })

      setDayConfigs(newConfigs)
    } catch {
      message.error('Failed to load work schedule')
    } finally {
      setLoading(false)
    }
  }, [doctorId])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  /* ── Update helpers ── */

  const updateDay = (dayOfWeek: number, updates: Partial<DayConfig>) => {
    setDayConfigs(prev => {
      const current = prev[dayOfWeek]
      const next = { ...current, ...updates }

      // Auto-regenerate slots when time or duration changes
      if (
        ('startTime' in updates || 'endTime' in updates || 'slotDuration' in updates) &&
        next.startTime &&
        next.endTime &&
        timeToMin(next.endTime) > timeToMin(next.startTime)
      ) {
        const allSlots = generateSlots(next.startTime, next.endTime, next.slotDuration)
        // if user just changed range, select all new slots by default
        next.selectedSlots = allSlots
      }

      return { ...prev, [dayOfWeek]: next }
    })
  }

  const toggleSlot = (dayOfWeek: number, slot: string) => {
    setDayConfigs(prev => {
      const current = prev[dayOfWeek]
      const selected = current.selectedSlots.includes(slot)
        ? current.selectedSlots.filter(s => s !== slot)
        : [...current.selectedSlots, slot]
      return { ...prev, [dayOfWeek]: { ...current, selectedSlots: selected } }
    })
  }

  /* ── Save ── */

  const handleSave = async () => {
    if (!doctorId) return

    // Validate
    const enabledDays = DAYS.filter(d => dayConfigs[d.key].enabled)
    if (enabledDays.length === 0) {
      message.warning('Please enable at least one day')
      return
    }

    for (const d of enabledDays) {
      const cfg = dayConfigs[d.key]
      if (!cfg.startTime || !cfg.endTime) {
        message.warning(`Please set start and end time for ${d.label}`)
        return
      }
      if (timeToMin(cfg.endTime) <= timeToMin(cfg.startTime)) {
        message.warning(`End time must be after start time for ${d.label}`)
        return
      }
      if (cfg.selectedSlots.length === 0) {
        message.warning(`Please select at least one slot for ${d.label}`)
        return
      }
    }

    setSaving(true)
    try {
      // Merge selected slots into contiguous blocks per day
      const allBlocks: WorkSchedule[] = []
      enabledDays.forEach(d => {
        const cfg = dayConfigs[d.key]
        const blocks = mergeSlots(d.key, cfg.selectedSlots, cfg.slotDuration)
        allBlocks.push(...blocks)
      })

      await api.post(`/work-schedule/${doctorId}`, allBlocks)
      message.success('Work schedule saved successfully')
      await fetchSchedule()
    } catch {
      message.error('Failed to save work schedule')
    } finally {
      setSaving(false)
    }
  }

  /* ── Delete ── */

  const handleDelete = () => {
    if (!doctorId) return
    Modal.confirm({
      title: 'Delete Work Schedule',
      content: 'Are you sure you want to delete your entire work schedule? This will also affect future generated availability slots.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.delete(`/work-schedule/${doctorId}`)
          message.success('Work schedule deleted')
          setExistingSchedules([])
          // Reset form
          const init: Record<number, DayConfig> = {}
          DAYS.forEach(d => {
            init[d.key] = {
              enabled: false,
              startTime: null,
              endTime: null,
              slotDuration: 30,
              selectedSlots: [],
            }
          })
          setDayConfigs(init)
        } catch {
          message.error('Failed to delete work schedule')
        }
      },
    })
  }

  /* ── Table columns ── */

  const columns: ColumnsType<WorkSchedule> = [
    {
      title: 'Day',
      dataIndex: 'dayOfWeek',
      key: 'dayOfWeek',
      width: 120,
      sorter: (a, b) => a.dayOfWeek - b.dayOfWeek,
      render: (d: number) => (
        <span style={{ fontWeight: 600, color: '#111827' }}>{DAY_LABELS[d]}</span>
      ),
    },
    {
      title: 'Start',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 100,
      render: (t: string) => (
        <span style={{ color: '#374151' }}>{formatTime12(t)}</span>
      ),
    },
    {
      title: 'End',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 100,
      render: (t: string) => (
        <span style={{ color: '#374151' }}>{formatTime12(t)}</span>
      ),
    },
    {
      title: 'Slot Duration',
      dataIndex: 'slotDuration',
      key: 'slotDuration',
      width: 120,
      render: (d: number) => (
        <span style={{ color: '#6B7280' }}>{d} min</span>
      ),
    },
    {
      title: 'Total Slots',
      key: 'totalSlots',
      width: 100,
      render: (_: any, record: WorkSchedule) => {
        const slots = generateSlots(record.startTime, record.endTime, record.slotDuration)
        return <span style={{ fontWeight: 600, color: '#1479FF' }}>{slots.length}</span>
      },
    },
  ]

  /* ── Render ── */

  if (loading) {
    return (
      <div className="schedule-page">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <Spin size="large" />
        </div>
      </div>
    )
  }

  return (
    <div className="schedule-page">
      {/* Header */}
      <div className="schedule-header">
        <div>
          <h1>Manage Your Work Schedule</h1>
          <p>Define your weekly availability. Slots are auto-generated for patient booking.</p>
        </div>
        <div className="schedule-header-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchSchedule}
            style={{
              borderRadius: 20,
              fontWeight: 600,
              height: 36,
              fontSize: 13,
            }}
          >
            Refresh
          </Button>
          {existingSchedules.length > 0 && (
            <Button
              icon={<DeleteOutlined />}
              danger
              onClick={handleDelete}
              style={{
                borderRadius: 20,
                fontWeight: 600,
                height: 36,
                fontSize: 13,
              }}
            >
              Delete Schedule
            </Button>
          )}
          <Button
            icon={<SaveOutlined />}
            type="primary"
            loading={saving}
            onClick={handleSave}
            style={{
              background: '#1479FF',
              borderColor: '#1479FF',
              borderRadius: 20,
              fontWeight: 600,
              height: 36,
              fontSize: 13,
            }}
          >
            Save Schedule
          </Button>
        </div>
      </div>

      {/* Help banner */}
      <div className="schedule-help-banner">
        <div className="help-icon">
          <InfoCircleOutlined />
        </div>
        <p>
          Slots will be auto-generated monthly based on this schedule. Select the days you work,
          set your hours, and deselect any specific slots you want to block.
        </p>
      </div>

      {/* Day cards grid */}
      <div className="schedule-days-grid">
        {DAYS.map(day => {
          const cfg = dayConfigs[day.key]
          const allSlots =
            cfg.startTime && cfg.endTime && timeToMin(cfg.endTime) > timeToMin(cfg.startTime)
              ? generateSlots(cfg.startTime, cfg.endTime, cfg.slotDuration)
              : []

          return (
            <div
              key={day.key}
              className={`schedule-day-card ${!cfg.enabled ? 'disabled' : ''}`}
            >
              {/* Day header */}
              <div className="schedule-day-card-header">
                <span className="day-name">
                  <CalendarOutlined style={{ marginRight: 8, color: '#1479FF' }} />
                  {day.label}
                </span>
                <Switch
                  checked={cfg.enabled}
                  onChange={checked => updateDay(day.key, { enabled: checked })}
                  size="small"
                  style={{ background: cfg.enabled ? '#1479FF' : undefined }}
                />
              </div>

              {/* Day body */}
              <div className="schedule-day-card-body">
                {/* Time pickers */}
                <div className="time-row">
                  <label>Start</label>
                  <TimePicker
                    value={cfg.startTime ? dayjs(cfg.startTime, TIME_FORMAT) : null}
                    format={TIME_FORMAT}
                    minuteStep={5}
                    size="small"
                    style={{ width: 100 }}
                    onChange={(val) => {
                      updateDay(day.key, {
                        startTime: val ? val.format(TIME_FORMAT) : null,
                      })
                    }}
                    disabled={!cfg.enabled}
                    placeholder="Start"
                    needConfirm={false}
                  />
                  <label>End</label>
                  <TimePicker
                    value={cfg.endTime ? dayjs(cfg.endTime, TIME_FORMAT) : null}
                    format={TIME_FORMAT}
                    minuteStep={5}
                    size="small"
                    style={{ width: 100 }}
                    onChange={(val) => {
                      updateDay(day.key, {
                        endTime: val ? val.format(TIME_FORMAT) : null,
                      })
                    }}
                    disabled={!cfg.enabled}
                    placeholder="End"
                    needConfirm={false}
                  />
                  <label>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    Slot
                  </label>
                  <InputNumber
                    value={cfg.slotDuration}
                    min={10}
                    max={120}
                    step={5}
                    size="small"
                    style={{ width: 72 }}
                    onChange={val => {
                      if (val) updateDay(day.key, { slotDuration: val })
                    }}
                    disabled={!cfg.enabled}
                    addonAfter="min"
                  />
                </div>


                {/* Generated slots */}
                {cfg.enabled && allSlots.length > 0 && (
                  <div className="schedule-slots-section">
                    <p className="slots-title">
                      Slots ({cfg.selectedSlots.length}/{allSlots.length} selected)
                    </p>
                    <div className="schedule-slots-grid">
                      {allSlots.map(slot => {
                        const isSelected = cfg.selectedSlots.includes(slot)
                        return (
                          <div
                            key={slot}
                            className={`schedule-slot-chip ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleSlot(day.key, slot)}
                          >
                            <span className="slot-check">
                              {isSelected && <CheckOutlined />}
                            </span>
                            {formatTime12(slot)}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {cfg.enabled &&
                  cfg.startTime &&
                  cfg.endTime &&
                  timeToMin(cfg.endTime) <= timeToMin(cfg.startTime) && (
                    <p style={{ fontSize: 12, color: '#EF4444', margin: '8px 0 0' }}>
                      End time must be after start time
                    </p>
                  )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Existing schedule table */}
      <div className="schedule-table-section">
        <h2>Current Schedule</h2>
        <p>Your saved work schedule blocks are shown below.</p>
        <div className="schedule-table-card">
          {existingSchedules.length === 0 ? (
            <div className="schedule-empty">
              <CalendarOutlined style={{ fontSize: 40, color: '#D1D5DB' }} />
              <p>No schedule configured yet</p>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={existingSchedules}
              rowKey={(r) => `${r.dayOfWeek}-${r.startTime}-${r.endTime}`}
              pagination={false}
              size="middle"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default Schedule

import React, { useState } from 'react';
import { Input, Button, Empty, Card } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { DoctorNotes, Prescription } from '../../types/consultation';

interface DoctorNotesPanelProps {
  notes: DoctorNotes;
  onUpdate: (updates: Partial<DoctorNotes>) => void;
  isReadOnly?: boolean;
}

export const DoctorNotesPanel: React.FC<DoctorNotesPanelProps> = ({
  notes,
  onUpdate,
  isReadOnly = false,
}) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(notes.prescriptions);
  const [newNote, setNewNote] = useState('');

  const handleAppendNote = () => {
    if (!newNote.trim()) return;
    const currentNotes = notes.notes || '';
    const prefix = currentNotes.trim() ? `${currentNotes}\n\n` : '';
    const updatedNotes = `${prefix}- ${newNote.trim()}`;
    
    onUpdate({ notes: updatedNotes });
    setNewNote('');
  };

  const handleAddPrescription = () => {
    const newPrescription: Prescription = {
      medication: '',
      dosage: '',
      duration: '',
      instructions: '',
    };
    const updated = [...prescriptions, newPrescription];
    setPrescriptions(updated);
    onUpdate({ prescriptions: updated });
  };

  const handleUpdatePrescription = (index: number, field: keyof Prescription, value: string) => {
    const updated = [...prescriptions];
    updated[index] = { ...updated[index], [field]: value };
    setPrescriptions(updated);
    onUpdate({ prescriptions: updated });
  };

  const handleRemovePrescription = (index: number) => {
    const updated = prescriptions.filter((_: any, i) => i !== index);
    setPrescriptions(updated);
    onUpdate({ prescriptions: updated });
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '4px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px', gap: '16px', overflowY: 'auto' }}>

      {/* Diagnosis */}
      <div>
        <label style={labelStyle}>Diagnosis</label>
        <Input.TextArea
          placeholder="Clinical diagnosis..."
          value={notes.diagnosis}
          onChange={(e) => onUpdate({ diagnosis: e.target.value })}
          rows={2}
          disabled={isReadOnly}
          style={{ fontSize: '13px', resize: 'none' }}
        />
      </div>

      {/* Notes — single unified field */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={labelStyle}>Clinical Notes</label>
        
        {/* Main editable notes area */}
        <Input.TextArea
          placeholder="Clinical observations, findings, and any additional notes..."
          value={notes.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          rows={5}
          disabled={isReadOnly}
          style={{ fontSize: '13px', resize: 'none' }}
        />

        {/* Quick Add Note Appender */}
        {!isReadOnly && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <Input.TextArea
              placeholder="Quickly append a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleAppendNote();
                }
              }}
              rows={1}
              style={{ fontSize: '13px', resize: 'none', flex: 1 }}
              autoSize={{ minRows: 1, maxRows: 3 }}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAppendNote}
              disabled={!newNote.trim()}
              size="small"
              style={{ marginTop: '2px' }}
            >
              Add Note
            </Button>
          </div>
        )}
      </div>

      {/* Prescriptions */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{ ...labelStyle, margin: 0 }}>Prescriptions</label>
          {!isReadOnly && (
            <Button
              type="primary"
              ghost
              icon={<PlusOutlined />}
              size="small"
              onClick={handleAddPrescription}
            >
              Add
            </Button>
          )}
        </div>

        {prescriptions.length === 0 ? (
          <Empty description="No prescriptions added" style={{ marginTop: '12px' }} />
        ) : (
          prescriptions.map((rx, idx) => (
            <Card
              key={idx}
              size="small"
              style={{ marginBottom: '10px', borderRadius: '8px' }}
              title={<span style={{ fontSize: '13px', fontWeight: 600 }}>Prescription {idx + 1}</span>}
              extra={
                !isReadOnly && (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    onClick={() => handleRemovePrescription(idx)}
                  />
                )
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>Medication</label>
                  <Input
                    placeholder="e.g., Amoxicillin"
                    value={rx.medication}
                    onChange={(e) => handleUpdatePrescription(idx, 'medication', e.target.value)}
                    disabled={isReadOnly}
                    size="small"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>Dosage</label>
                    <Input
                      placeholder="e.g., 500mg"
                      value={rx.dosage}
                      onChange={(e) => handleUpdatePrescription(idx, 'dosage', e.target.value)}
                      disabled={isReadOnly}
                      size="small"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>Duration</label>
                    <Input
                      placeholder="e.g., 7 days"
                      value={rx.duration}
                      onChange={(e) => handleUpdatePrescription(idx, 'duration', e.target.value)}
                      disabled={isReadOnly}
                      size="small"
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>Instructions</label>
                  <Input.TextArea
                    placeholder="e.g., Take one tablet three times daily with food"
                    value={rx.instructions}
                    onChange={(e) => handleUpdatePrescription(idx, 'instructions', e.target.value)}
                    disabled={isReadOnly}
                    rows={2}
                    size="small"
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

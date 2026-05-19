'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';

interface CustomDateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onRangeChange: (start: string, end: string, label: string) => void;
  label: string;
}

const PRESETS = [
  { val: 'today', label: 'Today' },
  { val: 'yesterday', label: 'Yesterday' },
  { val: '7days', label: 'Last 7 Days' },
  { val: '30days', label: 'Last 30 Days' },
  { val: 'thisMonth', label: 'This Month' },
  { val: 'custom', label: 'Custom Range' },
];

export default function CustomDateRangePicker({ startDate, endDate, onRangeChange, label }: CustomDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse strings to Dates for the calendar
  const sDate = new Date(startDate);
  const eDate = new Date(endDate);

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'Select Date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handlePresetSelect = (preset: string, presetLabel: string) => {
    const today = new Date();
    let start = '';
    let end = getLocalDateString(today);

    if (preset === 'today') {
      start = getLocalDateString(today);
    } else if (preset === 'yesterday') {
      const d = new Date(); d.setDate(d.getDate() - 1);
      start = getLocalDateString(d);
      end = getLocalDateString(d);
    } else if (preset === '7days') {
      const d = new Date(); d.setDate(d.getDate() - 7);
      start = getLocalDateString(d);
    } else if (preset === '30days') {
      const d = new Date(); d.setDate(d.getDate() - 30);
      start = getLocalDateString(d);
    } else if (preset === 'thisMonth') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      start = getLocalDateString(d);
    } else if (preset === 'custom') {
        // Just switch to custom view without closing
        return;
    }

    onRangeChange(start, end, presetLabel);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...styles.trigger,
          borderColor: isOpen ? 'var(--color-primary)' : 'var(--color-border)',
        }}
      >
        <CalendarIcon size={16} color="var(--color-primary)" />
        <span style={styles.triggerLabel}>
          {label === 'Custom' || label === 'Custom Range' 
            ? `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}` 
            : label}
        </span>
        <ChevronDown 
          size={16} 
          color="var(--color-text-muted)" 
          style={{ 
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' 
          }} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={styles.popover}
          >
            <div style={styles.popoverContent}>
              {/* Sidebar Presets */}
              <div style={styles.sidebar}>
                <div style={styles.sidebarHeader}>Range Presets</div>
                {PRESETS.map(opt => (
                  <div 
                    key={opt.val}
                    onClick={() => handlePresetSelect(opt.val, opt.label)}
                    style={{ 
                        ...styles.presetItem, 
                        backgroundColor: label === opt.label ? 'var(--color-primary-light)' : 'transparent',
                        color: label === opt.label ? 'var(--color-primary)' : 'var(--color-text-main)',
                    }}
                    onMouseOver={(e) => {
                      if (label !== opt.label) e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                    }}
                    onMouseOut={(e) => {
                      if (label !== opt.label) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {opt.label}
                    {label === opt.label && <Check size={14} />}
                  </div>
                ))}
              </div>

              {/* Main Custom Picker Area */}
              <div style={styles.mainPicker}>
                <div style={styles.pickerHeader}>Custom Date Range</div>
                <div style={styles.dateInputsRow}>
                  <div style={styles.inputGroup}>
                    <label style={styles.inputLabel}>Start Date</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      max={endDate}
                      onChange={e => {
                        const newStart = e.target.value;
                        if (endDate && newStart > endDate) {
                          onRangeChange(newStart, newStart, 'Custom');
                        } else {
                          onRangeChange(newStart, endDate, 'Custom');
                        }
                      }} 
                      style={styles.dateInput}
                    />
                  </div>
                  <div style={styles.inputDivider}>to</div>
                  <div style={styles.inputGroup}>
                    <label style={styles.inputLabel}>End Date</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      min={startDate}
                      onChange={e => {
                        const newEnd = e.target.value;
                        if (startDate && newEnd < startDate) {
                          onRangeChange(newEnd, newEnd, 'Custom');
                        } else {
                          onRangeChange(startDate, newEnd, 'Custom');
                        }
                      }} 
                      style={styles.dateInput}
                    />
                  </div>
                </div>

                <div style={styles.helperText}>
                  Choose a start and end date to filter your analytics.
                </div>

                <div style={styles.footer}>
                    <button 
                        style={styles.applyButton}
                        onClick={() => setIsOpen(false)}
                    >
                        Apply Filter
                    </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  trigger: {
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    padding: '0 20px',
    backgroundColor: 'var(--color-bg-card)', 
    border: '1px solid var(--color-border)', 
    borderRadius: '14px',
    height: '52px', 
    boxShadow: '0 4px 12px var(--color-shadow)', 
    transition: 'all 0.3s ease',
    outline: 'none',
    minWidth: '240px',
    cursor: 'pointer',
  },
  triggerLabel: {
    fontSize: '14px', 
    fontWeight: '600', 
    color: 'var(--color-text-main)', 
    flex: 1, 
    textAlign: 'left'
  },
  popover: {
    position: 'absolute', 
    top: 'calc(100% + 12px)', 
    right: 0, 
    background: 'var(--color-bg-card)', 
    borderRadius: '20px', 
    boxShadow: '0 20px 50px -12px var(--color-shadow)', 
    zIndex: 100, 
    overflow: 'hidden', 
    border: '1px solid var(--color-border)',
    width: '540px',
  },
  popoverContent: {
    display: 'flex',
    minHeight: '340px',
  },
  sidebar: {
    width: '180px',
    backgroundColor: 'var(--color-bg-sidebar)',
    borderRight: '1px solid var(--color-border)',
    padding: '20px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sidebarHeader: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '0 12px 12px',
  },
  presetItem: {
    padding: '10px 12px',
    fontSize: '13px',
    fontWeight: '600',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.2s ease',
  },
  mainPicker: {
    flex: 1,
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
  },
  pickerHeader: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    marginBottom: '24px',
  },
  dateInputsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  inputGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inputLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
  },
  dateInput: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--color-text-main)',
    outline: 'none',
    backgroundColor: 'var(--color-bg-hover)',
    transition: 'border-color 0.2s ease',
    fontFamily: 'inherit',
  },
  inputDivider: {
    paddingTop: '20px',
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    fontWeight: '500',
  },
  helperText: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    lineHeight: '1.5',
    marginBottom: '32px',
  },
  footer: {
    marginTop: 'auto',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  applyButton: {
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    fontWeight: '600',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
    cursor: 'pointer',
  }
};

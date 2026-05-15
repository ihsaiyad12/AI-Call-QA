'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface CustomSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  options,
  onChange,
  disabled = false,
  searchable = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = searchable 
    ? options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div style={styles.container} ref={containerRef}>
      <label style={styles.label}>{label}</label>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          ...styles.selectTrigger,
          ...(disabled ? styles.disabled : {}),
          borderColor: isOpen ? 'var(--color-primary)' : 'var(--color-border)',
          boxShadow: isOpen ? '0 0 0 2px rgba(79, 70, 229, 0.1)' : 'none'
        }}
      >
        <span style={{ 
          color: value ? 'var(--color-text-main)' : 'var(--color-text-muted)',
          fontSize: '14px'
        }}>
          {value || 'Select an option...'}
        </span>
        <ChevronDown 
          size={16} 
          style={{ 
            transition: 'transform 0.2s', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            color: 'var(--color-text-muted)'
          }} 
        />
      </div>

      {isOpen && (
        <div style={styles.dropdown}>
          {searchable && (
            <div style={styles.searchWrapper}>
              <Search size={14} color="var(--color-text-muted)" />
              <input 
                autoFocus
                type="text" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                style={styles.searchInput}
              />
            </div>
          )}
          <div style={styles.optionsList}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div 
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  style={{
                    ...styles.option,
                    backgroundColor: value === opt ? 'var(--color-primary-light)' : 'transparent',
                    color: value === opt ? 'var(--color-primary)' : 'var(--color-text-main)',
                  }}
                  onMouseOver={(e) => {
                    if (value !== opt) e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                  }}
                  onMouseOut={(e) => {
                    if (value !== opt) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {opt}
                </div>
              ))
            ) : (
              <div style={styles.noResults}>No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-text-main)'
  },
  selectTrigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '42px'
  },
  disabled: {
    backgroundColor: 'var(--color-bg-hover)',
    cursor: 'not-allowed',
    opacity: 0.7
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    right: 0,
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 10px 30px var(--color-shadow)',
    zIndex: 100,
    overflow: 'hidden'
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-hover)'
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    backgroundColor: 'transparent'
  },
  optionsList: {
    maxHeight: '240px',
    overflowY: 'auto'
  },
  option: {
    padding: '10px 14px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  noResults: {
    padding: '14px',
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    textAlign: 'center'
  }
};

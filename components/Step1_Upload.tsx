'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Upload, X, FileText, ChevronRight, Settings, Search, UserCheck, PenLine, Database, Info } from 'lucide-react';
import { AIProvider, LeadData, LeadRecord } from '@/types';
import { CustomSelect } from './CustomSelect';

interface Step1UploadProps {
  audioFile: File | null;
  setAudioFile: (file: File | null) => void;
  selectedProvider: AIProvider;
  setSelectedProvider: (provider: AIProvider) => void;
  manualTranscript: string;
  setManualTranscript: (text: string) => void;
  useManualTranscript: boolean;
  setUseManualTranscript: (use: boolean) => void;
  onStart: () => void;
  leadData: LeadData;
  setLeadData: (data: any) => void;
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
  selectedLeadStatus: string | null;
  setSelectedLeadStatus: (status: string | null) => void;
}

const CATEGORIES = [
  'Accounting', 'Construction Management', 'CRM', 'HR', 'Insurance',
  'Legal Practice Management', 'LMS', 'Manufacturing Software',
  'Marketing Automation', 'Marketing Software', 'Medical', 'Other',
  'Payroll for Nannies/Caregivers', 'Project Management', 'Property Management',
  'Software Development', 'ERP', 'CMMS', 'Service Software', 'Management Software',
  'Analytics Tools & Software', 'Artificial Intelligence', 'Auto Repair',
  'Call Center', 'Collaboration & Productivity', 'Content Management',
  'Customer Service', 'Cyber Security', 'E-Commerce', 'EMR',
  'Enterprise Resource Planning', 'Event Management', 'Field Service',
  'Fleet Management', 'Non-Profit', 'Retail POS Systems', 'Sales Tools',
  'Supply Chain Management', 'Corporate Insurance And Risk Management',
  'Ecosystem Service Providers', 'Search Result', 'Ecommerce Software',
  'Best Background Check', 'Agile Project Management Tools', 'ATS',
  'Design Software', 'For Marketers', 'Finance', 'Compliance',
  'Email Marketing Software', 'Moving Company Software',
];

const AI_PROVIDERS = [
  'groq', 'gemini', 'openai', 'claude'
];

const AI_PROVIDER_LABELS: Record<string, string> = {
  'groq': 'Groq (Llama 3.3 70B)',
  'gemini': 'Gemini (Flash-Latest)',
  'openai': 'OpenAI (GPT-4o Mini)',
  'claude': 'Claude (Sonnet 4.6)'
};

const Step1_Upload: React.FC<Step1UploadProps> = ({
  audioFile, setAudioFile, selectedProvider, setSelectedProvider,
  manualTranscript, setManualTranscript, useManualTranscript, setUseManualTranscript,
  onStart, leadData, setLeadData, selectedLeadId, setSelectedLeadId,
  selectedLeadStatus, setSelectedLeadStatus,
}) => {
  const [entryMode, setEntryMode] = useState<'search' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LeadRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/leads?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const handleSelectLead = (lead: LeadRecord) => {
    setSelectedLeadId(lead.id);
    setSelectedLeadStatus(lead.status);
    setLeadData({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      category: lead.category,
      employeeCount: lead.employeeCount,
      jobTitle: lead.jobTitle || '',
      aiProvider: lead.aiProvider || '',
    });
    if (lead.aiProvider) {
      setSelectedProvider(lead.aiProvider as AIProvider);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClearSelection = () => {
    setSelectedLeadId(null);
    setSelectedLeadStatus(null);
    setLeadData({ firstName: '', lastName: '', email: '', phone: '+1', category: 'Other', employeeCount: '', jobTitle: '' });
    setSearchQuery('');
  };

  const handleLeadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLeadData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setLeadData((prev: any) => ({ ...prev, phone: `+1${digits}` }));
  };

  const phoneDigits = leadData.phone.startsWith('+1') ? leadData.phone.slice(2) : leadData.phone;

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('audio/') || file.type === 'video/mp4')) {
      setAudioFile(file);
    }
  }, [setAudioFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAudioFile(file);
  };

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const isLeadValid = 
    leadData.firstName?.trim() && 
    leadData.lastName?.trim() && 
    leadData.email?.trim() && 
    EMAIL_REGEX.test(leadData.email.trim()) &&
    leadData.phone?.length === 12 && 
    parseInt(leadData.employeeCount) > 0 && 
    leadData.jobTitle?.trim();
  const isFormValid = isLeadValid && (useManualTranscript ? manualTranscript.length > 50 : audioFile !== null);

  const isReadOnly = !!selectedLeadId;

  return (
    <div style={styles.container}>
      {/* ── TOP SECTION: Mode Toggle & Search ── */}
      <div className="card fade-in" style={{ ...styles.section, marginBottom: '24px', padding: '24px', position: 'relative', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={styles.iconBox}><Settings size={20} color="var(--color-primary)" /></div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-text-main)', letterSpacing: '-0.5px' }}>Lead Analysis Setup</h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Configure lead details and call recording</p>
            </div>
          </div>

          {!isReadOnly && (
            <div style={styles.modeToggle}>
              <button
                type="button"
                onClick={() => { setEntryMode('search'); handleClearSelection(); }}
                style={{
                  ...styles.modeBtn,
                  backgroundColor: entryMode === 'search' ? 'var(--color-primary)' : 'transparent',
                  color: entryMode === 'search' ? 'white' : 'var(--color-text-muted)',
                  borderColor: entryMode === 'search' ? 'var(--color-primary)' : 'transparent',
                  boxShadow: entryMode === 'search' ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none',
                }}
              >
                <Search size={14} /> Search Existing
              </button>
              <button
                type="button"
                onClick={() => { setEntryMode('manual'); handleClearSelection(); }}
                style={{
                  ...styles.modeBtn,
                  backgroundColor: entryMode === 'manual' ? 'var(--color-primary)' : 'transparent',
                  color: entryMode === 'manual' ? 'white' : 'var(--color-text-muted)',
                  borderColor: entryMode === 'manual' ? 'var(--color-primary)' : 'transparent',
                  boxShadow: entryMode === 'manual' ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none',
                }}
              >
                <PenLine size={14} /> Manual Entry
              </button>
            </div>
          )}
        </div>

        {entryMode === 'search' && !isReadOnly && (
          <div style={{ marginTop: '20px', position: 'relative' }}>
            <div style={styles.searchInputWrapper}>
              <Search size={18} color="var(--color-text-muted)" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
                placeholder="Search by email, name, or phone number..."
              />
              {isSearching && <div className="spin-animation" style={{ width: '16px', height: '16px', border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />}
            </div>

            {searchResults.length > 0 && (
              <div style={styles.resultsDropdown}>
                {searchResults.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => handleSelectLead(lead)}
                    style={styles.resultItem}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--color-text-main)' }}>{lead.firstName} {lead.lastName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{lead.email} · {lead.phone}</div>
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: '700', padding: '4px 10px', borderRadius: '99px', textTransform: 'uppercase',
                      backgroundColor: lead.status === 'PENDING' ? 'var(--color-amber-bg)' : lead.status === 'ANALYZED' ? 'var(--color-green-bg)' : 'var(--color-primary-light)',
                      color: lead.status === 'PENDING' ? 'var(--color-amber)' : lead.status === 'ANALYZED' ? 'var(--color-green)' : 'var(--color-primary)',
                    }}>
                      {lead.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isReadOnly && (
          <div style={styles.selectedLeadCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <div style={styles.avatarSmall}>
                {leadData.firstName[0]}{leadData.lastName[0]}
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--color-green)' }}>{leadData.firstName} {leadData.lastName}</div>
                <div style={{ fontSize: '12px', color: 'rgba(16, 185, 129, 0.8)' }}>{leadData.email}</div>
              </div>
            </div>
            <button type="button" onClick={handleClearSelection} style={styles.clearBtn}>
              <X size={14} /> Remove
            </button>
          </div>
        )}
      </div>

      <div style={styles.mainGrid}>
        {/* ── LEFT COLUMN: LEAD DATA ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card fade-in" style={{ ...styles.section, flex: 1 }}>
            <div style={styles.sectionHeader}>
              <UserCheck size={16} color="var(--color-primary)" />
              <span style={styles.sectionTitle}>Lead Details</span>
            </div>

            <div style={styles.leadGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>First Name *</label>
                <input type="text" name="firstName" value={leadData.firstName} onChange={handleLeadChange} style={{ ...styles.input, ...(isReadOnly && styles.readOnly) }} placeholder="John" readOnly={isReadOnly} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Last Name *</label>
                <input type="text" name="lastName" value={leadData.lastName} onChange={handleLeadChange} style={{ ...styles.input, ...(isReadOnly && styles.readOnly) }} placeholder="Doe" readOnly={isReadOnly} />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Job Title *</label>
              <input type="text" name="jobTitle" value={leadData.jobTitle} onChange={handleLeadChange} style={{ ...styles.input, ...(isReadOnly && styles.readOnly) }} placeholder="e.g. Managing Partner" readOnly={isReadOnly} />
            </div>

            <div style={{ ...styles.leadGrid, marginTop: '16px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email *</label>
                <input 
                  type="email" 
                  name="email" 
                  value={leadData.email} 
                  onChange={handleLeadChange} 
                  onBlur={() => {
                    if (!isReadOnly) {
                      setLeadData((prev: any) => ({ ...prev, email: prev.email.trim() }));
                    }
                  }}
                  style={{ 
                    ...styles.input, 
                    ...(isReadOnly && styles.readOnly),
                    borderColor: !isReadOnly && leadData.email && !EMAIL_REGEX.test(leadData.email.trim()) ? 'var(--color-red)' : 'var(--color-border)'
                  }} 
                  placeholder="john@company.com" 
                  readOnly={isReadOnly} 
                />
                {!isReadOnly && leadData.email && !EMAIL_REGEX.test(leadData.email.trim()) && (
                  <span style={{ color: 'var(--color-red)', fontSize: '11px', marginTop: '4px' }}>
                    Please enter a valid email address (no spaces allowed)
                  </span>
                )}
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone *</label>
                <div style={styles.phoneInputGroup}>
                  <span style={styles.phonePrefix}>+1</span>
                  <input
                    type="tel" name="phone" value={phoneDigits} onChange={handlePhoneChange}
                    style={{ ...styles.phoneInput, ...(isReadOnly && styles.readOnly) }}
                    placeholder="5550000000" maxLength={10} inputMode="numeric" readOnly={isReadOnly}
                  />
                </div>
              </div>
            </div>

            <div style={{ ...styles.leadGrid, marginTop: '16px' }}>
              <CustomSelect 
                label="Industry Category *"
                value={leadData.category}
                options={CATEGORIES}
                onChange={(val) => setLeadData((p: any) => ({ ...p, category: val }))}
                disabled={isReadOnly}
                searchable
              />
              <div style={styles.formGroup}>
                <label style={styles.label}>Team Size *</label>
                <input
                  type="number" name="employeeCount" value={leadData.employeeCount} onChange={handleLeadChange}
                  style={{ ...styles.input, ...(isReadOnly && styles.readOnly) }} placeholder="e.g. 50" min={1}
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: RECORDING & CONFIG ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* AI Config */}
          <div className="card fade-in" style={{ ...styles.section, zIndex: 2, position: 'relative' }}>
            <div style={styles.sectionHeader}>
              <Settings size={16} color="var(--color-primary)" />
              <span style={styles.sectionTitle}>Processing Model</span>
            </div>
            <CustomSelect 
              label="Select AI Engine"
              value={AI_PROVIDER_LABELS[selectedProvider]}
              options={AI_PROVIDERS.map(p => AI_PROVIDER_LABELS[p])}
              onChange={(val) => {
                const provider = Object.keys(AI_PROVIDER_LABELS).find(key => AI_PROVIDER_LABELS[key] === val);
                if (provider) setSelectedProvider(provider as AIProvider);
              }}
            />
          </div>

          {/* Recording / Transcript */}
          <div className="card fade-in" style={{ ...styles.section, flex: 1, zIndex: 1, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={styles.sectionHeader}>
                <Database size={16} color="var(--color-primary)" />
                <span style={styles.sectionTitle}>Call Recording</span>
              </div>
              <button
                onClick={() => setUseManualTranscript(!useManualTranscript)}
                style={styles.switchBtn}
              >
                {useManualTranscript ? 'Switch to Audio' : 'Switch to Text'}
              </button>
            </div>

            {!useManualTranscript ? (
              <div onDrop={onDrop} onDragOver={(e) => e.preventDefault()} style={styles.dropzone}>
                <input type="file" id="audio-upload" hidden accept="audio/*,video/mp4" onChange={handleFileChange} />
                {!audioFile ? (
                  <label htmlFor="audio-upload" style={styles.uploadLabel}>
                    <div style={styles.iconCircle}><Upload size={24} color="var(--color-primary)" /></div>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--color-text-main)' }}>Upload MP3/WAV file</div>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Drag & drop or click to browse</p>
                  </label>
                ) : (
                  <div style={styles.filePreview}>
                    <div style={styles.iconCircle}><FileText size={20} color="var(--color-primary)" /></div>
                    <div style={styles.fileInfo}>
                      <p style={{ fontWeight: '700', fontSize: '13px', color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{audioFile.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setAudioFile(null); }} style={styles.removeBtn}><X size={16} /></button>
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.manualContainer}>
                <textarea 
                  placeholder="Paste the call conversation here... (Min 50 characters)" 
                  value={manualTranscript} 
                  onChange={(e) => setManualTranscript(e.target.value)} 
                  style={styles.textarea} 
                />
              </div>
            )}

            {selectedLeadStatus === 'PUSHED_TO_CRM' && (
              <div style={styles.crmNotice}>
                <Info size={14} />
                <span>Pushed to CRM. Re-analysis restricted.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
        <button 
          className="primary-button" 
          disabled={!isFormValid || selectedLeadStatus === 'PUSHED_TO_CRM'} 
          onClick={onStart}
          style={{ 
            minWidth: '240px', 
            padding: '16px 40px',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '12px',
            opacity: selectedLeadStatus === 'PUSHED_TO_CRM' ? 0.6 : 1,
            borderRadius: '12px',
            fontSize: '15px'
          }}
        >
          Begin Analysis <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'stretch' },
  section: { padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', boxShadow: '0 8px 30px var(--color-shadow)' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' },
  sectionTitle: { fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-text-main)' },
  
  iconBox: { width: '42px', height: '42px', borderRadius: '12px', backgroundColor: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  modeToggle: { display: 'flex', gap: '10px', backgroundColor: 'var(--color-bg-hover)', padding: '4px', borderRadius: '12px' },
  modeBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
    borderRadius: '10px', borderWidth: '1px', borderStyle: 'solid', borderColor: 'transparent', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
    transition: 'all 0.2s',
  },

  searchInputWrapper: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
    borderRadius: '12px', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-hover)',
    transition: 'all 0.2s',
  },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '14px', backgroundColor: 'transparent', color: 'var(--color-text-main)' },
  
  resultsDropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
    backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)',
    boxShadow: '0 10px 30px var(--color-shadow)', zIndex: 10, overflow: 'hidden'
  },
  resultItem: { 
    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
    cursor: 'pointer', transition: 'all 0.2s', borderBottom: '1px solid var(--color-border)'
  },

  selectedLeadCard: {
    marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px',
    borderRadius: '14px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--color-green)'
  },
  avatarSmall: { 
    width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--color-green)', 
    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' 
  },
  clearBtn: {
    padding: '6px 12px', borderRadius: '8px', backgroundColor: 'var(--color-border-hover)', border: '1px solid rgba(16, 185, 129, 0.2)',
    fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: 'var(--color-green)', display: 'flex', alignItems: 'center', gap: '4px'
  },

  leadGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)' },
  input: {
    width: '100%', padding: '11px 14px', borderRadius: '10px', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border)',
    backgroundColor: 'var(--color-bg-hover)', color: 'var(--color-text-main)', fontSize: '14px', outline: 'none', transition: 'all 0.2s'
  },
  readOnly: { backgroundColor: 'var(--color-bg-hover)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' },

  phoneInputGroup: { display: 'flex', alignItems: 'center', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border)', borderRadius: '10px', overflow: 'hidden' },
  phonePrefix: { padding: '11px 14px', backgroundColor: 'var(--color-bg-hover)', borderRight: '1px solid var(--color-border)', fontSize: '14px', fontWeight: '700', color: 'var(--color-text-muted)' },
  phoneInput: { flex: 1, padding: '11px 14px', border: 'none', outline: 'none', fontSize: '14px', backgroundColor: 'transparent', color: 'var(--color-text-main)' },

  switchBtn: { 
    padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--color-primary-light)', 
    backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' 
  },
  dropzone: {
    border: '2px dashed var(--color-border)', borderRadius: '16px', padding: '32px 20px',
    textAlign: 'center', transition: 'all 0.2s ease', backgroundColor: 'var(--color-bg-hover)', cursor: 'pointer'
  },
  uploadLabel: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  iconCircle: { width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'var(--color-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px var(--color-shadow)' },
  
  filePreview: { display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', backgroundColor: 'var(--color-bg-hover)', borderRadius: '12px', border: '1px solid var(--color-border)' },
  fileInfo: { flex: 1, minWidth: 0 },
  removeBtn: { padding: '6px', backgroundColor: 'var(--color-red-bg)', border: 'none', color: 'var(--color-red)', borderRadius: '8px', cursor: 'pointer' },

  manualContainer: { width: '100%' },
  textarea: {
    width: '100%', height: '180px', borderRadius: '12px', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--color-border)',
    backgroundColor: 'var(--color-bg-hover)', color: 'var(--color-text-main)', padding: '14px', fontSize: '14px', fontFamily: 'inherit', resize: 'none', outline: 'none'
  },
  crmNotice: {
    marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
    backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: '10px', fontSize: '12px', fontWeight: '600'
  }
};

export default Step1_Upload;

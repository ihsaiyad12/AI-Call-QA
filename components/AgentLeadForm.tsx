'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, CheckCircle2, Loader2, AlertCircle, 
  History, PlusCircle, Edit3, Lock, Search, RefreshCcw 
} from 'lucide-react';
import { LeadData, LeadRecord } from '@/types';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_LEAD: LeadData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '+1',
  category: 'Other',
  employeeCount: '',
  jobTitle: '',
};

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

export default function AgentLeadForm() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [leadData, setLeadData] = useState<LeadData>(INITIAL_LEAD);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [myLeads, setMyLeads] = useState<LeadRecord[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isSubmitting = useRef(false);

  // Fetch agent's leads
  const fetchMyLeads = async () => {
    if (!session?.user?.name) return;
    setIsLoadingLeads(true);
    try {
      const res = await fetch('/api/leads/agent');
      if (res.ok) {
        const data = await res.json();
        setMyLeads(data);
      }
    } catch (err) {
      console.error('Failed to fetch leads history');
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    fetchMyLeads();
  }, [session]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLeadData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setLeadData(prev => ({ ...prev, phone: `+1${digits}` }));
  };

  const phoneDigits = leadData.phone.startsWith('+1') ? leadData.phone.slice(2) : leadData.phone;

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const isValid =
    leadData.firstName.trim() &&
    leadData.lastName.trim() &&
    leadData.email.trim() &&
    EMAIL_REGEX.test(leadData.email.trim()) &&
    leadData.phone.length === 12 &&
    parseInt(leadData.employeeCount) > 0 &&
    leadData.jobTitle.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setSubmitState('loading');
    setErrorMsg('');

    try {
      const sanitizedEmail = leadData.email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(sanitizedEmail)) {
        throw new Error('Please enter a valid email address.');
      }

      const method = editingId ? 'PATCH' : 'POST';
      const payload = {
        firstName: leadData.firstName.trim(),
        lastName: leadData.lastName.trim(),
        email: sanitizedEmail,
        phone: leadData.phone.trim(),
        category: leadData.category,
        employeeCount: leadData.employeeCount,
        jobTitle: leadData.jobTitle.trim(),
        ...(editingId ? { id: editingId } : {})
      };

      const res = await fetch('/api/leads/intake', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      setSubmitState('success');
      setLeadData(INITIAL_LEAD);
      setEditingId(null);
      fetchMyLeads(); // Refresh history

      setTimeout(() => setSubmitState('idle'), 3000);
    } catch (err: any) {
      setSubmitState('error');
      setErrorMsg(err.message || 'Something went wrong');
    } finally {
      isSubmitting.current = false;
    }
  };

  const handleEdit = (lead: LeadRecord) => {
    if (lead.status !== 'PENDING') return;
    
    setLeadData({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      category: lead.category,
      employeeCount: lead.employeeCount,
      jobTitle: lead.jobTitle,
    });
    setEditingId(lead.id);
    setActiveTab('form');
    setSubmitState('idle');
    setErrorMsg('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setLeadData(INITIAL_LEAD);
  };

  const getStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      'PENDING': 'var(--color-text-muted)',
      'ANALYZED': 'var(--color-green)',
      'PUSHED_TO_CRM': 'var(--color-purple)',
    };
    const bgMap: Record<string, string> = {
      'PENDING': 'var(--color-bg-hover)',
      'ANALYZED': 'var(--color-green-bg)',
      'PUSHED_TO_CRM': 'var(--color-purple-bg)',
    };

    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '700',
        backgroundColor: bgMap[status] || '#eee',
        color: colorMap[status] || '#666',
        textTransform: 'uppercase'
      }}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Tab Navigation */}
      <div style={styles.tabNav}>
        <button 
          onClick={() => setActiveTab('form')}
          style={{ 
            ...styles.tabButton, 
            ...(activeTab === 'form' ? styles.activeTab : {}) 
          }}
        >
          <PlusCircle size={18} />
          {editingId ? 'Edit Lead' : 'Submit New Lead'}
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          style={{ 
            ...styles.tabButton, 
            ...(activeTab === 'history' ? styles.activeTab : {}) 
          }}
        >
          <History size={18} />
          My Submissions ({myLeads.length})
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'form' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {submitState === 'success' ? (
              <div className="card" style={styles.card}>
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ ...styles.iconCircle, backgroundColor: 'var(--color-green-bg)', margin: '0 auto 16px' }}>
                    <CheckCircle2 size={28} color="var(--color-green)" />
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
                    {editingId ? 'Lead Updated!' : 'Lead Submitted!'}
                  </h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                    The lead information has been saved successfully.
                  </p>
                  <button 
                    onClick={() => setSubmitState('idle')} 
                    className="primary-button" 
                    style={{ marginTop: '24px' }}
                  >
                    Got it
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="card" style={styles.card}>
                {editingId && (
                  <div style={styles.editNotice}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Edit3 size={16} />
                      <span>Editing mode active</span>
                    </div>
                    <button type="button" onClick={cancelEdit} style={styles.cancelEditBtn}>Cancel Edit</button>
                  </div>
                )}

                <div style={styles.section}>
                  <div style={styles.sectionHeader}>
                    <FileText size={16} />
                    <span style={styles.sectionTitle}>Lead Information</span>
                  </div>

                  <div style={styles.leadGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>First Name *</label>
                      <input type="text" name="firstName" value={leadData.firstName} onChange={handleChange} style={styles.input} placeholder="John" />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Last Name *</label>
                      <input type="text" name="lastName" value={leadData.lastName} onChange={handleChange} style={styles.input} placeholder="Doe" />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Job Title *</label>
                    <input type="text" name="jobTitle" value={leadData.jobTitle} onChange={handleChange} style={styles.input} placeholder="e.g. Managing Partner, HR Director" />
                  </div>

                  <div style={{ ...styles.leadGrid, marginTop: '16px' }}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Email Address *</label>
                      <input 
                        type="email" 
                        name="email" 
                        value={leadData.email} 
                        onChange={handleChange} 
                        onBlur={() => {
                          setLeadData(prev => ({ ...prev, email: prev.email.trim() }));
                        }}
                        style={{
                          ...styles.input,
                          borderColor: leadData.email && !EMAIL_REGEX.test(leadData.email.trim()) ? 'var(--color-red)' : 'var(--color-border)'
                        }} 
                        placeholder="john@company.com" 
                      />
                      {leadData.email && !EMAIL_REGEX.test(leadData.email.trim()) && (
                        <span style={{ color: 'var(--color-red)', fontSize: '11px', marginTop: '4px' }}>
                          Please enter a valid email address (no spaces allowed)
                        </span>
                      )}
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Phone Number *</label>
                      <div style={styles.phoneInputGroup}>
                        <span style={styles.phonePrefix}>+1</span>
                        <input
                          type="tel" name="phone" value={phoneDigits} onChange={handlePhoneChange}
                          style={styles.phoneInput} placeholder="(555) 000-0000" maxLength={10} inputMode="numeric"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ ...styles.leadGrid, marginTop: '16px' }}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Category *</label>
                      <select name="category" value={leadData.category} onChange={handleChange} style={styles.select}>
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Employee Count *</label>
                      <input
                        type="number" name="employeeCount" value={leadData.employeeCount} onChange={handleChange}
                        style={styles.input} placeholder="e.g. 50" min={1}
                        onKeyDown={(e) => ['-', '+', 'e', 'E', '.'].includes(e.key) && e.preventDefault()}
                      />
                    </div>
                  </div>
                </div>

                {submitState === 'error' && (
                  <div style={styles.errorBanner}>
                    <AlertCircle size={16} /> {errorMsg}
                  </div>
                )}

                <button type="submit" className="primary-button" disabled={!isValid || submitState === 'loading'}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {submitState === 'loading' ? <Loader2 size={18} className="spin" /> : (editingId ? 'Update Lead Details' : 'Submit Lead')}
                </button>
              </form>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="card"
            style={{ ...styles.card, maxWidth: '100%' }}
          >
            <div style={styles.historyHeader}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Your Submission History</h3>
              <button onClick={fetchMyLeads} style={styles.refreshBtn}>
                <RefreshCcw size={14} className={isLoadingLeads ? 'spin' : ''} /> Refresh
              </button>
            </div>

            {isLoadingLeads ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <Loader2 size={32} className="spin" style={{ color: 'var(--color-primary)', margin: '0 auto' }} />
                <p style={{ marginTop: '12px', color: 'var(--color-text-muted)' }}>Loading your leads...</p>
              </div>
            ) : myLeads.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <Search size={32} style={{ color: 'var(--color-border)', margin: '0 auto' }} />
                <p style={{ marginTop: '12px', color: 'var(--color-text-muted)' }}>You haven't submitted any leads yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLeads.map(lead => (
                      <tr key={lead.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: '600' }}>{lead.firstName} {lead.lastName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{lead.category}</div>
                        </td>
                        <td style={styles.td}>{lead.email}</td>
                        <td style={{ ...styles.td, fontSize: '12px' }}>
                          {lead.createdAtEST?.split(',')[0] || 'N/A'}
                        </td>
                        <td style={styles.td}>{getStatusBadge(lead.status)}</td>
                        <td style={styles.td}>
                          {lead.status === 'PENDING' ? (
                            <button 
                              onClick={() => handleEdit(lead)}
                              style={styles.editBtn}
                            >
                              <Edit3 size={14} /> Edit
                            </button>
                          ) : (
                            <div style={styles.lockInfo}>
                              <Lock size={12} /> Locked
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tabNav: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    backgroundColor: 'var(--color-bg-hover)',
    padding: '6px',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    width: 'fit-content',
    margin: '0 auto 32px'
  },
  tabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    backgroundColor: 'transparent',
    transition: 'all 0.2s ease',
  },
  activeTab: {
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
  },
  card: { maxWidth: '620px', margin: '0 auto', overflow: 'hidden', padding: '32px' },
  section: {
    marginBottom: '24px', padding: '16px', backgroundColor: 'var(--color-bg-app)',
    borderRadius: '8px', border: '0.5px solid var(--color-border)', overflow: 'hidden',
  },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--color-text-muted)' },
  sectionTitle: { fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 },
  leadGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)' },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: 'var(--color-bg-app)',
    color: 'var(--color-text-main)',
  },
  select: {
    width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-app)', fontSize: '14px', color: 'var(--color-text-main)', outline: 'none', boxSizing: 'border-box',
  },
  phoneInputGroup: {
    display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)',
    borderRadius: '8px', overflow: 'hidden', width: '100%', boxSizing: 'border-box' as const,
  },
  phonePrefix: {
    padding: '10px 12px', backgroundColor: 'var(--color-bg-app)', borderRight: '1px solid var(--color-border)',
    fontSize: '14px', fontWeight: '600', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' as const, userSelect: 'none' as const,
  },
  phoneInput: {
    flex: 1, padding: '10px 12px', border: 'none', outline: 'none', fontSize: '14px',
    width: '100%', boxSizing: 'border-box' as const, backgroundColor: 'var(--color-bg-app)',
    color: 'var(--color-text-main)',
  },
  iconCircle: {
    width: '56px', height: '56px', borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  errorBanner: {
    backgroundColor: 'var(--color-red-bg)', color: 'var(--color-red)', padding: '12px', 
    borderRadius: '8px', marginBottom: '16px', fontSize: '14px', display: 'flex', 
    alignItems: 'center', gap: '8px'
  },
  editNotice: {
    backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', 
    padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600'
  },
  cancelEditBtn: {
    background: 'none', border: 'none', color: 'var(--color-red)', fontSize: '12px',
    cursor: 'pointer', textDecoration: 'underline'
  },
  historyHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
    marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px'
  },
  refreshBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', background: 'none',
    border: '1px solid var(--color-border)', borderRadius: '6px', padding: '6px 12px',
    fontSize: '12px', cursor: 'pointer', color: 'var(--color-text-muted)'
  },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '12px', fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' },
  td: { padding: '16px 12px', fontSize: '14px', borderBottom: '1px solid var(--color-border)' },
  tr: { transition: 'background-color 0.2s ease' },
  editBtn: {
    display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--color-primary)',
    color: 'white', border: 'none', borderRadius: '4px', padding: '6px 10px',
    fontSize: '12px', fontWeight: '600', cursor: 'pointer'
  },
  lockInfo: {
    display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)',
    fontSize: '12px', fontStyle: 'italic'
  }
};

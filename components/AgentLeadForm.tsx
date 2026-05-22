'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, CheckCircle2, Loader2, AlertCircle, 
  History, PlusCircle, Edit3, Lock, Search, RefreshCcw,
  ChevronLeft, ChevronRight
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
  company: '',
  industry: '',
};

import { CATEGORIES } from '@/lib/constants';

export default function AgentLeadForm() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [leadData, setLeadData] = useState<LeadData>(INITIAL_LEAD);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [myLeads, setMyLeads] = useState<LeadRecord[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Category Selection States
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState('');

  // Date Filtering & Pagination States
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

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

  // Reset pagination page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, customStartDate, customEndDate]);

  // Categories filtering for selector
  const filteredCategories = CATEGORIES.filter(cat => 
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setLeadData(prev => ({ ...prev, category }));
  };

  // Filter leads based on selected date filter
  const getFilteredLeads = () => {
    if (dateFilter === 'all') return myLeads;
    
    const now = new Date();
    // Midnight today in local timezone
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return myLeads.filter(lead => {
      if (!lead.createdAt) return false;
      const leadDate = new Date(lead.createdAt);
      
      switch (dateFilter) {
        case 'today': {
          const leadDay = new Date(leadDate.getFullYear(), leadDate.getMonth(), leadDate.getDate());
          return leadDay.getTime() === todayStart.getTime();
        }
        case '7days': {
          const sevenDaysAgo = new Date(todayStart);
          sevenDaysAgo.setDate(todayStart.getDate() - 7);
          return leadDate >= sevenDaysAgo;
        }
        case '30days': {
          const thirtyDaysAgo = new Date(todayStart);
          thirtyDaysAgo.setDate(todayStart.getDate() - 30);
          return leadDate >= thirtyDaysAgo;
        }
        case 'custom': {
          let matches = true;
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            matches = matches && leadDate >= start;
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            matches = matches && leadDate <= end;
          }
          return matches;
        }
        default:
          return true;
      }
    });
  };

  const filteredLeads = getFilteredLeads();
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / ITEMS_PER_PAGE));
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const isHr = selectedCategory?.toLowerCase() === 'hr';

  const isValid =
    selectedCategory !== null &&
    leadData.firstName.trim() &&
    leadData.lastName.trim() &&
    leadData.email.trim() &&
    EMAIL_REGEX.test(leadData.email.trim()) &&
    leadData.phone.length === 12 &&
    parseInt(leadData.employeeCount) > 0 &&
    leadData.jobTitle.trim() &&
    (!isHr || (leadData.company?.trim() && leadData.industry?.trim()));

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
        company: leadData.company?.trim() || null,
        industry: leadData.industry?.trim() || null,
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
      setSelectedCategory(null);
      setCategorySearch('');
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
      company: lead.company || '',
      industry: lead.industry || '',
    });
    setEditingId(lead.id);
    setSelectedCategory(lead.category);
    setActiveTab('form');
    setSubmitState('idle');
    setErrorMsg('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setLeadData(INITIAL_LEAD);
    setSelectedCategory(null);
    setCategorySearch('');
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
            ) : selectedCategory === null ? (
              <div className="card" style={styles.card}>
                <div style={styles.categorySelectHeader}>
                  <div style={styles.iconCircleLarge}>
                    <FileText size={24} color="var(--color-primary)" />
                  </div>
                  <h3 style={styles.categorySelectTitle}>Select Industry Category</h3>
                  <p style={styles.categorySelectSubtitle}>Choose the category that best matches your lead's industry to display the form.</p>
                </div>
                
                <div style={styles.searchWrapper}>
                  <Search size={18} style={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search industries (e.g. CRM, Medical, LMS)..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    style={styles.searchInput}
                  />
                </div>

                <div style={styles.categoryGrid}>
                  {filteredCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategorySelect(cat)}
                      style={styles.categoryCard}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-card)';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <span style={{ fontWeight: '600', fontSize: '13px' }}>{cat}</span>
                    </button>
                  ))}
                  {filteredCategories.length === 0 && (
                    <div style={styles.emptyCategories}>
                      No matching industries found.
                    </div>
                  )}
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

                {/* Category Confirmation Banner */}
                <div style={styles.categorySelectedBar}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      backgroundColor: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      padding: '8px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Selected Industry
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text-main)' }}>
                        {selectedCategory}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    style={styles.changeCategoryBtn}
                    onMouseOver={(e) => {
                      e.currentTarget.style.color = 'var(--color-primary)';
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.color = 'var(--color-text-muted)';
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                    }}
                  >
                    Change Category
                  </button>
                </div>

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

                  {selectedCategory?.toLowerCase() === 'hr' && (
                    <div style={{ ...styles.leadGrid, marginTop: '16px' }}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Company Name *</label>
                        <input type="text" name="company" value={leadData.company || ''} onChange={handleChange} style={styles.input} placeholder="e.g. Acme Corp" />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Industry *</label>
                        <input type="text" name="industry" value={leadData.industry || ''} onChange={handleChange} style={styles.input} placeholder="e.g. Healthcare, Retail" />
                      </div>
                    </div>
                  )}

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

                  <div style={{ ...styles.leadGrid, marginTop: '16px', gridTemplateColumns: '1fr' }}>
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

            {/* Filter Bar */}
            <div style={styles.filterBar}>
              <div style={styles.filterPillsGroup}>
                {(['all', 'today', '7days', '30days', 'custom'] as const).map(type => {
                  const labelMap = {
                    all: 'All Time',
                    today: 'Today',
                    '7days': 'Last 7 Days',
                    '30days': 'Last 30 Days',
                    custom: 'Custom Range'
                  };
                  const active = dateFilter === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDateFilter(type)}
                      style={{
                        ...styles.filterPill,
                        ...(active ? styles.activeFilterPill : {})
                      }}
                    >
                      {labelMap[type]}
                    </button>
                  );
                })}
              </div>
              
              <AnimatePresence>
                {dateFilter === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden', width: '100%' }}
                  >
                    <div style={styles.customDateGrid}>
                      <div style={styles.formGroup}>
                        <label style={styles.filterLabel}>Start Date</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          style={styles.dateInput}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.filterLabel}>End Date</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          style={styles.dateInput}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomStartDate('');
                            setCustomEndDate('');
                          }}
                          style={styles.clearDatesBtn}
                        >
                          Clear Range
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
            ) : filteredLeads.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <Search size={32} style={{ color: 'var(--color-border)', margin: '0 auto' }} />
                <p style={{ marginTop: '12px', color: 'var(--color-text-muted)' }}>No submissions found matching the selected filters.</p>
              </div>
            ) : (
              <>
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
                      {paginatedLeads.map(lead => (
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

                {/* Pagination Controls */}
                <div style={styles.paginationContainer}>
                  <div style={styles.paginationInfo}>
                    Showing <span style={{ fontWeight: '700', color: 'var(--color-text-main)' }}>{Math.min(filteredLeads.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> to{' '}
                    <span style={{ fontWeight: '700', color: 'var(--color-text-main)' }}>{Math.min(filteredLeads.length, currentPage * ITEMS_PER_PAGE)}</span> of{' '}
                    <span style={{ fontWeight: '700', color: 'var(--color-text-main)' }}>{filteredLeads.length}</span> submissions
                  </div>
                  
                  <div style={styles.paginationActions}>
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      style={{
                        ...styles.paginationBtn,
                        ...(currentPage === 1 ? styles.paginationBtnDisabled : {}),
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      const active = currentPage === page;
                      if (totalPages > 5 && Math.abs(currentPage - page) > 1 && page !== 1 && page !== totalPages) {
                        if (page === 2 || page === totalPages - 1) {
                          return <span key={page} style={{ color: 'var(--color-text-muted)', padding: '0 4px' }}>...</span>;
                        }
                        return null;
                      }
                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          style={{
                            ...styles.paginationPageBtn,
                            ...(active ? styles.paginationPageBtnActive : {})
                          }}
                        >
                          {page}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      style={{
                        ...styles.paginationBtn,
                        ...(currentPage === totalPages ? styles.paginationBtnDisabled : {}),
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
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
  },
  categorySelectHeader: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  iconCircleLarge: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-bg-hover)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    border: '1px solid var(--color-border)',
  },
  categorySelectTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    marginBottom: '8px',
  },
  categorySelectSubtitle: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    maxWidth: '400px',
    margin: '0 auto',
    lineHeight: '1.5',
  },
  searchWrapper: {
    position: 'relative',
    marginBottom: '20px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--color-text-muted)',
  },
  searchInput: {
    width: '100%',
    padding: '12px 12px 12px 40px',
    borderRadius: '10px',
    border: '1px solid var(--color-border)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: 'var(--color-bg-app)',
    color: 'var(--color-text-main)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    maxHeight: '320px',
    overflowY: 'auto',
    paddingRight: '6px',
  },
  categoryCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card)',
    color: 'var(--color-text-main)',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  emptyCategories: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px 0',
    color: 'var(--color-text-muted)',
    fontSize: '14px',
  },
  categorySelectedBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    backgroundColor: 'var(--color-bg-hover)',
    borderRadius: '10px',
    border: '1px solid var(--color-border)',
    marginBottom: '24px',
  },
  changeCategoryBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card)',
    color: 'var(--color-text-muted)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  filterBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--color-border)',
  },
  filterPillsGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  filterPill: {
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card)',
    color: 'var(--color-text-muted)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  activeFilterPill: {
    backgroundColor: 'var(--color-primary-light)',
    color: 'var(--color-primary)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  customDateGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr auto',
    gap: '16px',
    padding: '12px',
    backgroundColor: 'var(--color-bg-hover)',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    alignItems: 'end',
    marginTop: '8px',
  },
  filterLabel: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    marginBottom: '4px',
  },
  dateInput: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    fontSize: '13px',
    backgroundColor: 'var(--color-bg-card)',
    color: 'var(--color-text-main)',
    outline: 'none',
  },
  clearDatesBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--color-red)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid var(--color-border)',
    flexWrap: 'wrap',
    gap: '16px',
  },
  paginationInfo: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
  },
  paginationActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  paginationBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card)',
    color: 'var(--color-text-main)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  paginationBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  paginationPageBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card)',
    color: 'var(--color-text-main)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  paginationPageBtnActive: {
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    borderColor: 'var(--color-primary)',
  }
};

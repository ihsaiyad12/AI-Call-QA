'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, PlayCircle, CheckCircle2, AlertCircle, Clock, Database, Download, RefreshCcw, MoreHorizontal, ChevronRight, Calendar, ChevronDown, Filter, TrendingUp } from 'lucide-react';
import { LeadRecord } from '@/types';
import ExcelJS from 'exceljs';
import CustomDateRangePicker from './CustomDateRangePicker';
import { DashboardSkeleton } from './Skeleton';

interface LeadDashboardProps {
  onAnalyze: (lead: LeadRecord) => void;
  onViewDetails: (lead: LeadRecord) => void;
  refreshTrigger?: number;
}

export default function LeadDashboard({ onAnalyze, onViewDetails, refreshTrigger = 0 }: LeadDashboardProps) {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ANALYZED' | 'PUSHED_TO_CRM'>('ALL');
  const [scoreSort, setScoreSort] = useState<'NONE' | 'ASC' | 'DESC'>('NONE');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [todayStats, setTodayStats] = useState({ analyzed: 0, pushed: 0, pending: 0 });

  useEffect(() => {
    const analyzedCount = leads.filter(l => l.status === 'ANALYZED' || l.status === 'PUSHED_TO_CRM').length;
    const pushedCount = leads.filter(l => l.status === 'PUSHED_TO_CRM').length;
    const pendingCount = leads.filter(l => l.status === 'PENDING').length;
    setTodayStats({ analyzed: analyzedCount, pushed: pushedCount, pending: pendingCount });
  }, [leads]);

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isScoreOpen, setIsScoreOpen] = useState(false);
  const [dateRangeLabel, setDateRangeLabel] = useState('Custom');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'Select Date';
    const [y, m, d] = dateString.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
  };

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalDateString(d);
  });
  const [endDate, setEndDate] = useState(() => getLocalDateString(new Date()));
  
  const handleRangeChange = (start: string, end: string, label: string) => {
    setStartDate(start);
    setEndDate(end);
    setDateRangeLabel(label);
  };
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const downloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads Analysis');

    worksheet.columns = [
      { header: 'Date & Time (EST)', key: 'date', width: 22 },
      { header: 'Agent', key: 'addedBy', width: 20 },
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Title', key: 'jobTitle', width: 25 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Employee Count', key: 'employeeCount', width: 15 },
      { header: 'Lead Status', key: 'status', width: 15 },
      { header: 'AI Provider', key: 'aiProvider', width: 15 },
      { header: 'Lead Scoring', key: 'score', width: 15 },
      { header: 'QA Analyst Note', key: 'reasoning', width: 40 },
      { header: 'Transcript', key: 'transcript', width: 50 },
      { header: 'QA Status', key: 'verdict', width: 15 },
      { header: 'Disqualification Comment', key: 'disqualificationComment', width: 30 },
    ];

    filteredLeads.forEach(lead => {
      worksheet.addRow({
        date: lead.createdAtEST || new Date(lead.createdAt).toLocaleString("en-US", {timeZone: "America/New_York"}),
        addedBy: lead.addedBy || '',
        firstName: lead.firstName,
        lastName: lead.lastName,
        jobTitle: lead.jobTitle || '',
        category: lead.category,
        email: lead.email,
        phone: lead.phone,
        employeeCount: lead.employeeCount,
        status: lead.status === 'PENDING' ? 'Pending' : lead.status,
        aiProvider: lead.aiProvider || '',
        score: lead.status === 'PENDING' ? '' : (lead.score || 0),
        reasoning: lead.status === 'PENDING' ? '' : (lead.reasoning || ''),
        transcript: lead.status === 'PENDING' ? '' : (lead.transcript || ''),
        verdict: lead.status === 'PENDING' ? '' : (lead.verdict || ''),
        disqualificationComment: lead.disqualificationComment || '',
      });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FF1F2937' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF9FAFB' }
    };

    try {
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Lead_Quality_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Excel Export failed:', err);
    }
  };

  const fetchLeads = async (silent = false, customSearchTerm = searchTerm) => {
    if (!silent) setLoading(true);
    setIsRefreshing(true);
    try {
      let url = `/api/leads?startDate=${startDate}&endDate=${endDate}`;
      // If there is an active search term of 2 or more characters, query globally to find any historical match
      if (customSearchTerm.trim().length >= 2) {
        url = `/api/leads?q=${encodeURIComponent(customSearchTerm.trim())}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      setLeads(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch leads when date range changes (only if not searching)
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      fetchLeads();
    }
  }, [startDate, endDate]);

  // Debounce search input fetching and reset page to 1
  useEffect(() => {
    setCurrentPage(1);

    if (searchTerm.trim().length >= 2) {
      const handler = setTimeout(() => {
        fetchLeads(true, searchTerm);
      }, 400);

      return () => clearTimeout(handler);
    } else {
      fetchLeads(true, searchTerm);
    }
  }, [searchTerm]);

  // Handle external manual refreshes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchLeads(true, searchTerm);
    }
  }, [refreshTrigger]);

  // Real-time instant sync via Server-Sent Events (SSE) - Zero-delay updates
  useEffect(() => {
    const eventSource = new EventSource('/api/leads/stream');

    eventSource.onmessage = (event) => {
      try {
        const newLead = JSON.parse(event.data);
        setLeads((prev) => {
          // Prevent duplicates
          if (prev.some((l) => l.id === newLead.id)) return prev;
          // Prepend the new lead so it shows at the top instantly
          return [newLead, ...prev];
        });
      } catch (err) {
        console.error('Failed to parse SSE new-lead:', err);
      }
    };

    eventSource.addEventListener('update-lead', (event: MessageEvent) => {
      try {
        const updatedLead = JSON.parse(event.data);
        setLeads((prev) => {
          if (updatedLead.deleted) {
            return prev.filter((l) => l.id !== updatedLead.id);
          }
          // If the lead doesn't exist in state yet, prepend it
          if (!prev.some((l) => l.id === updatedLead.id)) {
            return [updatedLead, ...prev];
          }
          return prev.map((l) => (l.id === updatedLead.id ? updatedLead : l));
        });
      } catch (err) {
        console.error('Failed to parse SSE update-lead:', err);
      }
    });

    eventSource.onerror = (err) => {
      console.warn('SSE connection encountered an error. EventSource will auto-reconnect...', err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Failsafe polling fallback (runs every 15 seconds silently in case SSE is blocked by proxies)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeads(true, searchTerm);
    }, 15000);

    return () => clearInterval(interval);
  }, [startDate, endDate, searchTerm]);

  // Guard against null/undefined fields, perform instant client-side match, and sort results
  const filteredLeads = leads.filter(lead => {
    const firstName = lead.firstName || '';
    const lastName = lead.lastName || '';
    const email = lead.email || '';
    const phone = lead.phone || '';
    const searchStr = `${firstName} ${lastName} ${email} ${phone}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchTerm.toLowerCase().trim());
    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (scoreSort === 'NONE') return 0;
    const sA = a.score || 0;
    const sB = b.score || 0;
    return scoreSort === 'ASC' ? sA - sB : sB - sA;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span style={{ ...styles.badge, color: 'var(--color-text-muted)' }}>
            <Clock size={14} style={{ marginRight: '6px' }} /> Pending
          </span>
        );
      case 'ANALYZED':
        return (
          <span style={{ ...styles.badge, color: 'var(--color-primary)' }}>
            <CheckCircle2 size={14} style={{ marginRight: '6px' }} /> Analyzed
          </span>
        );
      case 'PUSHED_TO_CRM':
        return (
          <span style={{ ...styles.badge, color: 'var(--color-text-main)', fontWeight: '600' }}>
            <Database size={14} style={{ marginRight: '6px' }} /> In CRM
          </span>
        );
      default:
        return <span style={styles.badge}>{status}</span>;
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centerContainer}>
        <AlertCircle size={32} color="var(--color-text-main)" />
        <p style={{ marginTop: '16px', color: 'var(--color-text-main)', fontWeight: 500 }}>{error}</p>
        <button onClick={() => fetchLeads()} className="primary-button" style={{ marginTop: '24px' }}>Try Again</button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={styles.container}
    >
      {/* Page Header - Symmetric Stats */}
      <div style={{ ...styles.pageHeader, marginBottom: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', width: '100%' }}>
          <div style={styles.statCard}>
            <div style={styles.statInfo}>
              <span style={styles.statLabel}>Pending Analysis</span>
              <span style={styles.statValue}>{todayStats.pending}</span>
            </div>
            <div style={styles.statIconWrapper}>
              <Clock size={20} color="var(--color-primary)" />
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statInfo}>
              <span style={styles.statLabel}>Total Analyzed</span>
              <span style={styles.statValue}>{todayStats.analyzed}</span>
            </div>
            <div style={styles.statIconWrapper}>
              <CheckCircle2 size={20} color="var(--color-primary)" />
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statInfo}>
              <span style={styles.statLabel}>CRM Pushed</span>
              <span style={styles.statValue}>{todayStats.pushed}</span>
            </div>
            <div style={styles.statIconWrapper}>
              <Database size={20} color="var(--color-primary)" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...styles.header, backgroundColor: 'var(--color-bg-hover)', padding: '20px 24px', borderRadius: '16px', border: '1px solid var(--color-border)', marginBottom: '24px' }}>
        <div style={styles.searchWrapper}>
          <Search size={18} color="var(--color-text-muted)" />
          <input
            type="text"
            placeholder="Search leads by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filterSection}>
          <CustomDateRangePicker 
            startDate={startDate}
            endDate={endDate}
            onRangeChange={handleRangeChange}
            label={dateRangeLabel}
          />

          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => { setIsStatusOpen(!isStatusOpen); setIsScoreOpen(false); }}
              style={styles.select}
            >
              <Filter size={14} color="var(--color-primary)" />
              <span style={{ minWidth: '80px', textAlign: 'left' }}>
                {statusFilter === 'ALL' ? 'All Status' : statusFilter === 'PENDING' ? 'Pending' : statusFilter === 'ANALYZED' ? 'Analyzed' : 'In CRM'}
              </span>
              <ChevronDown size={14} color="var(--color-text-muted)" style={{ transition: 'transform 0.2s', transform: isStatusOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
            </button>
            <AnimatePresence>
              {isStatusOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px', boxShadow: '0 10px 40px var(--color-shadow)', zIndex: 50, overflow: 'hidden', minWidth: '180px' }}
                >
                  {[
                    { val: 'ALL', label: 'All Status' },
                    { val: 'PENDING', label: 'Pending' },
                    { val: 'ANALYZED', label: 'Analyzed' },
                    { val: 'PUSHED_TO_CRM', label: 'Pushed to CRM' },
                  ].map(opt => (
                    <div 
                      key={opt.val}
                      onClick={() => { setStatusFilter(opt.val as any); setIsStatusOpen(false); setCurrentPage(1); }}
                      style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', backgroundColor: statusFilter === opt.val ? 'var(--color-bg-hover)' : 'transparent', color: statusFilter === opt.val ? 'var(--color-primary)' : 'var(--color-text-main)' }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = statusFilter === opt.val ? 'var(--color-bg-hover)' : 'transparent'; }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => { setIsScoreOpen(!isScoreOpen); setIsStatusOpen(false); }}
              style={styles.select}
            >
              <TrendingUp size={14} color="var(--color-primary)" />
              <span style={{ minWidth: '120px', textAlign: 'left' }}>
                {scoreSort === 'NONE' ? 'Sort by Date' : scoreSort === 'DESC' ? 'Highest Score' : 'Lowest Score'}
              </span>
              <ChevronDown size={14} color="var(--color-text-muted)" style={{ transition: 'transform 0.2s', transform: isScoreOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
            </button>
            <AnimatePresence>
              {isScoreOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px', boxShadow: '0 10px 25px var(--color-shadow)', zIndex: 50, overflow: 'hidden', minWidth: '180px' }}
                >
                  {[
                    { val: 'NONE', label: 'Sort by Date' },
                    { val: 'DESC', label: 'Highest Score' },
                    { val: 'ASC', label: 'Lowest Score' },
                  ].map(opt => (
                    <div 
                      key={opt.val}
                      onClick={() => { setScoreSort(opt.val as any); setIsScoreOpen(false); setCurrentPage(1); }}
                      style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', backgroundColor: scoreSort === opt.val ? 'var(--color-bg-hover)' : 'transparent', color: scoreSort === opt.val ? 'var(--color-primary)' : 'var(--color-text-main)' }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = scoreSort === opt.val ? 'var(--color-bg-hover)' : 'transparent'; }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fetchLeads(true, searchTerm)} 
            disabled={isRefreshing}
            style={{
              ...styles.exportButton,
              backgroundColor: isRefreshing ? 'var(--color-bg-hover)' : 'var(--color-bg-card)',
              opacity: isRefreshing ? 0.7 : 1,
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 16px',
            }}
            title="Refresh Leads Table"
          >
            {isRefreshing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Loader2 size={16} style={{ color: 'var(--color-primary)' }} />
              </motion.div>
            ) : (
              <RefreshCcw size={16} style={{ color: 'var(--color-primary)' }} />
            )}
            <span style={{ fontWeight: 600, color: 'var(--color-text-main)', marginLeft: '8px' }}>Refresh</span>
          </motion.button>

          <button onClick={downloadExcel} style={styles.exportButton} title="Export to Excel">
            <Download size={16} />
            <span style={{ fontWeight: 600 }}>Export</span>
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div style={styles.tableCard}>
        <div 
          ref={scrollRef}
          style={styles.tableWrapper}
        >
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, ...styles.stickyHeader1, width: '150px', minWidth: '150px' }}>Date</th>
                <th style={{ ...styles.th, ...styles.stickyHeader2, width: '180px', minWidth: '180px' }}>Agent</th>
                <th style={{ ...styles.th, ...styles.stickyHeader3, minWidth: '240px' }}>Lead Details</th>
                <th style={styles.th}>Contact Info</th>
                <th style={styles.th}>Score</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredLeads.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((lead, i) => (
                  <motion.tr 
                    key={lead.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    style={{ ...styles.tr, cursor: lead.status !== 'PENDING' ? 'pointer' : 'default' }}
                    whileHover={{ backgroundColor: 'var(--color-bg-hover)' }}
                    onClick={() => lead.status !== 'PENDING' && onViewDetails(lead)}
                  >
                    <td style={{ ...styles.td, ...styles.stickyCol1, width: '150px', minWidth: '150px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ color: 'var(--color-text-main)', fontSize: '13px', fontWeight: '600' }}>
                          {lead.createdAtEST ? lead.createdAtEST.split(',')[0] : new Date(lead.createdAt).toLocaleDateString()}
                        </span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
                          {lead.createdAtEST ? lead.createdAtEST.split(',')[1]?.trim() : new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...styles.td, ...styles.stickyCol2, width: '180px', minWidth: '180px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={styles.agentAvatar}>
                          {lead.addedBy ? lead.addedBy.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span style={{ fontWeight: '600', color: 'var(--color-text-main)' }}>
                          {lead.addedBy || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td 
                      style={{ ...styles.td, ...styles.stickyCol3, minWidth: '240px' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ 
                          fontWeight: '700', 
                          color: 'var(--color-text-main)',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {lead.firstName} {lead.lastName}
                          {lead.status !== 'PENDING' && <ChevronRight size={14} color="var(--color-text-muted)" />}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: '500' }}>{lead.jobTitle || 'No title'}</span>
                          {lead.verdict && (() => {
                            const displayVerdict = (lead.score || 0) >= 70 ? 'Good to Go (SQL)' : ((lead.score || 0) >= 50 ? 'Borderline' : 'Not Qualified');
                            return (
                              <span style={{ 
                                fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px',
                                backgroundColor: displayVerdict === 'Good to Go (SQL)' ? 'var(--color-green-bg)' : displayVerdict === 'Borderline' ? 'var(--color-amber-bg)' : 'var(--color-red-bg)',
                                color: displayVerdict === 'Good to Go (SQL)' ? 'var(--color-green)' : displayVerdict === 'Borderline' ? 'var(--color-amber)' : 'var(--color-red)',
                                border: `1px solid ${displayVerdict === 'Good to Go (SQL)' ? 'rgba(34, 197, 94, 0.2)' : displayVerdict === 'Borderline' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                              }}>
                                {displayVerdict.replace(' (SQL)', '')}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ color: 'var(--color-text-main)', fontSize: '13px', fontWeight: '600' }}>{lead.email}</span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{lead.phone}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {lead.status === 'PENDING' ? (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      ) : (
                        <div style={styles.scoreDisplay}>
                          <span style={{ fontWeight: '700', fontSize: '14px', minWidth: '24px' }}>{lead.score || 0}</span>
                          <div style={styles.scoreBarBg}>
                            <div style={{ 
                              ...styles.scoreBarFill, 
                              width: `${lead.score || 0}%`, 
                              backgroundColor: (lead.score || 0) >= 70 ? 'var(--color-green)' : (lead.score || 0) >= 50 ? 'var(--color-amber)' : 'var(--color-red)'
                            }} />
                          </div>
                        </div>
                      )}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      {lead.status !== 'PUSHED_TO_CRM' ? (
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => { e.stopPropagation(); onAnalyze(lead); }}
                          style={styles.primaryActionBtn}
                        >
                          <PlayCircle size={14} /> Analyze
                        </motion.button>
                      ) : (
                        <button 
                          style={styles.disabledActionBtn} 
                          disabled
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Database size={14} /> Synced
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '80px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--color-text-muted)' }}>
                      <Search size={40} strokeWidth={1} style={{ marginBottom: '16px' }} />
                      <p style={{ fontSize: '14px', fontWeight: 500 }}>No leads match your criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredLeads.length > rowsPerPage && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderTop: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500' }}>
                Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredLeads.length)} of {filteredLeads.length} entries
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--color-border)',
                    backgroundColor: currentPage === 1 ? 'var(--color-bg-hover)' : 'var(--color-bg-card)',
                    color: currentPage === 1 ? 'var(--color-text-muted)' : 'var(--color-text-main)',
                    fontSize: '13px', fontWeight: '600', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Previous
                </button>
                
                {(() => {
                  const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);
                  const pages = [];
                  const range = 1; // Number of neighbors to show

                  for (let i = 1; i <= totalPages; i++) {
                    if (
                      i === 1 || 
                      i === totalPages || 
                      (i >= currentPage - range && i <= currentPage + range)
                    ) {
                      pages.push(i);
                    } else if (pages[pages.length - 1] !== '...') {
                      pages.push('...');
                    }
                  }

                  return pages.map((page, i) => (
                    <button
                      key={i}
                      onClick={() => typeof page === 'number' && setCurrentPage(page)}
                      disabled={page === '...'}
                      style={{
                        padding: '8px 14px', borderRadius: '8px', border: '1px solid',
                        borderColor: page === '...' ? 'transparent' : (currentPage === page ? 'var(--color-primary)' : 'var(--color-border)'),
                        backgroundColor: currentPage === page ? 'var(--color-primary)' : 'transparent',
                        color: page === '...' ? 'var(--color-text-muted)' : (currentPage === page ? 'white' : 'var(--color-text-main)'),
                        fontSize: '13px', fontWeight: '600', cursor: page === '...' ? 'default' : 'pointer',
                        transition: 'all 0.2s',
                        minWidth: '40px'
                      }}
                    >
                      {page}
                    </button>
                  ));
                })()}

                <button 
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredLeads.length / rowsPerPage), p + 1))} 
                  disabled={currentPage === Math.ceil(filteredLeads.length / rowsPerPage)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--color-border)',
                    backgroundColor: currentPage === Math.ceil(filteredLeads.length / rowsPerPage) ? 'var(--color-bg-hover)' : 'var(--color-bg-card)',
                    color: currentPage === Math.ceil(filteredLeads.length / rowsPerPage) ? 'var(--color-text-muted)' : 'var(--color-text-main)',
                    fontSize: '13px', fontWeight: '600', cursor: currentPage === Math.ceil(filteredLeads.length / rowsPerPage) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { 
    width: '100%', 
    padding: '24px 32px 32px',
    maxWidth: '1600px',
    margin: '0 auto',
    minHeight: 'calc(100vh - 40px)'
  },
  statsContainer: {
    display: 'flex',
    gap: '24px',
    marginBottom: '32px'
  },
  statCard: {
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    boxShadow: '0 8px 30px var(--color-shadow)',
    cursor: 'default',
    transition: 'transform 0.2s ease',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  statLabel: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    letterSpacing: '-1px',
    lineHeight: 1
  },
  statIconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-bg-hover)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '20px', 
    gap: '16px', 
    flexWrap: 'wrap' 
  },
  pageHeader: {
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '24px'
  },
  pageTitle: {
    fontSize: '28px', 
    fontWeight: '700', 
    color: 'var(--color-text-main)', 
    marginBottom: '4px', 
    letterSpacing: '-0.5px'
  },
  pageSubtitle: {
    fontSize: '14px', 
    color: 'var(--color-text-muted)'
  },
  searchWrapper: {
    flex: 1, 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    padding: '0 16px', 
    minWidth: '300px',
    backgroundColor: 'var(--color-bg-card)', 
    border: '1px solid var(--color-border)', 
    borderRadius: '12px', 
    height: '48px',
    boxShadow: '0 8px 30px var(--color-shadow)',
    transition: 'all 0.2s ease'
  },
  searchInput: { 
    flex: 1, 
    border: 'none', 
    outline: 'none', 
    fontSize: '14px', 
    backgroundColor: 'transparent',
    color: 'var(--color-text-main)'
  },
  filterSection: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    flexWrap: 'wrap' 
  },
  select: {
    padding: '0 16px', 
    borderRadius: '12px', 
    border: '1px solid var(--color-border)', 
    fontSize: '13px', 
    fontWeight: '600', 
    outline: 'none', 
    cursor: 'pointer', 
    backgroundColor: 'var(--color-bg-card)',
    color: 'var(--color-text-main)', 
    height: '48px',
    boxShadow: '0 8px 30px var(--color-shadow)',
    transition: 'all 0.2s ease'
  },
  datePickerContainer: {
    display: 'flex', alignItems: 'center', gap: '12px'
  },
  datePickerBox: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px',
    backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px',
    height: '44px', boxShadow: '0 8px 30px var(--color-shadow)', transition: 'border-color 0.2s'
  },
  dateLabel: {
    fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500'
  },
  dateInput: {
    border: 'none', backgroundColor: 'transparent', 
    padding: '0 4px', fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)',
    outline: 'none', cursor: 'pointer', fontFamily: 'inherit'
  },
  exportButton: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', height: '48px',
    backgroundColor: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', borderRadius: '12px',
    fontSize: '14px', fontWeight: '600', color: 'var(--color-primary)', cursor: 'pointer',
    boxShadow: '0 8px 30px var(--color-shadow)', transition: 'all 0.2s'
  },
  tableCard: { 
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '16px',
    border: '1px solid var(--color-border)',
    overflow: 'hidden',
    boxShadow: '0 8px 30px var(--color-shadow)'
  },
  tableWrapper: { 
    overflowX: 'auto',
  },
  table: { 
    width: '100%',
    minWidth: '1100px',
    borderCollapse: 'separate', 
    borderSpacing: 0, 
    textAlign: 'left'
  },
  stickyCol1: {
    position: 'sticky',
    left: 0,
    zIndex: 3,
    backgroundColor: 'var(--color-bg-card)',
  },
  stickyCol2: {
    position: 'sticky',
    left: '150px',
    zIndex: 3,
    backgroundColor: 'var(--color-bg-card)',
  },
  stickyCol3: {
    position: 'sticky',
    left: '330px',
    zIndex: 2,
    backgroundColor: 'var(--color-bg-card)',
    borderRight: '1px solid var(--color-border)',
  },
  stickyHeader1: {
    position: 'sticky',
    left: 0,
    zIndex: 5,
    backgroundColor: 'var(--color-bg-sidebar)',
  },
  stickyHeader2: {
    position: 'sticky',
    left: '150px',
    zIndex: 5,
    backgroundColor: 'var(--color-bg-sidebar)',
  },
  stickyHeader3: {
    position: 'sticky',
    left: '330px',
    zIndex: 5,
    backgroundColor: 'var(--color-bg-sidebar)',
    borderRight: '1px solid var(--color-border)',
  },
  th: {
    padding: '16px 24px', 
    backgroundColor: 'var(--color-bg-sidebar)', 
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)', 
    fontWeight: '600', 
    fontSize: '12px', 
    textTransform: 'uppercase', 
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
    zIndex: 1,
  },
  tr: { 
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card)',
    transition: 'background-color 0.15s ease'
  },
  td: { 
    padding: '16px 24px', 
    verticalAlign: 'middle', 
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '13px',
    color: 'var(--color-text-muted)'
  },
  badge: {
    display: 'inline-flex', 
    alignItems: 'center', 
    fontSize: '13px', 
    fontWeight: '500',
  },
  simpleTag: {
    color: 'var(--color-text-muted)', 
    fontSize: '13px', 
    fontWeight: '500'
  },
  agentAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-bg-hover)',
    color: 'var(--color-text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600'
  },
  scoreDisplay: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  scoreBarBg: {
    width: '70px', height: '8px', backgroundColor: 'var(--color-border-hover)', borderRadius: '4px', overflow: 'hidden'
  },
  scoreBarFill: {
    height: '100%', borderRadius: '4px', transition: 'width 0.8s ease-in-out'
  },
  primaryActionBtn: {
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: '6px', 
    padding: '8px 16px',
    borderRadius: '8px', 
    border: 'none', 
    backgroundColor: 'var(--color-primary)',
    color: 'white', 
    fontSize: '13px', 
    fontWeight: '600', 
    cursor: 'pointer',
  },
  disabledActionBtn: {
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: '6px', 
    padding: '8px 16px',
    borderRadius: '8px', 
    border: '1px solid var(--color-border)', 
    backgroundColor: 'var(--color-bg-hover)',
    color: 'var(--color-text-muted)', 
    fontSize: '13px', 
    fontWeight: '600', 
    cursor: 'not-allowed',
  },
  centerContainer: { 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: '100px 20px',
    minHeight: '60vh'
  },
};


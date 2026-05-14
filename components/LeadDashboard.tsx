'use client';

import React, { useState, useEffect } from 'react';
import { Search, Loader2, PlayCircle, Eye, CheckCircle2, AlertCircle, Clock, Database, Filter, SortAsc, Download, RefreshCcw } from 'lucide-react';
import { LeadRecord } from '@/types';
import ExcelJS from 'exceljs';

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
  const [todayStats, setTodayStats] = useState<{ pushed: number, analyzed: number }>({ pushed: 0, analyzed: 0 });

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalDateString(d);
  });
  const [endDate, setEndDate] = useState(() => getLocalDateString(new Date()));
  
  // Drag to scroll logic
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const downloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads Analysis');

    // Define columns with widths for a better look
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

    // Add data
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

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FF1F2937' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF9FAFB' }
    };

    // Generate buffer and download
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const fetchLeads = async (silent = false) => {
    if (!silent) setLoading(true);
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/leads?startDate=${startDate}&endDate=${endDate}`);
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

  const fetchTodayStats = async () => {
    try {
      const res = await fetch(`/api/analytics?startDate=${startDate}&endDate=${endDate}`);
      if (res.ok) {
        const data = await res.json();
        setTodayStats({
          pushed: data.kpis.pushedToday || 0,
          analyzed: data.kpis.analyzedToday || 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchTodayStats();
  }, [startDate, endDate]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchLeads(true); // Silent refresh
      fetchTodayStats();
    }
  }, [refreshTrigger]);

  const filteredLeads = leads.filter(lead => {
    // 1. Search term filter
    const searchStr = `${lead.firstName} ${lead.lastName} ${lead.email} ${lead.phone}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
    
    // 2. Status filter
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
          <span style={{ ...styles.badge, backgroundColor: 'var(--color-amber-bg)', color: 'var(--color-amber)' }}>
            <Clock size={12} /> Pending
          </span>
        );
      case 'ANALYZED':
        return (
          <span style={{ ...styles.badge, backgroundColor: 'var(--color-green-bg)', color: 'var(--color-green)' }}>
            <CheckCircle2 size={12} /> Analyzed
          </span>
        );
      case 'PUSHED_TO_CRM':
        return (
          <span style={{ ...styles.badge, backgroundColor: '#e0e7ff', color: '#4338ca' }}>
            <Database size={12} /> Pushed to CRM
          </span>
        );
      default:
        return <span style={styles.badge}>{status}</span>;
    }
  };

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <Loader2 className="spin" size={32} color="var(--color-primary)" />
        <p style={{ marginTop: '12px', color: 'var(--color-text-muted)' }}>Loading leads dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centerContainer}>
        <AlertCircle size={32} color="var(--color-red)" />
        <p style={{ marginTop: '12px', color: 'var(--color-red)' }}>{error}</p>
        <button onClick={() => fetchLeads()} className="secondary-button" style={{ marginTop: '16px' }}>Retry</button>
      </div>
    );
  }

  return (
    <div className="fade-in" style={styles.container}>
      {/* Today's Stats Ribbon */}
      <div style={styles.statsRibbon}>
        <div style={styles.statItem}>
          <div style={{ ...styles.statIcon, backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'var(--color-primary)' }}>
            <Database size={16} />
          </div>
          <div>
            <div style={styles.statLabel}>
              Pushed {startDate === endDate ? `on ${startDate}` : `in Range`}
            </div>
            <div style={styles.statValue}>{todayStats.pushed}</div>
          </div>
        </div>
        <div style={{ width: '1px', height: '30px', backgroundColor: 'var(--color-border)' }} />
        <div style={styles.statItem}>
          <div style={{ ...styles.statIcon, backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div style={styles.statLabel}>
              Analyzed {startDate === endDate ? `on ${startDate}` : `in Range`}
            </div>
            <div style={styles.statValue}>{todayStats.analyzed}</div>
          </div>
        </div>
      </div>

      {/* Header & Search */}
      <div style={styles.header}>
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
          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Date:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0 8px', backgroundColor: 'white', height: '36px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '600' }}>From:</span>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                style={styles.dateInput}
              />
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '600' }}>To:</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                style={styles.dateInput}
              />
            </div>
          </div>

          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Status:</span>
            <select 
              style={styles.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All Leads</option>
              <option value="PENDING">Pending</option>
              <option value="ANALYZED">Analyzed</option>
              <option value="PUSHED_TO_CRM">Pushed to CRM</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Sort by Score:</span>
            <select 
              style={styles.select}
              value={scoreSort}
              onChange={(e) => setScoreSort(e.target.value as any)}
            >
              <option value="NONE">Default (Date)</option>
              <option value="DESC">High to Low</option>
              <option value="ASC">Low to High</option>
            </select>
          </div>

          <button 
            onClick={downloadExcel}
            style={styles.exportBtn}
          >
            <Download size={16} /> Export to Excel
          </button>

          <button 
            onClick={() => fetchLeads(true)} 
            style={styles.refreshBtn}
            disabled={isRefreshing}
          >
            <RefreshCcw size={16} className={isRefreshing ? "spin" : ""} /> 
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={styles.tableCard}>
        <div 
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          style={{ 
            ...styles.tableWrapper, 
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: isDragging ? 'none' : 'auto' // Prevent text selection while dragging
          }}
        >
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '180px', minWidth: '180px', borderRight: '1px solid var(--color-border)' }}>Date & Time (EST)</th>
                <th style={{ ...styles.th, width: '150px', minWidth: '150px', borderRight: '1px solid var(--color-border)' }}>Agent</th>
                <th style={{ ...styles.th, ...styles.stickyCol, left: 0, width: '200px', minWidth: '200px', borderRight: '1px solid var(--color-border)', zIndex: 11, backgroundColor: '#F9FAFB' }}>Lead Name</th>
                <th style={{ ...styles.th, width: '160px', minWidth: '160px', borderRight: '1px solid var(--color-border)' }}>Phone</th>
                <th style={{ ...styles.th, width: '240px', minWidth: '240px', borderRight: '1px solid var(--color-border)' }}>Email</th>
                <th style={{ ...styles.th, width: '170px', minWidth: '170px', borderRight: '1px solid var(--color-border)' }}>Category</th>
                <th style={{ ...styles.th, width: '110px', minWidth: '110px', borderRight: '1px solid var(--color-border)' }}>Employees</th>
                <th style={{ ...styles.th, width: '130px', minWidth: '130px', borderRight: '1px solid var(--color-border)' }}>AI Provider</th>
                <th style={{ ...styles.th, width: '100px', minWidth: '100px', borderRight: '1px solid var(--color-border)' }}>Score</th>
                <th style={{ ...styles.th, textAlign: 'center', width: '130px', minWidth: '130px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} style={styles.tr}>
                  <td style={{ ...styles.td, borderRight: '1px solid var(--color-border)', fontSize: '12px' }}>
                    {lead.createdAtEST || new Date(lead.createdAt).toLocaleString("en-US", {timeZone: "America/New_York"})}
                  </td>
                  <td style={{ ...styles.td, borderRight: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-main)' }}>
                      {lead.addedBy || '—'}
                    </span>
                  </td>
                  <td 
                    style={{ 
                      ...styles.td, 
                      ...styles.stickyCol, 
                      left: 0, 
                      width: '200px',
                      minWidth: '200px',
                      backgroundColor: 'white',
                      borderRight: '1px solid var(--color-border)',
                      cursor: lead.status === 'PENDING' ? 'default' : 'pointer' 
                    }}
                    onClick={() => lead.status !== 'PENDING' && onViewDetails(lead)}
                    title={lead.status === 'PENDING' ? "Analyze this lead first to view results" : "View lead details and analysis"}
                  >
                    <div style={{ 
                      fontWeight: '700', 
                      fontSize: '14px',
                      color: lead.status === 'PENDING' ? 'var(--color-text-main)' : 'var(--color-primary)', 
                      textDecoration: lead.status === 'PENDING' ? 'none' : 'underline' 
                    }}>
                      {lead.firstName} {lead.lastName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.jobTitle}</div>
                  </td>
                  <td style={{ ...styles.td, borderRight: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>{lead.phone}</div>
                  </td>
                  <td style={{ ...styles.td, borderRight: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-main)' }}>{lead.email}</div>
                  </td>
                  <td style={{ ...styles.td, borderRight: '1px solid var(--color-border)' }}>
                    <span style={styles.categoryTag}>{lead.category}</span>
                  </td>
                  <td style={{ ...styles.td, borderRight: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-main)' }}>
                      {lead.employeeCount || '—'}
                    </span>
                  </td>
                  <td style={{ ...styles.td, borderRight: '1px solid var(--color-border)' }}>
                    <span style={{ 
                      fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '4px',
                      backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0',
                      textTransform: 'capitalize'
                    }}>
                      {lead.aiProvider || '—'}
                    </span>
                  </td>
                  <td style={{ ...styles.td, borderRight: '1px solid var(--color-border)' }}>
                    {lead.status === 'PENDING' ? (
                      <span style={{ 
                        fontSize: '11px', fontWeight: '600', padding: '4px 8px', borderRadius: '4px',
                        backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0'
                      }}>
                        Pending
                      </span>
                    ) : lead.score !== undefined ? (
                      <div style={{ 
                        width: '32px', height: '32px', borderRadius: '6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700',
                        backgroundColor: lead.score >= 70 ? 'var(--color-green-bg)' : lead.score >= 50 ? 'var(--color-amber-bg)' : 'var(--color-red-bg)',
                        color: lead.score >= 70 ? 'var(--color-green)' : lead.score >= 50 ? 'var(--color-amber)' : 'var(--color-red)',
                        border: '1px solid currentColor'
                      }}>
                        {lead.score}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <button 
                      onClick={() => lead.status !== 'PUSHED_TO_CRM' && onAnalyze(lead)}
                      disabled={lead.status === 'PUSHED_TO_CRM'}
                      style={{
                        ...styles.analyzeBtn,
                        opacity: lead.status === 'PUSHED_TO_CRM' ? 0.6 : 1,
                        cursor: lead.status === 'PUSHED_TO_CRM' ? 'not-allowed' : 'pointer',
                        backgroundColor: lead.status === 'PUSHED_TO_CRM' ? '#f1f5f9' : 'transparent',
                        color: lead.status === 'PUSHED_TO_CRM' ? '#64748b' : 'var(--color-primary)',
                        borderColor: lead.status === 'PUSHED_TO_CRM' ? '#e2e8f0' : 'var(--color-primary)'
                      }}
                      className={lead.status === 'PUSHED_TO_CRM' ? "" : "analyze-hover"}
                    >
                      {lead.status === 'PUSHED_TO_CRM' ? (
                        <>
                          <Database size={14} /> In CRM
                        </>
                      ) : (
                        <>
                          <PlayCircle size={14} /> Analyze
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ ...styles.td, textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <Search size={32} strokeWidth={1} />
                      <p>No leads found matching your search.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { width: '100%', maxWidth: 'none', margin: '0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '20px', flexWrap: 'wrap' },
  searchWrapper: {
    flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px', minWidth: '300px',
    backgroundColor: 'white', border: '1px solid var(--color-border)', borderRadius: '10px', height: '42px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  },
  filterSection: { display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  filterLabel: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' },
  select: {
    padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', 
    fontSize: '13px', fontWeight: '500', outline: 'none', cursor: 'pointer', backgroundColor: 'white',
    color: 'var(--color-text-main)', minWidth: '130px', height: '36px'
  },
  dateInput: {
    border: 'none', backgroundColor: 'transparent', height: '100%', 
    padding: '4px 0px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-main)',
    outline: 'none', cursor: 'text'
  },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '14px', backgroundColor: 'transparent', padding: '8px 0' },
  tableCard: { padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' },
  tableWrapper: { 
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 250px)', // Height-aware scroll
    borderBottomLeftRadius: '12px',
    borderBottomRightRadius: '12px',
  },
  table: { 
    minWidth: '1500px',
    borderCollapse: 'separate', 
    borderSpacing: 0, 
    fontSize: '13px', 
    textAlign: 'left'
  },
  stickyCol: {
    position: 'sticky',
    left: 0,
    zIndex: 5,
    borderRight: '1px solid var(--color-border)',
  },
  th: {
    padding: '14px 16px', backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.2s' },
  td: { padding: '16px', verticalAlign: 'middle', whiteSpace: 'nowrap' },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px',
    borderRadius: '99px', fontSize: '11px', fontWeight: '600',
  },
  categoryTag: {
    backgroundColor: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: '4px',
    fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap',
  },
  truncatedText: {
    maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'help',
  },
  exportBtn: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
    borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
    color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
    transition: 'all 0.2s',
  },
  refreshBtn: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
    borderRadius: '8px', border: '1px solid var(--color-primary)', backgroundColor: 'rgba(139, 92, 246, 0.05)',
    color: 'var(--color-primary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
    transition: 'all 0.2s', height: '38px',
  },
  analyzeBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
    borderRadius: '6px', border: '1px solid var(--color-primary)', backgroundColor: 'transparent',
    color: 'var(--color-primary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
    transition: 'all 0.2s',
  },
  centerContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px' },
  
  // Stats Ribbon
  statsRibbon: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
    backgroundColor: 'white',
    padding: '16px 24px',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  statIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    lineHeight: 1.2
  }
};

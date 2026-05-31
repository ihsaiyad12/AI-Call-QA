'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Database, CheckCircle2, CloudUpload, XCircle,
  Trophy, BarChart3, TrendingUp, AlertCircle, RefreshCcw,
  Calendar, Download, ArrowUpRight, ArrowDownRight, Target, ChevronDown, Filter
} from 'lucide-react';
import CustomDateRangePicker from './CustomDateRangePicker';
import { CATEGORIES } from '@/lib/constants';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area
} from 'recharts';
// ExcelJS is dynamically imported on export click to avoid ~1.3MB in initial bundle
import { AnalyticsSkeleton } from './Skeleton';

interface AnalyticsData {
  kpis: {
    totalLeads: number;
    analyzedLeads: number;
    pushedLeads: number;
    disqualifiedLeads: number;
    pushedToday: number;
    analyzedToday: number;
  };
  agentPerformance: Array<{
    agentName: string;
    totalAdded: number;
    analyzedCount: number;
    pushedCount: number;
    avgScore: number | null;
    goodToGoCount: number;
    borderlineCount: number;
    notQualifiedCount: number;
  }>;
  verdicts: {
    sql: number;
    borderline: number;
    notQualified: number;
  };
  dailyTrend: Array<{
    date: string;
    analyzed: number;
    pushed: number;
  }>;
}

export default function AnalyticsDashboard({ isVisible = true, refreshTrigger = 0, isCollapsed = false, selectedCategory = null, onCategoryChange }: { isVisible?: boolean, refreshTrigger?: number, isCollapsed?: boolean, selectedCategory?: string | null, onCategoryChange?: (cat: string | null) => void }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentSort, setAgentSort] = useState<'default' | 'qualified' | 'disqualified' | 'avgScoreDesc' | 'avgScoreAsc' | 'totalAdded'>('default');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [dateRangeLabel, setDateRangeLabel] = useState('Custom');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const categoryRef = React.useRef<HTMLDivElement>(null);
  const sortRef = React.useRef<HTMLDivElement>(null);
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

  const fetchAnalytics = async (silent = false) => {
    if (!silent) setIsLoading(true);

    setError(null);
    try {
      let url = `/api/analytics?startDate=${startDate}&endDate=${endDate}`;
      if (selectedCategory) {
        url += `&category=${encodeURIComponent(selectedCategory)}`;
      }
      const response = await axios.get(url);
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load analytics data.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate, selectedCategory]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchAnalytics(true);
    }
  }, [refreshTrigger]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div style={styles.container}>
        <AnalyticsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-main)' }}>
        <AlertCircle size={48} style={{ margin: '0 auto 16px', color: '#cbd5e1' }} />
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Failed to load dashboard</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>{error}</p>
        <button style={styles.primaryButton} onClick={() => fetchAnalytics()}>Try Again</button>
      </div>
    );
  }

  if (!data) return null;

  const totalVerdicts = data.verdicts.sql + data.verdicts.borderline + data.verdicts.notQualified;
  const conversionRate = data.kpis.analyzedLeads > 0
    ? Math.round(((data.verdicts.sql + data.verdicts.borderline) / data.kpis.analyzedLeads) * 100)
    : 0;

  // Clean, professional color palette
  const pieData = [
    { name: 'Qualified (SQL)', value: data.verdicts.sql, color: 'var(--color-primary)' }, // Primary Color
    { name: 'Borderline', value: data.verdicts.borderline, color: 'var(--color-text-muted)' }, // Slate
    { name: 'Disqualified', value: data.verdicts.notQualified, color: '#cbd5e1' }, // Light Slate
  ].filter(item => item.value > 0);

  const agentChartData = data.agentPerformance.map(agent => ({
    name: agent.agentName ? agent.agentName.substring(0, 15) : 'Unknown',
    'Total Leads': agent.totalAdded,
    'Pushed to CRM': agent.pushedCount,
  }));

  const downloadExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const res = await fetch(`/api/leads?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error('Failed to fetch leads for export');
      const leads = await res.json();

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Analytics Leads');

      worksheet.columns = [
        { header: 'Date', key: 'createdAt', width: 15 },
        { header: 'Agent', key: 'addedBy', width: 20 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'First Name', key: 'firstName', width: 15 },
        { header: 'Last Name', key: 'lastName', width: 15 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Score', key: 'score', width: 10 },
        { header: 'AI Provider', key: 'aiProvider', width: 15 },
        { header: 'Verdict', key: 'verdict', width: 20 },
        { header: 'Disqualification Comment', key: 'disqualificationComment', width: 30 },
      ];

      leads.forEach((lead: any) => {
        worksheet.addRow({
          createdAt: new Date(lead.createdAt).toLocaleDateString(),
          addedBy: lead.addedBy || 'N/A',
          category: lead.category,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          status: lead.status,
          score: lead.score || 0,
          aiProvider: lead.aiProvider || 'N/A',
          verdict: lead.verdict || 'N/A',
          disqualificationComment: lead.disqualificationComment || '',
        });
      });

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' }
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Analytics_Export_${startDate}_to_${endDate}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={styles.container}
    >
      {/* --- PAGE HEADER --- */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Analytics Overview</h1>
        </div>
        <div style={styles.headerActions}>
          {/* Category Filter Dropdown */}
          <div ref={categoryRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setIsCategoryOpen(!isCategoryOpen); setCategorySearch(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', height: '48px',
                backgroundColor: selectedCategory ? 'var(--color-primary-light)' : 'var(--color-bg-card)',
                border: `1px solid ${selectedCategory ? 'rgba(139, 92, 246, 0.3)' : 'var(--color-border)'}`,
                borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                color: selectedCategory ? 'var(--color-primary)' : 'var(--color-text-main)',
                boxShadow: '0 4px 12px var(--color-shadow)', transition: 'all 0.2s', minWidth: '180px',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={14} color="var(--color-primary)" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>
                  {selectedCategory || 'All Categories'}
                </span>
              </div>
              <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isCategoryOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
            </button>
            
            {isCategoryOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '280px',
                backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px',
                boxShadow: '0 20px 50px var(--color-shadow)', zIndex: 100, overflow: 'hidden'
              }}>
                <div style={{ padding: '12px 12px 8px' }}>
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)',
                      fontSize: '13px', outline: 'none', backgroundColor: 'var(--color-bg-app)',
                      color: 'var(--color-text-main)', boxSizing: 'border-box'
                    }}
                    autoFocus
                  />
                </div>
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  <div
                    onClick={() => { onCategoryChange?.(null); setIsCategoryOpen(false); }}
                    style={{
                      padding: '10px 16px', fontSize: '13px', fontWeight: selectedCategory === null ? '700' : '500',
                      cursor: 'pointer', backgroundColor: selectedCategory === null ? 'var(--color-bg-hover)' : 'transparent',
                      color: selectedCategory === null ? 'var(--color-primary)' : 'var(--color-text-main)',
                      borderBottom: '1px solid var(--color-border)'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = selectedCategory === null ? 'var(--color-bg-hover)' : 'transparent'; }}
                  >
                    All Categories
                  </div>
                  {[...CATEGORIES]
                    .sort((a, b) => a.localeCompare(b))
                    .filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase()))
                    .map(cat => (
                    <div
                      key={cat}
                      onClick={() => { onCategoryChange?.(cat); setIsCategoryOpen(false); }}
                      style={{
                        padding: '10px 16px', fontSize: '13px', fontWeight: selectedCategory === cat ? '700' : '500',
                        cursor: 'pointer', backgroundColor: selectedCategory === cat ? 'var(--color-bg-hover)' : 'transparent',
                        color: selectedCategory === cat ? 'var(--color-primary)' : 'var(--color-text-main)'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = selectedCategory === cat ? 'var(--color-bg-hover)' : 'transparent'; }}
                    >
                      {cat}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <CustomDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onRangeChange={handleRangeChange}
            label={dateRangeLabel}
            align="right"
          />
          <button style={styles.exportButton} onClick={downloadExcel} title="Export to Excel">
            <Download size={14} />
            <span style={{ fontWeight: 600 }}>Export Data</span>
          </button>
        </div>
      </div>

      {/* --- KPI CARDS ROW --- */}
      <motion.div
        layout
        style={{
          ...styles.kpiGrid,
          gridTemplateColumns: isCollapsed ? 'repeat(6, 1fr)' : 'repeat(3, 1fr)',
        }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.div layout variants={itemVariants} style={styles.kpiCard} whileHover={{ y: -5, boxShadow: '0 12px 30px rgba(0,0,0,0.06)' }}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Total Leads</span>
            <div style={styles.kpiIconWrapper}><Database size={18} color="var(--color-primary)" /></div>
          </div>
          <div style={styles.kpiBody}>
            <h2 style={styles.kpiValue}>{data.kpis.totalLeads}</h2>
          </div>
        </motion.div>

        <motion.div layout variants={itemVariants} style={styles.kpiCard} whileHover={{ y: -5, boxShadow: '0 12px 30px rgba(0,0,0,0.06)' }}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Analyzed Calls</span>
            <div style={styles.kpiIconWrapper}><CheckCircle2 size={18} color="var(--color-primary)" /></div>
          </div>
          <div style={styles.kpiBody}>
            <h2 style={styles.kpiValue}>{data.kpis.analyzedLeads}</h2>
          </div>
        </motion.div>

        <motion.div layout variants={itemVariants} style={styles.kpiCard} whileHover={{ y: -5, boxShadow: '0 12px 30px rgba(0,0,0,0.06)' }}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Pushed to CRM</span>
            <div style={styles.kpiIconWrapper}><CloudUpload size={18} color="var(--color-primary)" /></div>
          </div>
          <div style={styles.kpiBody}>
            <h2 style={styles.kpiValue}>{data.verdicts.sql + data.verdicts.borderline}</h2>
          </div>
        </motion.div>

        <motion.div layout variants={itemVariants} style={styles.kpiCard} whileHover={{ y: -5, boxShadow: '0 12px 30px rgba(0,0,0,0.06)' }}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>
              {startDate === endDate ? `Disqualified on ${startDate}` : `Disqualified Leads`}
            </span>
            <div style={styles.kpiIconWrapper}><XCircle size={18} color="var(--color-primary)" /></div>
          </div>
          <div style={styles.kpiBody}>
            <h2 style={styles.kpiValue}>{data.verdicts.notQualified}</h2>
          </div>
        </motion.div>

        <motion.div layout variants={itemVariants} style={styles.kpiCard} whileHover={{ y: -5, boxShadow: '0 12px 30px rgba(0,0,0,0.06)' }}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>
              {startDate === endDate ? `Qualified on ${startDate}` : `Qualified Leads`}
            </span>
            <div style={styles.kpiIconWrapper}><Target size={18} color="var(--color-primary)" /></div>
          </div>
          <div style={styles.kpiBody}>
            <h2 style={styles.kpiValue}>{data.verdicts.sql}</h2>
          </div>
        </motion.div>

        <motion.div layout variants={itemVariants} style={styles.kpiCard} whileHover={{ y: -5, boxShadow: '0 12px 30px rgba(0,0,0,0.06)' }}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Qualified Rate (SQL)</span>
            <div style={styles.kpiIconWrapper}><Trophy size={18} color="var(--color-primary)" /></div>
          </div>
          <div style={styles.kpiBody}>
            <h2 style={styles.kpiValue}>{conversionRate}%</h2>
          </div>
        </motion.div>
      </motion.div>

      {/* --- MAIN CONTENT GRID --- */}
      <div style={styles.mainGrid}>

        {/* Main Chart: Volume & Performance Trends */}
        <motion.div variants={itemVariants} style={{ ...styles.sectionCard, gridColumn: 'span 3' }}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Performance Trend</h3>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Analyzed vs Pushed to CRM</span>
          </div>
          <div style={{ height: '360px', width: '100%', marginTop: '24px' }}>
            {!isVisible || !data.dailyTrend || data.dailyTrend.length === 0 ? (
              <div style={styles.emptyState}>No trend data available for this period.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAnalyzed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPushed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-green)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-green)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-bg-hover)" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontWeight: 500 }}
                    dy={10}
                    tickFormatter={(str) => {
                      const d = new Date(str);
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontWeight: 500 }}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid var(--color-border)',
                      boxShadow: '0 8px 30px var(--color-shadow)',
                      padding: '12px 16px',
                      fontSize: '13px',
                      backgroundColor: 'var(--color-bg-card)'
                    }}
                    labelStyle={{ fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '8px' }}
                    itemStyle={{ padding: '2px 0' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="analyzed"
                    name="Analyzed Leads"
                    stroke="var(--color-primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorAnalyzed)"
                    animationDuration={800}
                  />
                  <Area
                    type="monotone"
                    dataKey="pushed"
                    name="Pushed to CRM"
                    stroke="var(--color-green)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorPushed)"
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Lead Distribution Doughnut */}
        <motion.div variants={itemVariants} style={{ ...styles.sectionCard, gridColumn: 'span 1' }}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Verdict Mix</h3>
          </div>
          <div style={{ height: '240px', marginTop: '16px', position: 'relative' }}>
            {!isVisible || totalVerdicts === 0 ? (
              <div style={styles.emptyState}>{totalVerdicts === 0 ? 'Not enough analyzed data.' : ''}</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={4}
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid var(--color-border)',
                        boxShadow: '0 8px 30px var(--color-shadow)',
                        backgroundColor: 'var(--color-bg-card)',
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                      formatter={(value: any, name: any) => [`${value} leads (${Math.round((value / totalVerdicts) * 100)}%)`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center', pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--color-text-main)', lineHeight: 1, letterSpacing: '-1px' }}>
                    {totalVerdicts}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Total
                  </div>
                </div>
              </>
            )}
          </div>
          <div style={styles.legendList}>
            {pieData.map((item, i) => (
              <div key={i} style={styles.legendRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: '500' }}>{item.name}</span>
                </div>
                <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text-main)' }}>
                  {item.value} <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '400' }}>({Math.round((item.value / totalVerdicts) * 100)}%)</span>
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Agent Leaderboard Bar Chart */}
        <motion.div variants={itemVariants} style={{ ...styles.sectionCard, gridColumn: 'span 2' }}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Agent Leaderboard</h3>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Top Contributors</span>
          </div>
          <div style={{ height: '340px', width: '100%', marginTop: '20px' }}>
            {!isVisible || agentChartData.length === 0 ? (
              <div style={styles.emptyState}>No agent data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentChartData.slice(0, 8)} margin={{ top: 10, right: 10, left: -10, bottom: 5 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-bg-hover)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontWeight: 500 }}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'var(--color-bg-hover)', radius: 4 }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid var(--color-border)',
                      boxShadow: '0 10px 40px var(--color-shadow)',
                      padding: '12px 16px',
                      fontSize: '13px',
                      backgroundColor: 'var(--color-bg-card)'
                    }}
                    labelStyle={{ fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '8px' }}
                  />
                  <Bar
                    dataKey="Total Leads"
                    fill="var(--color-border-hover)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                    animationDuration={800}
                  />
                  <Bar
                    dataKey="Pushed to CRM"
                    fill="var(--color-primary)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Agent Detailed Table (Full Width) */}
        <motion.div variants={itemVariants} style={{ ...styles.sectionCard, gridColumn: 'span 3', padding: '0', marginTop: '12px' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={styles.sectionTitle}>Agent Performance Matrix</h3>
            <div ref={sortRef} style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-muted)' }}>Sort by</span>
              <div
                onClick={() => setIsSortOpen(!isSortOpen)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--color-border)',
                  fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-main)', minWidth: '200px',
                  boxShadow: '0 8px 30px var(--color-shadow)', userSelect: 'none'
                }}
              >
                {agentSort === 'default' && 'Default'}
                {agentSort === 'qualified' && 'Most Qualified'}
                {agentSort === 'disqualified' && 'Most Disqualified'}
                {agentSort === 'avgScoreDesc' && 'Highest Avg Score'}
                {agentSort === 'avgScoreAsc' && 'Lowest Avg Score'}
                {agentSort === 'totalAdded' && 'Most Total Added'}
                <div style={{ transform: isSortOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <ChevronDown size={16} color="var(--color-primary)" />
                </div>
              </div>

              {isSortOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '200px',
                  backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px',
                  boxShadow: '0 20px 50px var(--color-shadow)', zIndex: 100, overflow: 'hidden'
                }}>
                  {[
                    { val: 'default', label: 'Default' },
                    { val: 'qualified', label: 'Most Qualified' },
                    { val: 'disqualified', label: 'Most Disqualified' },
                    { val: 'avgScoreDesc', label: 'Highest Avg Score' },
                    { val: 'avgScoreAsc', label: 'Lowest Avg Score' },
                    { val: 'totalAdded', label: 'Most Total Added' },
                  ].map((opt) => (
                    <div
                      key={opt.val}
                      onClick={() => { setAgentSort(opt.val as any); setIsSortOpen(false); setCurrentPage(1); }}
                      style={{
                        padding: '12px 16px', fontSize: '13px', fontWeight: '500',
                        cursor: 'pointer', backgroundColor: agentSort === opt.val ? 'var(--color-bg-hover)' : 'transparent',
                        color: agentSort === opt.val ? 'var(--color-primary)' : 'var(--color-text-main)'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = agentSort === opt.val ? 'var(--color-bg-hover)' : 'transparent'; }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Agent Name</th>
                  <th style={styles.th}>Total Added</th>
                  <th style={styles.th}>Analyzed</th>
                  <th style={styles.th}>Avg Score</th>
                  <th style={styles.th}>Disqualified</th>
                  <th style={styles.th}>Borderline</th>
                  <th style={styles.th}>Qualified (SQL)</th>
                  <th style={styles.th}>CRM Pushed</th>
                </tr>
              </thead>
              <tbody>
                {data.agentPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '80px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No agent data available yet.
                    </td>
                  </tr>
                ) : (
                  [...data.agentPerformance]
                    .sort((a, b) => {
                      switch (agentSort) {
                        case 'qualified': return b.goodToGoCount - a.goodToGoCount;
                        case 'disqualified': return b.notQualifiedCount - a.notQualifiedCount;
                        case 'avgScoreDesc': return (b.avgScore ?? 0) - (a.avgScore ?? 0);
                        case 'avgScoreAsc': return (a.avgScore ?? 0) - (b.avgScore ?? 0);
                        case 'totalAdded': return b.totalAdded - a.totalAdded;
                        default: return 0;
                      }
                    })
                    .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
                    .map((agent, i) => (
                      <motion.tr
                        key={i}
                        style={styles.tr}
                        whileHover={{ backgroundColor: 'var(--color-bg-hover)' }}
                      >
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={styles.avatar}>
                              {agent.agentName ? agent.agentName.charAt(0).toUpperCase() : '?'}
                            </div>
                            <span style={{ fontWeight: '600', color: 'var(--color-text-main)', fontSize: '13px' }}>
                              {agent.agentName || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td style={styles.td}>{agent.totalAdded}</td>
                        <td style={styles.td}>{agent.analyzedCount}</td>
                        <td style={styles.td}>
                          {agent.avgScore !== null ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontWeight: '600', fontSize: '13px' }}>{agent.avgScore.toFixed(1)}</span>
                              <div style={styles.scoreBarBg}>
                                <div style={{
                                  ...styles.scoreBarFill,
                                  width: `${agent.avgScore}%`,
                                  backgroundColor: agent.avgScore >= 70 ? 'var(--color-primary)' : agent.avgScore >= 50 ? 'var(--color-text-muted)' : '#cbd5e1'
                                }} />
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>—</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.simpleNumber, color: agent.notQualifiedCount > 0 ? 'var(--color-red)' : 'var(--color-text-muted)', fontWeight: agent.notQualifiedCount > 0 ? '600' : '500' }}>{agent.notQualifiedCount}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.simpleNumber, color: agent.borderlineCount > 0 ? 'var(--color-amber)' : 'var(--color-text-muted)', fontWeight: agent.borderlineCount > 0 ? '600' : '500' }}>{agent.borderlineCount}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.simpleNumber, color: agent.goodToGoCount > 0 ? 'var(--color-green)' : 'var(--color-text-muted)', fontWeight: agent.goodToGoCount > 0 ? '600' : '500' }}>{agent.goodToGoCount}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.simpleNumber, color: 'var(--color-primary)', fontWeight: '600' }}>{agent.pushedCount}</span>
                        </td>
                      </motion.tr>
                    ))
                )}
              </tbody>
            </table>
            {data.agentPerformance.length > rowsPerPage && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500' }}>
                  Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, data.agentPerformance.length)} of {data.agentPerformance.length} agents
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
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
                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(data.agentPerformance.length / rowsPerPage), p + 1))}
                    disabled={currentPage === Math.ceil(data.agentPerformance.length / rowsPerPage)}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--color-border)',
                      backgroundColor: currentPage === Math.ceil(data.agentPerformance.length / rowsPerPage) ? 'var(--color-bg-hover)' : 'var(--color-bg-card)',
                      color: currentPage === Math.ceil(data.agentPerformance.length / rowsPerPage) ? 'var(--color-text-muted)' : 'var(--color-text-main)',
                      fontSize: '13px', fontWeight: '600', cursor: currentPage === Math.ceil(data.agentPerformance.length / rowsPerPage) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px 40px 24px',
    maxWidth: '1600px',
    margin: '0 auto',
    fontFamily: 'inherit',
  },
  loadingWrapper: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh'
  },
  loadingSpinner: {
    width: '36px', height: '36px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%'
  },

  // --- PAGE HEADER ---
  pageHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'
  },
  pageTitle: {
    fontSize: '28px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '8px', letterSpacing: '-0.5px'
  },
  pageSubtitle: {
    fontSize: '15px', color: 'var(--color-text-muted)'
  },
  headerActions: {
    display: 'flex', alignItems: 'center', gap: '16px'
  },
  datePickerContainer: {
    display: 'flex', alignItems: 'center', gap: '12px'
  },
  datePickerBox: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px',
    backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px',
    height: '48px', boxShadow: '0 8px 30px var(--color-shadow)', transition: 'border-color 0.2s'
  },
  dateLabel: {
    fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500'
  },
  dateInput: {
    border: 'none', backgroundColor: 'transparent',
    padding: '0 4px', fontSize: '14px', fontWeight: '600', color: 'var(--color-text-main)',
    outline: 'none', cursor: 'pointer', fontFamily: 'inherit'
  },
  exportButton: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', height: '48px',
    backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px',
    fontSize: '14px', fontWeight: '600', color: 'var(--color-primary)', cursor: 'pointer',
    boxShadow: '0 4px 12px var(--color-shadow)', transition: 'all 0.2s'
  },
  primaryButton: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
    backgroundColor: 'var(--color-primary)', border: 'none', borderRadius: '10px',
    fontSize: '14px', fontWeight: '600', color: 'white', cursor: 'pointer', margin: '0 auto'
  },

  // --- KPI CARDS ---
  kpiGrid: {
    display: 'grid',
    gap: '16px',
    marginBottom: '24px'
  },
  kpiCard: {
    padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: '16px',
    backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px',
    boxShadow: '0 8px 30px var(--color-shadow)', transition: 'box-shadow 0.2s ease-in-out'
  },
  kpiHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  kpiLabel: {
    fontSize: '13px', fontWeight: '500', color: 'var(--color-text-muted)'
  },
  kpiIconWrapper: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--color-primary-light)'
  },
  kpiBody: {
    display: 'flex', alignItems: 'baseline', gap: '8px'
  },
  kpiValue: {
    fontSize: '28px', fontWeight: '700', color: 'var(--color-text-main)', margin: 0, letterSpacing: '-1px'
  },

  // --- MAIN GRID ---
  mainGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px'
  },
  sectionCard: {
    padding: '24px', display: 'flex', flexDirection: 'column',
    backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px',
    boxShadow: '0 8px 30px var(--color-shadow)'
  },
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  sectionTitle: {
    fontSize: '18px', fontWeight: '700', color: 'var(--color-text-main)', margin: 0
  },
  emptyState: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
    color: 'var(--color-text-muted)', fontSize: '15px'
  },

  legendList: {
    display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px'
  },
  legendRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '1px solid var(--color-border)'
  },

  // --- TABLE ---
  table: {
    width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px'
  },
  th: {
    padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-sidebar)', textTransform: 'uppercase', letterSpacing: '0.05em'
  },
  tr: {
    borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', transition: 'background-color 0.15s'
  },
  td: {
    padding: '16px 24px', fontSize: '13px', color: 'var(--color-text-muted)', verticalAlign: 'middle'
  },
  avatar: {
    width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-bg-hover)',
    color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '600'
  },
  scoreBarBg: {
    width: '70px', height: '8px', backgroundColor: 'var(--color-border-hover)', borderRadius: '4px', overflow: 'hidden'
  },
  scoreBarFill: {
    height: '100%', borderRadius: '4px', transition: 'width 0.8s ease-in-out'
  },
  simpleNumber: {
    color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '500'
  }
};

'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Users, Database, CheckCircle2, CloudUpload, XCircle, 
  Trophy, BarChart3, TrendingUp, AlertCircle, RefreshCcw,
  Calendar, Download, ArrowUpRight, ArrowDownRight, Target
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import ExcelJS from 'exceljs';

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
}

export default function AnalyticsDashboard({ isVisible = true, refreshTrigger = 0 }: { isVisible?: boolean, refreshTrigger?: number }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [agentSort, setAgentSort] = useState<'default' | 'qualified' | 'disqualified' | 'avgScoreDesc' | 'avgScoreAsc' | 'totalAdded'>('default');

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

  const fetchAnalytics = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    
    setError(null);
    try {
      const response = await axios.get(`/api/analytics?startDate=${startDate}&endDate=${endDate}`);
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load analytics data.');
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchAnalytics(true); // Silent refresh
    }
  }, [refreshTrigger]);

  if (isLoading) {
    return (
      <div style={styles.loadingWrapper}>
        <div className="spin-animation" style={styles.loadingSpinner} />
        <p style={{ color: 'var(--color-text-muted)', fontWeight: '500' }}>Loading overview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-red)' }}>
        <AlertCircle size={48} style={{ margin: '0 auto 16px' }} />
        <h2 className="outfit-font">Failed to load dashboard</h2>
        <p>{error}</p>
        <button className="primary-button" onClick={() => fetchAnalytics()} style={{ marginTop: '24px' }}>Try Again</button>
      </div>
    );
  }

  if (!data) return null;

  const totalVerdicts = data.verdicts.sql + data.verdicts.borderline + data.verdicts.notQualified;
  const conversionRate = data.kpis.analyzedLeads > 0 
    ? Math.round((data.verdicts.sql / data.kpis.analyzedLeads) * 100) 
    : 0;

  const pieData = [
    { name: 'Qualified (SQL)', value: data.verdicts.sql, color: '#10B981' }, // Green
    { name: 'Borderline', value: data.verdicts.borderline, color: '#F59E0B' }, // Amber
    { name: 'Disqualified', value: data.verdicts.notQualified, color: '#EF4444' }, // Red
  ].filter(item => item.value > 0);

  const agentChartData = data.agentPerformance.map(agent => ({
    name: agent.agentName ? agent.agentName.substring(0, 15) : 'Unknown',
    'Total Leads Added': agent.totalAdded,
    'Pushed to CRM': agent.pushedCount,
  }));
  
  const downloadExcel = async () => {
    try {
      // 1. Fetch the raw leads for the current date range
      const res = await fetch(`/api/leads?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error('Failed to fetch leads for export');
      const leads = await res.json();

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Analytics Leads');

      // Define columns
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

      // Add data
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

      // Style header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' }
      };

      // Download
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

  const today = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };

  return (
    <div style={styles.container}>
      {/* --- PAGE HEADER --- */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Overview</h1>
          <p style={styles.pageSubtitle}>Track lead volume, quality distribution, and agent performance.</p>
        </div>
        <div style={styles.headerActions}>
          <div style={{ ...styles.datePickerFake, padding: 0, overflow: 'hidden' }}>
            <div style={{ paddingLeft: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <Calendar size={16} color="var(--color-text-muted)" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px 0 8px', gap: '8px' }}>
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
          <button style={styles.iconButton} onClick={() => fetchAnalytics(true)} title="Refresh Data">
            <RefreshCcw size={16} className={isRefreshing ? "spin-animation" : ""} />
          </button>
          <button style={styles.secondaryButton} onClick={downloadExcel}>
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* --- KPI CARDS ROW --- */}
      <div style={styles.kpiGrid}>
        <div className="saas-card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Total Leads</span>
            <Database size={16} color="var(--color-text-muted)" />
          </div>
          <div style={styles.kpiBody}>
            <h2 style={styles.kpiValue}>{data.kpis.totalLeads}</h2>
            <span style={styles.kpiTrendPositive}>
              <ArrowUpRight size={14} /> 12% vs last month
            </span>
          </div>
        </div>

        <div className="saas-card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Analyzed Calls</span>
            <CheckCircle2 size={16} color="var(--color-text-muted)" />
          </div>
          <div style={styles.kpiBody}>
            <h2 style={styles.kpiValue}>{data.kpis.analyzedLeads}</h2>
            <span style={styles.kpiTrendPositive}>
              <ArrowUpRight size={14} /> 8% vs last month
            </span>
          </div>
        </div>

        <div className="saas-card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Pushed to CRM (Total)</span>
            <CloudUpload size={16} color="var(--color-text-muted)" />
          </div>
          <div style={styles.kpiBody}>
            <h2 style={styles.kpiValue}>{data.kpis.pushedLeads}</h2>
            <span style={styles.kpiTrendPositive}>
              <ArrowUpRight size={14} /> 15% vs last month
            </span>
          </div>
        </div>

        <div className="saas-card" style={{ ...styles.kpiCard, borderLeft: '4px solid var(--color-purple)' }}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>
              {startDate === endDate ? `Pushed on ${startDate}` : `Pushed in Period`}
            </span>
            <Target size={16} color="var(--color-purple)" />
          </div>
          <div style={styles.kpiBody}>
            <h2 style={styles.kpiValue}>{data.kpis.pushedToday}</h2>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>leads synced</span>
          </div>
        </div>

        <div className="saas-card" style={{ ...styles.kpiCard, borderLeft: '4px solid var(--color-blue)' }}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>
              {startDate === endDate ? `Analyzed on ${startDate}` : `Analyzed in Period`}
            </span>
            <TrendingUp size={16} color="var(--color-blue)" />
          </div>
          <div style={styles.kpiBody}>
            <h2 style={styles.kpiValue}>{data.kpis.analyzedToday}</h2>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>calls reviewed</span>
          </div>
        </div>

        <div className="saas-card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiLabel}>Qualified Rate (SQL)</span>
            <Target size={16} color="var(--color-text-muted)" />
          </div>
          <div style={styles.kpiBody}>
            <h2 style={styles.kpiValue}>{conversionRate}%</h2>
            <span style={styles.kpiTrendNegative}>
              <ArrowDownRight size={14} /> 2% vs last month
            </span>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div style={styles.mainGrid}>
        
        {/* Main Chart: Agent Performance */}
        <div className="saas-card" style={{ ...styles.sectionCard, gridColumn: 'span 2' }}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Agent Volume & Conversion</h3>
          </div>
          <div style={{ height: '320px', width: '100%', marginTop: '20px' }}>
            {!isVisible || agentChartData.length === 0 ? (
              <div style={styles.emptyState}>{agentChartData.length === 0 ? 'No agent data available.' : ''}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }} barCategoryGap="30%">
                  <defs>
                    <linearGradient id="barGradientTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#c7d2fe" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="barGradientCRM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} 
                    allowDecimals={false}
                    tickFormatter={(value: number) => Math.floor(value).toString()}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(99, 102, 241, 0.04)', radius: 4 }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12), 0 4px 6px -2px rgba(0,0,0,0.05)',
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '500',
                      backgroundColor: 'white'
                    }}
                    labelStyle={{ fontWeight: '700', color: '#1e293b', marginBottom: '6px', fontSize: '13px' }}
                    itemStyle={{ color: '#475569', padding: '2px 0' }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={40} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '12px', fontWeight: '500', color: '#64748b' }} 
                  />
                  <Bar 
                    dataKey="Total Leads Added" 
                    fill="url(#barGradientTotal)" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={40}
                  />
                  <Bar 
                    dataKey="Pushed to CRM" 
                    fill="url(#barGradientCRM)" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quality Distribution Doughnut */}
        <div className="saas-card" style={{ ...styles.sectionCard, gridColumn: 'span 1' }}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Quality Distribution</h3>
          </div>
          <div style={{ height: '240px', marginTop: '16px', position: 'relative' }}>
            {!isVisible || totalVerdicts === 0 ? (
              <div style={styles.emptyState}>{totalVerdicts === 0 ? 'Not enough analyzed data.' : ''}</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <filter id="pieShadow" x="-10%" y="-10%" width="120%" height="120%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.08" />
                      </filter>
                    </defs>
                    <Pie 
                      data={pieData} 
                      innerRadius={65} 
                      outerRadius={95} 
                      paddingAngle={3} 
                      dataKey="value" 
                      stroke="none"
                      cornerRadius={4}
                      style={{ filter: 'url(#pieShadow)' }}
                    >
                      {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)',
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
                  transform: 'translate(-50%, -55%)',
                  textAlign: 'center', pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-text-main)', lineHeight: 1, letterSpacing: '-1px' }}>
                    {totalVerdicts}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Total
                  </div>
                </div>
              </>
            )}
          </div>
          <div style={styles.legendList}>
            {pieData.map((item, i) => (
              <div key={i} style={{
                ...styles.legendRow,
                backgroundColor: '#fafbfc',
                borderRadius: '8px',
                padding: '10px 14px',
                borderBottom: 'none',
                borderLeft: `3px solid ${item.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>{item.name}</span>
                </div>
                <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text-main)' }}>
                  {item.value} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '400' }}>({Math.round((item.value/totalVerdicts)*100)}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Leaderboard Table */}
        <div className="saas-card" style={{ ...styles.sectionCard, gridColumn: 'span 3', padding: '0' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={styles.sectionTitle}>Agent Performance Details</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' }}>Sort by:</span>
              <select
                value={agentSort}
                onChange={(e) => setAgentSort(e.target.value as any)}
                style={{
                  padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--color-border)',
                  fontSize: '12px', fontWeight: '500', outline: 'none', cursor: 'pointer',
                  backgroundColor: 'white', color: 'var(--color-text-main)', minWidth: '160px'
                }}
              >
                <option value="default">Default</option>
                <option value="qualified">Most Qualified</option>
                <option value="disqualified">Most Disqualified</option>
                <option value="avgScoreDesc">Highest Avg Score</option>
                <option value="avgScoreAsc">Lowest Avg Score</option>
                <option value="totalAdded">Most Total Added</option>
              </select>
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
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No agent data available yet.
                    </td>
                  </tr>
                ) : (
                  [...data.agentPerformance]
                    .sort((a, b) => {
                      switch (agentSort) {
                        case 'qualified':     return b.goodToGoCount - a.goodToGoCount;
                        case 'disqualified':  return b.notQualifiedCount - a.notQualifiedCount;
                        case 'avgScoreDesc':  return (b.avgScore ?? 0) - (a.avgScore ?? 0);
                        case 'avgScoreAsc':   return (a.avgScore ?? 0) - (b.avgScore ?? 0);
                        case 'totalAdded':    return b.totalAdded - a.totalAdded;
                        default:              return 0;
                      }
                    })
                    .map((agent, i) => (
                    <tr key={i} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={styles.avatar}>
                            {agent.agentName ? agent.agentName.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span style={{ fontWeight: '500', color: 'var(--color-text-main)' }}>
                            {agent.agentName || 'Unknown'}
                          </span>
                          {i === 0 && (
                            <span title="Top Performer" style={{ display: 'flex' }}>
                              <Trophy size={14} color="#F59E0B" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>{agent.totalAdded}</td>
                      <td style={styles.td}>{agent.analyzedCount}</td>
                      <td style={styles.td}>
                        {agent.avgScore !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '600' }}>{agent.avgScore.toFixed(1)}</span>
                            <div style={styles.scoreBarBg}>
                              <div style={{ 
                                ...styles.scoreBarFill, 
                                width: `${agent.avgScore}%`, 
                                backgroundColor: agent.avgScore >= 70 ? 'var(--color-green)' : agent.avgScore >= 50 ? 'var(--color-amber)' : 'var(--color-red)'
                              }} />
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>N/A</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, backgroundColor: 'var(--color-red-bg)', color: 'var(--color-red)' }}>
                          {agent.notQualifiedCount}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, backgroundColor: 'var(--color-amber-bg)', color: 'var(--color-amber)' }}>
                          {agent.borderlineCount}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, backgroundColor: 'var(--color-green-bg)', color: 'var(--color-green)' }}>
                          {agent.goodToGoCount}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                          {agent.pushedCount}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px 32px 64px',
    maxWidth: '1400px',
    margin: '0 auto',
    animation: 'fadeIn 0.4s ease-out',
  },
  loadingWrapper: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px'
  },
  loadingSpinner: {
    width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%'
  },
  
  // --- PAGE HEADER ---
  pageHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px'
  },
  pageTitle: {
    fontSize: '24px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '4px', letterSpacing: '-0.5px'
  },
  pageSubtitle: {
    fontSize: '14px', color: 'var(--color-text-muted)'
  },
  headerActions: {
    display: 'flex', alignItems: 'center', gap: '12px'
  },
  datePickerFake: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
    backgroundColor: 'white', border: '1px solid var(--color-border)', borderRadius: '8px',
    fontSize: '13px', fontWeight: '500', color: 'var(--color-text-main)', cursor: 'pointer',
    height: '36px'
  },
  dateInput: {
    border: 'none', backgroundColor: 'transparent', height: '100%', 
    padding: '4px 0px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-main)',
    outline: 'none', cursor: 'text'
  },
  iconButton: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px',
    backgroundColor: 'white', border: '1px solid var(--color-border)', borderRadius: '8px',
    color: 'var(--color-text-muted)', cursor: 'pointer'
  },
  secondaryButton: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', height: '36px',
    backgroundColor: 'white', border: '1px solid var(--color-border)', borderRadius: '8px',
    fontSize: '13px', fontWeight: '500', color: 'var(--color-text-main)', cursor: 'pointer'
  },

  // --- KPI CARDS ---
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px'
  },
  kpiCard: {
    padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px'
  },
  kpiHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  kpiLabel: {
    fontSize: '13px', fontWeight: '500', color: 'var(--color-text-muted)'
  },
  kpiBody: {
    display: 'flex', alignItems: 'baseline', gap: '12px'
  },
  kpiValue: {
    fontSize: '28px', fontWeight: '700', color: 'var(--color-text-main)', margin: 0, letterSpacing: '-0.5px'
  },
  kpiTrendPositive: {
    display: 'flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: '500', color: 'var(--color-green)'
  },
  kpiTrendNegative: {
    display: 'flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: '500', color: 'var(--color-red)'
  },

  // --- MAIN GRID ---
  mainGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px'
  },
  sectionCard: {
    padding: '24px', display: 'flex', flexDirection: 'column'
  },
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  sectionTitle: {
    fontSize: '16px', fontWeight: '600', color: 'var(--color-text-main)', margin: 0
  },
  emptyState: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
    color: 'var(--color-text-muted)', fontSize: '14px'
  },

  legendList: {
    display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px'
  },
  legendRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },

  // --- TABLE ---
  table: {
    width: '100%', borderCollapse: 'collapse', textAlign: 'left'
  },
  th: {
    padding: '12px 24px', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-muted)', 
    borderBottom: '1px solid var(--color-border)', backgroundColor: '#F9FAFB', textTransform: 'uppercase', letterSpacing: '0.5px'
  },
  tr: {
    borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s'
  },
  td: {
    padding: '16px 24px', fontSize: '14px', color: 'var(--color-text-main)'
  },
  avatar: {
    width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)',
    color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '600'
  },
  scoreBarBg: {
    width: '60px', height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden'
  },
  scoreBarFill: {
    height: '100%', borderRadius: '3px'
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '12px',
    fontSize: '12px', fontWeight: '500'
  }
};

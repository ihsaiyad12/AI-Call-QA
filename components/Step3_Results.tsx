'use client';

import React, { useState } from 'react';
import {
  AlertCircle, CheckCircle2, XCircle, RefreshCw,
  MessageSquare, BarChart3, Database, User, Mail,
  Phone, Tag, Users, Send, ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { AnalysisResult } from '@/types';

interface LeadData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  category: string;
  employeeCount: string;
  jobTitle: string;
  aiProvider?: string;
  company?: string | null;
  industry?: string | null;
}

interface Step3ResultsProps {
  analysisResult: AnalysisResult;
  transcript: string;
  onReset: () => void;
  onRefresh?: () => void;
  leadId: string | null;
  leadData: LeadData;
  emailStatus: string | null;
  status?: string;
}

const Step3_Results: React.FC<Step3ResultsProps> = ({
  analysisResult, transcript, onReset, onRefresh, leadId, leadData, emailStatus, status
}) => {
  const [activeTab, setActiveTab] = useState<'score' | 'transcript'>('score');
  const [pushStatus, setPushStatus] = useState<'idle' | 'pushing' | 'success' | 'error'>('idle');
  const [pushError, setPushError] = useState('');
  const initialScore = analysisResult?.score || 0;
  // Enforce mathematical rules to override AI hallucinations
  const initialVerdict = initialScore >= 70 ? 'Good to Go (SQL)' : (initialScore >= 50 ? 'Borderline' : 'Not Qualified');
  
  const [currentVerdict, setCurrentVerdict] = useState(initialVerdict);
  const [currentScore, setCurrentScore] = useState(initialScore);
  const [isDisqualifying, setIsDisqualifying] = useState(false);
  const [isQualifying, setIsQualifying] = useState(false);
  const [showDisqualifyModal, setShowDisqualifyModal] = useState(false);
  const [disComment, setDisComment] = useState('');

  if (!analysisResult) return null;

  const { score, intent, authority, demo_commitment, timeline, industry_fit, reasoning, risk_level } = analysisResult;

  const getVerdictConfig = () => {
    if (currentVerdict === 'Good to Go (SQL)') return {
      bg: 'var(--color-green-bg)', border: 'var(--color-green)', color: 'var(--color-green)',
      icon: <CheckCircle2 size={20} />, label: 'Good to Go (SQL)',
      guidance: 'Score 70+. Strong potential — proceed with sales follow-up.',
      tagBg: 'rgba(34, 197, 94, 0.15)', tagColor: '#4ade80'
    };
    if (currentVerdict === 'Borderline') return {
      bg: 'var(--color-amber-bg)', border: 'var(--color-amber)', color: 'var(--color-amber)',
      icon: <AlertCircle size={20} />, label: 'Borderline',
      guidance: 'Score 50–69. Review manually — accept if authority is strong.',
      tagBg: 'rgba(245, 158, 11, 0.15)', tagColor: '#fbbf24'
    };
    return {
      bg: 'var(--color-red-bg)', border: 'var(--color-red)', color: 'var(--color-red)',
      icon: <XCircle size={20} />, label: 'Not Qualified',
      guidance: 'Lead has been disqualified manually or by score.',
      tagBg: 'rgba(239, 68, 68, 0.15)', tagColor: '#f87171'
    };
  };

  const verdictConfig = getVerdictConfig();

  const metrics = [
    { name: 'Authority',       score: authority || 0,       max: 40, color: 'var(--color-primary)' },
    { name: 'Intent',          score: intent || 0,          max: 25, color: 'var(--color-green)' },
    { name: 'Demo Commitment', score: demo_commitment || 0, max: 15, color: 'var(--color-amber)' },
    { name: 'Timeline',        score: timeline || 0,        max: 10, color: '#ec4899' },
    { name: 'Industry Fit',    score: industry_fit || 0,    max: 10, color: '#6366f1' },
  ];

  const handleDisqualify = async () => {
    if (!leadId) return;
    if (!disComment.trim()) {
      alert('Please provide a reason for disqualification.');
      return;
    }
    
    setIsDisqualifying(true);
    try {
      await axios.patch(`/api/leads/${leadId}`, {
        verdict: 'Not Qualified',
        score: 0,
        disqualificationComment: disComment
      });
      setCurrentVerdict('Not Qualified');
      setCurrentScore(0);
      setShowDisqualifyModal(false);
      onRefresh?.();
      alert('Lead has been disqualified.');
    } catch (err) {
      console.error('Disqualification failed:', err);
      alert('Failed to update lead status. Please try again.');
    } finally {
      setIsDisqualifying(false);
    }
  };

  const handleQualify = async () => {
    if (!leadId) return;
    if (!confirm('Are you sure you want to qualify this lead? This will mark it as Good to Go (SQL).')) return;
    
    setIsQualifying(true);
    const newScore = Math.max(score, 70);
    try {
      await axios.patch(`/api/leads/${leadId}`, {
        verdict: 'Good to Go (SQL)',
        score: newScore // Boost score to at least 70
      });
      setCurrentVerdict('Good to Go (SQL)');
      setCurrentScore(newScore);
      onRefresh?.();
      alert('Lead has been qualified.');
    } catch (err) {
      console.error('Qualification failed:', err);
      alert('Failed to update lead status. Please try again.');
    } finally {
      setIsQualifying(false);
    }
  };

  return (
    <div style={styles.wrapper}>

      {/* ── Lead Profile Card ────────────────────────── */}
      <div className="card fade-in" style={styles.profileCard}>
        <div style={{ 
          padding: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '32px',
          position: 'relative',
        }}>
          {/* Left Side: Profile & Details */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flex: '1 1 500px' }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ ...styles.avatarCircle, width: '64px', height: '64px', flexShrink: 0 }}
            >
              <span style={{ ...styles.avatarInitials, fontSize: '22px' }}>
                {leadData.firstName.charAt(0)}{leadData.lastName.charAt(0)}
              </span>
            </motion.div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <motion.h2 
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  style={{ ...styles.leadName, fontSize: '24px', margin: 0, fontWeight: '700' }}
                >
                  {leadData.firstName} {leadData.lastName}
                </motion.h2>
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px',
                  backgroundColor: verdictConfig.tagBg, color: verdictConfig.tagColor,
                  border: `1px solid ${verdictConfig.tagColor}30`,
                  padding: '4px 12px', borderRadius: '99px',
                  fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  {verdictConfig.icon}
                  <span>{verdictConfig.label}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={14} />
                  <span style={{ color: 'var(--color-text-main)' }}>{leadData.email}</span>
                  {emailStatus && (() => {
                    const GREEN = ['Valid', 'Safe to Send'];
                    const YELLOW = ['Unknown', 'Catch-All'];
                    const isGreen  = GREEN.includes(emailStatus);
                    const isYellow = YELLOW.includes(emailStatus);
                    const color  = isGreen ? '#4ade80' : isYellow ? '#fbbf24' : '#f87171';
                    return (
                      <span style={{ 
                        fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px',
                        backgroundColor: `${color}15`, color: color, border: `1px solid ${color}30`,
                        textTransform: 'uppercase'
                      }}>
                        {emailStatus}
                      </span>
                    );
                  })()}
                </div>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--color-border)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={14} />
                  <span style={{ color: 'var(--color-text-main)' }}>{leadData.phone}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {leadData.jobTitle && (
                  <span style={styles.metaChip}>
                    <User size={12} color="var(--color-primary)" /> {leadData.jobTitle}
                  </span>
                )}
                <span style={styles.metaChip}>
                  <Tag size={12} color="var(--color-primary)" /> {leadData.category}
                </span>
                <span style={styles.metaChip}>
                  <Users size={12} color="var(--color-primary)" /> {leadData.employeeCount} employees
                </span>
                {leadData.category?.toLowerCase() === 'hr' && analysisResult.icp_category && (
                  <span style={{ 
                    ...styles.metaChip, 
                    backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                    color: '#10b981', 
                    borderColor: 'rgba(16, 185, 129, 0.2)',
                    fontWeight: '700'
                  }}>
                    🎯 {analysisResult.icp_category}
                  </span>
                )}
                {leadData.category?.toLowerCase() === 'hr' && leadData.company && (
                  <span style={styles.metaChip}>
                    💼 <strong>Company:</strong> {leadData.company}
                  </span>
                )}
                {leadData.category?.toLowerCase() === 'hr' && leadData.industry && (
                  <span style={styles.metaChip}>
                    🏢 <strong>Industry:</strong> {leadData.industry}
                  </span>
                )}
                {leadData.aiProvider && (
                  <span style={{ ...styles.metaChip, background: 'rgba(139, 92, 246, 0.1)', color: 'var(--color-primary)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                    🤖 {leadData.aiProvider}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Aligned Score */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'flex-end',
            flex: '0 0 280px'
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                QA Score
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontSize: '32px', fontWeight: '700', color: 'var(--color-text-main)', lineHeight: 1 }}>
                  {currentScore}
                </span>
                <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--color-text-muted)', opacity: 0.6 }}>/100</span>
              </div>
            </div>

            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-bg-hover)', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${currentScore}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{
                  height: '100%',
                  backgroundColor: currentScore >= 70 ? 'var(--color-green)' : currentScore >= 50 ? 'var(--color-amber)' : 'var(--color-red)',
                  borderRadius: '99px'
                }} 
              />
            </div>
            
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'right', opacity: 0.8 }}>
              {verdictConfig.guidance}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ─────────────────────────────────── */}
      <div style={styles.tabBar}>
        {(['score', 'transcript'] as const).map(tab => {
          const isActive = activeTab === tab;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              ...styles.tabBtn,
              backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-bg-card)',
              color: isActive ? 'white' : 'var(--color-text-muted)',
              borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
              boxShadow: isActive ? '0 4px 12px rgba(139, 92, 246, 0.2)' : '0 2px 8px var(--color-shadow)',
            }}>
              {tab === 'score' ? <><BarChart3 size={16} /> Score Breakdown</> : <><MessageSquare size={16} /> Transcript</>}
            </button>
          );
        })}
      </div>

      {activeTab === 'score' ? (
        <div style={{ ...styles.tabContentGrid, alignItems: 'flex-start' }}>
          {/* ── LEFT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Metric bars */}
            <div className="card" style={{ ...styles.section }}>
              <h3 style={styles.sectionTitle}>Score Breakdown</h3>
              <div style={styles.metricsGrid}>
                {metrics.map(m => (
                  <div key={m.name} style={styles.metricRow}>
                    <div style={styles.metricLabelRow}>
                      <span style={styles.metricLabel}>{m.name}</span>
                      <span style={styles.metricValue}>{m.score}<span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>/{m.max}</span></span>
                    </div>
                    <div style={styles.barTrack}>
                      <div style={{
                        ...styles.barFill,
                        width: `${(m.score / m.max) * 100}%`,
                        backgroundColor: m.color,
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {leadData.category?.toLowerCase() === 'hr' && (leadData.company || leadData.industry) && (
                <div style={{
                  marginTop: '24px',
                  paddingTop: '20px',
                  borderTop: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>
                    HR Context Details
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {leadData.company && (
                      <div style={{
                        padding: '12px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--color-bg-hover)',
                        border: '1px solid var(--color-border)'
                      }}>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Company Name
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-main)' }}>
                          {leadData.company}
                        </div>
                      </div>
                    )}
                    {leadData.industry && (
                      <div style={{
                        padding: '12px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--color-bg-hover)',
                        border: '1px solid var(--color-border)'
                      }}>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Industry
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-main)' }}>
                          {leadData.industry}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CRM Push */}
            {leadId && (
              <div className="card" style={{ ...styles.section, border: '1px solid rgba(139, 92, 246, 0.2)', background: 'linear-gradient(to bottom right, var(--color-bg-card), rgba(139, 92, 246, 0.05))' }}>
                <div style={styles.crmHeader}>
                  <Database size={18} color="var(--color-primary)" />
                  <h3 style={styles.sectionTitle}>Push to HubSpot CRM</h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
                  Lead is saved locally. Click below to sync it to your HubSpot portal.
                </p>
                {pushStatus === 'success' || status === 'PUSHED_TO_CRM' ? (
                  <div style={styles.successBanner}>
                    <CheckCircle2 size={16} />
                    <span>{status === 'PUSHED_TO_CRM' ? 'This lead is already in your CRM' : 'Successfully pushed to HubSpot!'}</span>
                  </div>
                ) : (
                  <>
                    <button
                      disabled={pushStatus === 'pushing' || currentVerdict === 'Not Qualified'}
                      onClick={async () => {
                        setPushStatus('pushing');
                        try {
                          await axios.post(`/api/leads/${leadId}`);
                          setPushStatus('success');
                        } catch (err: any) {
                          setPushStatus('error');
                          setPushError(err.response?.data?.error || 'Failed to push to CRM');
                        }
                      }}
                      style={{ 
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px',
                        opacity: currentVerdict === 'Not Qualified' ? 0.6 : 1,
                        padding: '12px', borderRadius: '10px', fontWeight: '600',
                        backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', cursor: currentVerdict === 'Not Qualified' ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s', boxShadow: currentVerdict === 'Not Qualified' ? 'none' : '0 4px 12px rgba(139, 92, 246, 0.25)'
                      }}
                      onMouseOver={(e) => { if (currentVerdict !== 'Not Qualified') e.currentTarget.style.backgroundColor = 'var(--color-primary)'; }}
                    >
                      <Send size={15} />
                      {pushStatus === 'pushing' ? 'Pushing...' : 'Push to HubSpot CRM'}
                    </button>
                    {pushStatus === 'error' && (
                      <p style={{ color: 'var(--color-red)', fontSize: '12px', marginTop: '8px' }}>{pushError}</p>
                    )}
                    {currentVerdict === 'Not Qualified' && (
                      <p style={{ fontSize: '12px', color: 'var(--color-red)', marginTop: '8px', fontWeight: '500' }}>
                        🚫 This lead is disqualified and cannot be pushed to CRM.
                      </p>
                    )}
                    {currentVerdict === 'Borderline' && (
                      <p style={{ fontSize: '12px', color: 'var(--color-amber)', marginTop: '8px' }}>
                        ⚠️ Borderline lead — review manually before pushing.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Analyst Notes */}
            <div className="card" style={{ ...styles.section }}>
              <h3 style={styles.sectionTitle}>Analyst Notes</h3>
              <p style={styles.reasoning}>{reasoning}</p>
            </div>

            {/* Manual Decision Override */}
            {leadId && (
              <div className="card" style={{ ...styles.section }}>
                <h3 style={styles.sectionTitle}>Manual Decision Override</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Override AI verdict to force qualification or manually disqualify this lead.
                </p>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {currentVerdict !== 'Good to Go (SQL)' && (
                    <button 
                      onClick={handleQualify}
                      disabled={isQualifying}
                      style={{ 
                        flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s',
                        backgroundColor: 'transparent', color: 'var(--color-green)', border: '1px solid var(--color-green)',
                        boxShadow: '0 2px 8px var(--color-shadow)'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.1)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <CheckCircle2 size={16} />
                      {isQualifying ? 'Qualifying...' : 'Force Qualify'}
                    </button>
                  )}

                  {currentVerdict !== 'Not Qualified' && (
                    <button 
                      onClick={() => setShowDisqualifyModal(true)}
                      disabled={isDisqualifying}
                      style={{ 
                        flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s',
                        backgroundColor: 'transparent', color: 'var(--color-red)', border: '1px solid var(--color-red)',
                        boxShadow: '0 2px 8px var(--color-shadow)'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <XCircle size={16} />
                      {isDisqualifying ? 'Disqualifying...' : 'Disqualify Lead'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card fade-in" style={styles.transcriptBox}>
          <h3 style={{ ...styles.sectionTitle, marginBottom: '16px' }}>Call Transcript</h3>
          <p style={styles.transcriptText}>{transcript || 'No transcript available.'}</p>
        </div>
      )}

      {/* Reset */}
      <button onClick={onReset}
        style={{ 
           width: '100%', marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
           padding: '16px', borderRadius: '12px', border: '1px dashed var(--color-border)', backgroundColor: 'transparent',
           color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
        }}
        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
      >
        <RefreshCw size={16} /> Analyze Another Call
      </button>

      {/* Disqualification Modal */}
      {showDisqualifyModal && (
        <div style={styles.modalOverlay}>
          <div className="card fade-in" style={styles.modalContent}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: 'var(--color-red)' }}>
              <XCircle size={24} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Disqualify Lead</h3>
            </div>
            
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Please provide a reason why you are disqualifying <strong>{leadData.firstName} {leadData.lastName}</strong>. This will be saved in the database and export.
            </p>
            
            <textarea
              placeholder="Enter disqualification reason..."
              value={disComment}
              onChange={(e) => setDisComment(e.target.value)}
              style={styles.modalTextarea}
              autoFocus
            />
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button 
                className="secondary-button" 
                onClick={() => setShowDisqualifyModal(false)}
                style={{ flex: 1, backgroundColor: 'var(--color-bg-hover)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)' }}
              >
                Cancel
              </button>
              <button 
                className="primary-button" 
                onClick={handleDisqualify}
                disabled={isDisqualifying || !disComment.trim()}
                style={{ flex: 2, backgroundColor: 'var(--color-red)', borderColor: 'var(--color-red)', color: 'white' }}
              >
                {isDisqualifying ? 'Processing...' : 'Confirm Disqualification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: { maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0' },

  // Profile card
  profileCard: { 
    marginBottom: '24px', 
    borderRadius: '24px', 
    backgroundColor: 'var(--color-bg-card)', 
    border: '1px solid var(--color-border)',
    boxShadow: '0 20px 50px var(--color-shadow)',
    overflow: 'hidden'
  },
  avatarCircle: {
    width: '64px', height: '64px', borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--color-primary), #6366f1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
  },
  avatarInitials: { color: 'white', fontWeight: '700', fontSize: '22px', fontFamily: "'Outfit', sans-serif" },
  leadName: { fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: 'var(--color-text-main)', letterSpacing: '-0.5px' },
  leadMeta: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  metaChip: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg-hover)', borderRadius: '8px',
    padding: '5px 10px', border: '1px solid var(--color-border)',
  },
  verdictBadge: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px 20px', borderRadius: '99px', fontWeight: '800', fontSize: '14px',
    flexShrink: 0,
  },
  contactRow: { display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '4px' },
  contactItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--color-text-muted)' },
  emailBadge: {
    fontSize: '12px', fontWeight: '700', padding: '4px 10px',
    borderRadius: '6px', letterSpacing: '0.3px', marginLeft: '8px'
  },
  scoreStrip: {
    display: 'flex', alignItems: 'center', gap: '20px',
    padding: '16px 20px', backgroundColor: 'var(--color-bg-hover)',
    borderRadius: '16px', border: '1px solid var(--color-border)',
    width: '100%',
    backdropFilter: 'blur(10px)'
  },
  scoreBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '85px', borderRight: '1px solid var(--color-border)', paddingRight: '20px' },
  scoreNumber: { fontSize: '36px', fontWeight: '800', fontFamily: "'Outfit', sans-serif", color: 'var(--color-text-main)', lineHeight: 1, letterSpacing: '-1px' },
  scoreLabel: { fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginTop: '4px' },

  // Tab
  tabBar: {
    display: 'flex', gap: '16px',
    marginBottom: '24px',
  },
  tabBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '12px 24px', border: '1px solid var(--color-border)',
    borderRadius: '10px',
    fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
  },
  tabContentGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
    gap: '20px',
    alignItems: 'stretch'
  },
  actionContainer: {
    gridColumn: '1 / -1',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px',
    alignItems: 'stretch'
  },

  // Sections
  section: { marginBottom: '0', padding: '24px', borderRadius: '16px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', boxShadow: '0 8px 30px var(--color-shadow)' },
  sectionTitle: { fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: 'var(--color-text-main)', letterSpacing: '-0.3px' },

  // Metrics
  metricsGrid: { display: 'flex', flexDirection: 'column', gap: '14px' },
  metricRow: { display: 'flex', flexDirection: 'column', gap: '5px' },
  metricLabelRow: { display: 'flex', justifyContent: 'space-between' },
  metricLabel: { fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: '500' },
  metricValue: { fontSize: '13px', fontWeight: '700', color: 'var(--color-text-main)' },
  barTrack: { height: '7px', backgroundColor: 'var(--color-bg-hover)', borderRadius: '99px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '99px' },

  // Analyst Notes
  reasoning: { fontSize: '14px', lineHeight: '1.75', color: 'var(--color-text-muted)', whiteSpace: 'pre-wrap' },

  // CRM
  crmHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  successBanner: {
    display: 'flex', alignItems: 'center', gap: '8px',
    color: 'var(--color-green)', fontWeight: '600', fontSize: '14px',
    padding: '10px 14px', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px',
    border: '1px solid rgba(34, 197, 94, 0.2)'
  },

  // Transcript
  transcriptBox: { marginTop: '4px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', padding: '24px', borderRadius: '16px' },
  transcriptText: { fontSize: '14px', lineHeight: '1.8', color: 'var(--color-text-muted)', whiteSpace: 'pre-wrap' },

  // Modal Styles
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '20px', backdropFilter: 'blur(8px)'
  },
  modalContent: {
    width: '100%', maxWidth: '450px', padding: '24px', position: 'relative',
    backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
    borderRadius: '20px', boxShadow: '0 25px 50px -12px var(--color-shadow)'
  },
  modalTextarea: {
    width: '100%', height: '120px', padding: '12px', borderRadius: '8px',
    border: '1px solid var(--color-border)', fontSize: '14px', outline: 'none',
    backgroundColor: 'var(--color-bg-hover)', color: 'var(--color-text-main)',
    resize: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  }
};

export default Step3_Results;

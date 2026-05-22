'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import StepIndicator from '@/components/StepIndicator';
import Step1_Upload from '@/components/Step1_Upload';
import Step2_Processing from '@/components/Step2_Processing';
import Step3_Results from '@/components/Step3_Results';
import LeadDashboard from '@/components/LeadDashboard';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import Sidebar from '@/components/Sidebar';
import UserManagement from '@/components/UserManagement';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AIProvider, AnalysisResult, ProcessingState } from '@/types';
import { ArrowLeft } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Redirect agents to the intake form if they land on the home page
  React.useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'agent') {
      router.push('/agent');
    }
  }, [session, status, router]);

  const [activeView, setActiveView] = useState<'analytics' | 'dashboard' | 'analyzer' | 'details' | 'users'>('analytics');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('groq');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [manualTranscript, setManualTranscript] = useState('');
  const [useManualTranscript, setUseManualTranscript] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLeadStatus, setSelectedLeadStatus] = useState<string | null>(null);
  const [leadData, setLeadData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '+1',
    category: 'Other',
    employeeCount: '',
    jobTitle: '',
    aiProvider: '',
  });
  const [processingState, setProcessingState] = useState<ProcessingState>({
    type: '',
    progress: 0,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isAnalyzing = useRef(false);

  const handleBackToDashboard = () => {
    setActiveView('dashboard');
    resetApp();
  };

  const handleAnalyzeFromDashboard = (lead: any) => {
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
    setActiveView('analyzer');
    setCurrentStep(1);
  };

  const handleCancelProcessing = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    resetApp();
  };

  const handleStartAnalysis = async () => {
    if (isAnalyzing.current) return;
    isAnalyzing.current = true;

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setCurrentStep(2);
    setProcessingState({ type: 'initializing', progress: 0, error: null });

    let finalTranscript = '';

    try {
      // 0. Pre-analysis check to ensure no lead with this email already exists in the system (Manual Entry only)
      if (!selectedLeadId) {
        setProcessingState({ type: 'initializing', progress: 10, error: null });
        const normalizedEmail = leadData.email.trim().toLowerCase();
        
        // Query to check if lead already exists
        const checkRes = await axios.get(`/api/leads?q=${encodeURIComponent(leadData.email.trim())}`, { signal });
        const results = checkRes.data;
        
        const exists = Array.isArray(results) && results.some(
          (l: any) => l.email.trim().toLowerCase() === normalizedEmail
        );
        
        if (exists) {
          setProcessingState({
            type: '',
            progress: 0,
            error: 'A lead with this email already exists. Please search and select it instead.'
          });
          return;
        }
      }

      // 1. Transcribe
      setProcessingState({ type: 'transcribing', progress: 0, error: null });
      if (useManualTranscript) {
        finalTranscript = manualTranscript;
        setTranscript(finalTranscript);
      } else {
        if (!audioFile) throw new Error("No audio file selected");
        
        setProcessingState({ type: 'transcribing', progress: 10, error: null });
        
        const formData = new FormData();
        formData.append('audio', audioFile);

        const transResponse = await axios.post('/api/transcribe', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          signal,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setProcessingState(prev => ({ ...prev, progress: Math.min(percentCompleted, 90) }));
            }
          },
        });

        finalTranscript = transResponse.data.transcript;
        setTranscript(finalTranscript);
        setProcessingState({ type: 'transcribing', progress: 100, error: null });
      }

      // 2. Transition to scoring
      if (signal.aborted) return;

      setProcessingState({ type: 'scoring', progress: 20, error: null });
      
      const scoreResponse = await axios.post('/api/score', {
        transcript: finalTranscript,
        provider: selectedProvider,
        leadId: selectedLeadId,
        ...leadData
      }, { signal });

      const analysisData = scoreResponse.data;
      setProcessingState({ type: 'scoring', progress: 100, error: null });

      // 3. Save to Database
      if (signal.aborted) return;

      setProcessingState({ type: 'saving', progress: 100, error: null });

      // Ensure the total score saved to DB matches the sum of its parts
      const nAuthority = Number(analysisData.authority) || 0;
      const nIntent = Number(analysisData.intent) || 0;
      const nDemo = Number(analysisData.demo_commitment) || 0;
      const nTimeline = Number(analysisData.timeline) || 0;
      const nIndustry = Number(analysisData.industry_fit) || 0;

      const calculatedScore = nAuthority + nIntent + nDemo + nTimeline + nIndustry;
      
      const normalizedData = {
        ...analysisData,
        authority: nAuthority,
        intent: nIntent,
        demo_commitment: nDemo,
        timeline: nTimeline,
        industry_fit: nIndustry,
        score: calculatedScore > 0 ? calculatedScore : (Number(analysisData.score) || 0)
      };

      setAnalysisResult(normalizedData);

      let leadResponse;

      if (selectedLeadId) {
        // UPDATE existing lead with analysis results
        leadResponse = await axios.patch(`/api/leads/${selectedLeadId}`, {
          transcript: finalTranscript,
          ...normalizedData,
          status: 'ANALYZED',
          aiProvider: selectedProvider,
        }, { signal });
      } else {
        // CREATE new lead with all data
        leadResponse = await axios.post('/api/leads', {
          ...leadData,
          transcript: finalTranscript,
          ...normalizedData,
          status: 'ANALYZED',
          aiProvider: selectedProvider,
          addedBy: session?.user?.name || 'Unknown',
        }, { signal });
      }
      
      setLeadData(prev => ({ ...prev, aiProvider: selectedProvider }));
      setLeadId(leadResponse.data.id);
      setEmailStatus(leadResponse.data.emailStatus ?? null);

      // Move to results and refresh dashboard
      setRefreshTrigger(prev => prev + 1);
      setCurrentStep(3);
    } catch (error: any) {
      if (axios.isCancel(error)) {
        console.log('Analysis canceled by user');
        return;
      }
      console.error('App Pipeline Error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'An unexpected error occurred';
      setProcessingState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      isAnalyzing.current = false;
    }
  };

  const resetApp = () => {
    setCurrentStep(1);
    setAudioFile(null);
    setManualTranscript('');
    setUseManualTranscript(false);
    setTranscript('');
    setAnalysisResult(null);
    setProcessingState({ type: '', progress: 0, error: null });
    setLeadId(null);
    setEmailStatus(null);
    setSelectedLeadId(null);
    setSelectedLeadStatus(null);
  };

  const handleViewDetails = (lead: any) => {
    setSelectedLeadId(lead.id);
    setSelectedLeadStatus(lead.status);
    setAnalysisResult({
      verdict: lead.verdict,
      score: lead.score,
      reasoning: lead.reasoning,
      intent: lead.intent,
      authority: lead.authority,
      demo_commitment: lead.demo_commitment,
      timeline: lead.timeline,
      industry_fit: lead.industry_fit,
      risk_level: lead.risk_level,
    });
    setTranscript(lead.transcript || '');
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
    setLeadId(lead.id);
    setActiveView('details');
  };

  const sidebarWidth = isSidebarCollapsed ? '80px' : '260px';

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar 
        activeView={activeView === 'details' ? 'analyzer' : (activeView as any)} 
        onViewChange={setActiveView as any} 
        userName={session?.user?.name}
        role={(session?.user as any)?.role}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      
      <motion.div 
        className="container" 
        initial={false}
        animate={{ 
          marginLeft: isSidebarCollapsed ? 80 : 260,
          maxWidth: isSidebarCollapsed ? 'calc(100vw - 80px)' : 'calc(100vw - 260px)'
        }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        style={{ 
          flex: 1, 
          overflowX: 'hidden',
          paddingTop: activeView === 'details' ? '20px' : undefined
        }}
      >
        <header style={{ 
          marginBottom: (activeView === 'dashboard' || activeView === 'analytics' || activeView === 'analyzer') ? '0' : '24px',
          marginTop: 0 
        }}>
          {(activeView !== 'dashboard' && activeView !== 'analytics' && activeView !== 'analyzer') && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '0 32px', 
              marginBottom: '32px' 
            }}>
              <button 
                onClick={handleBackToDashboard}
                style={{
                  background: 'var(--color-bg-card)', 
                  border: '1px solid var(--color-border)', 
                  borderRadius: '10px', 
                  color: 'var(--color-text-muted)', 
                  fontWeight: '600', 
                  fontSize: '13px', 
                  cursor: 'pointer', 
                  padding: '10px 16px',
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px var(--color-shadow)'
                }}
                onMouseOver={(e) => { 
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; 
                  e.currentTarget.style.color = 'var(--color-primary)'; 
                  e.currentTarget.style.borderColor = 'var(--color-primary-light)';
                }}
                onMouseOut={(e) => { 
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-card)'; 
                  e.currentTarget.style.color = 'var(--color-text-muted)'; 
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }}
              >
                <ArrowLeft size={16} /> 
                <span>Back</span>
              </button>

              <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-main)', margin: 0, letterSpacing: '-0.5px' }}>
                {activeView === 'details' ? '' : 'Call Quality Analyzer'}
              </h1>

              <div style={{ width: '160px' }}></div> {/* Spacer for centering */}
            </div>
          )}

          {activeView === 'analyzer' && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <StepIndicator 
                  currentStep={currentStep} 
                  onStepClick={(step) => {
                    if (step === 1 && currentStep > 1) {
                      handleCancelProcessing();
                    }
                  }}
                />
            </div>
          )}
        </header>

        <main>
          {/* Analytics & Leads are always mounted but hidden via CSS — prevents re-fetching */}
          <div style={{ display: activeView === 'analytics' ? 'block' : 'none' }}>
            <AnalyticsDashboard isVisible={activeView === 'analytics'} refreshTrigger={refreshTrigger} isCollapsed={isSidebarCollapsed} />
          </div>
          <div style={{ display: activeView === 'dashboard' ? 'block' : 'none' }}>
            <LeadDashboard 
              onAnalyze={handleAnalyzeFromDashboard} 
              onViewDetails={handleViewDetails} 
              refreshTrigger={refreshTrigger}
            />
          </div>

          {activeView === 'users' && (
            <UserManagement />
          )}

          {activeView === 'details' && (
            <Step3_Results
              analysisResult={analysisResult!}
              transcript={transcript}
              onReset={handleBackToDashboard}
              onRefresh={() => setRefreshTrigger(prev => prev + 1)}
              leadId={leadId}
              leadData={leadData}
              emailStatus={emailStatus}
              status={selectedLeadStatus || undefined}
            />
          )}

          {activeView === 'analyzer' && (
            <>
              {currentStep === 1 && (
                <Step1_Upload
                  audioFile={audioFile}
                  setAudioFile={setAudioFile}
                  selectedProvider={selectedProvider}
                  setSelectedProvider={setSelectedProvider}
                  manualTranscript={manualTranscript}
                  setManualTranscript={setManualTranscript}
                  useManualTranscript={useManualTranscript}
                  setUseManualTranscript={setUseManualTranscript}
                  onStart={handleStartAnalysis}
                  leadData={leadData}
                  setLeadData={setLeadData}
                  selectedLeadId={selectedLeadId}
                  setSelectedLeadId={setSelectedLeadId}
                  selectedLeadStatus={selectedLeadStatus}
                  setSelectedLeadStatus={setSelectedLeadStatus}
                />
              )}

              {currentStep === 2 && (
                <Step2_Processing
                  processingState={processingState}
                  onRetry={handleCancelProcessing}
                  onCancel={handleCancelProcessing}
                />
              )}

              {currentStep === 3 && analysisResult && (
                <Step3_Results
                  analysisResult={analysisResult}
                  transcript={transcript}
                  onReset={resetApp}
                  onRefresh={() => setRefreshTrigger(prev => prev + 1)}
                  leadId={leadId}
                  leadData={leadData}
                  emailStatus={emailStatus}
                />
              )}
            </>
          )}
        </main>


      </motion.div>
    </div>
  );
}


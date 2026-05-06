'use client';

import React, { useState, useRef } from 'react';
import axios from 'axios';
import StepIndicator from '@/components/StepIndicator';
import Step1_Upload from '@/components/Step1_Upload';
import Step2_Processing from '@/components/Step2_Processing';
import Step3_Results from '@/components/Step3_Results';
import LeadDashboard from '@/components/LeadDashboard';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import Sidebar from '@/components/Sidebar';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AIProvider, AnalysisResult, ProcessingState } from '@/types';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Redirect agents to the intake form if they land on the home page
  React.useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'agent') {
      router.push('/agent');
    }
  }, [session, status, router]);

  const [activeView, setActiveView] = useState<'analytics' | 'dashboard' | 'analyzer' | 'details'>('analytics');
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
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setCurrentStep(2);
    setProcessingState({ type: 'transcribing', progress: 0, error: null });

    let finalTranscript = '';

    try {
      // 1. Transcribe
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
      await new Promise(resolve => setTimeout(resolve, 800));
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
      await new Promise(resolve => setTimeout(resolve, 800));
      if (signal.aborted) return;

      setProcessingState({ type: 'saving', progress: 100, error: null });

      // Ensure the total score saved to DB matches the sum of its parts
      const calculatedScore = (analysisData.authority || 0) + 
                             (analysisData.intent || 0) + 
                             (analysisData.demo_commitment || 0) + 
                             (analysisData.timeline || 0) + 
                             (analysisData.industry_fit || 0);
      
      const normalizedData = {
        ...analysisData,
        score: calculatedScore > 0 ? calculatedScore : analysisData.score
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

      // Move to results
      setCurrentStep(3);
    } catch (error: any) {
      if (axios.isCancel(error)) {
        console.log('Analysis canceled by user');
        return;
      }
      console.error('App Pipeline Error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'An unexpected error occurred';
      setProcessingState(prev => ({ ...prev, error: errorMessage }));
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
        activeView={activeView === 'details' ? 'analyzer' : activeView} 
        onViewChange={setActiveView} 
        userName={session?.user?.name}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      
      <div 
        className="container" 
        style={{ 
          marginLeft: sidebarWidth, 
          flex: 1, 
          maxWidth: `calc(100vw - ${sidebarWidth})`,
          overflowX: 'hidden',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <header style={{ 
          textAlign: 'center', 
          marginBottom: (activeView === 'dashboard' || activeView === 'analytics') ? '0' : '40px',
          marginTop: (activeView === 'dashboard' || activeView === 'analytics') ? '20px' : '0' 
        }}>
          {(activeView !== 'dashboard' && activeView !== 'analytics') && (
            <h1 className="outfit-font" style={{ fontSize: '32px', fontWeight: '800', marginBottom: '16px', color: 'var(--color-text-main)' }}>
              {activeView === 'details' ? 'Lead Analysis Details' : 'Call Quality Analyzer'}
            </h1>
          )}

          {(activeView !== 'dashboard' && activeView !== 'analytics') && (
            <div style={{ marginBottom: '32px' }}>
              <button 
                onClick={handleBackToDashboard}
                style={{
                  background: 'none', border: 'none', color: 'var(--color-purple)', 
                  fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '6px'
                }}
              >
                ← Back to Dashboard
              </button>
              {activeView === 'analyzer' && (
                <StepIndicator 
                  currentStep={currentStep} 
                  onStepClick={(step) => {
                    if (step === 1 && currentStep > 1) {
                      handleCancelProcessing();
                    }
                  }}
                />
              )}
            </div>
          )}
        </header>

        <main>
          {/* Analytics & Leads are always mounted but hidden via CSS — prevents re-fetching */}
          <div style={{ display: activeView === 'analytics' ? 'block' : 'none' }}>
            <AnalyticsDashboard isVisible={activeView === 'analytics'} refreshTrigger={refreshTrigger} />
          </div>
          <div style={{ display: activeView === 'dashboard' ? 'block' : 'none' }}>
            <LeadDashboard 
              onAnalyze={handleAnalyzeFromDashboard} 
              onViewDetails={handleViewDetails} 
              refreshTrigger={refreshTrigger}
            />
          </div>

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

        <footer style={{ marginTop: '80px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          <p>A product by x-engage</p>
        </footer>
      </div>
    </div>
  );
}

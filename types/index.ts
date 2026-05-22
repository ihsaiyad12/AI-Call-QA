export type AIProvider = 'groq' | 'gemini' | 'openai' | 'claude';

export interface AnalysisResult {
  verdict: 'Good to Go (SQL)' | 'Borderline' | 'Not Qualified';
  score: number;
  intent?: number;
  authority?: number;
  demo_commitment?: number;
  timeline?: number;
  industry_fit?: number;
  reasoning: string;
  risk_level?: 'Low' | 'Medium' | 'High';
  icp_category?: string | null;
}

export interface ProcessingState {
  type: 'initializing' | 'transcribing' | 'scoring' | 'saving' | '';
  progress: number;
  error: string | null;
}

export interface LeadData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  category: string;
  employeeCount: string;
  jobTitle: string;
  company?: string | null;
  industry?: string | null;
}

export interface LeadRecord extends LeadData {
  id: string;
  transcript?: string;
  verdict?: string | null;
  score?: number;
  reasoning?: string;
  intent?: number;
  authority?: number;
  demo_commitment?: number;
  timeline?: number;
  industry_fit?: number;
  risk_level?: 'Low' | 'Medium' | 'High';
  icp_category?: string | null;
  status: 'PENDING' | 'ANALYZED' | 'PUSHED_TO_CRM';
  disqualificationComment?: string;
  emailStatus?: string | null;
  emailStatusRaw?: string | null;
  aiProvider?: string;
  addedBy?: string;
  createdAtEST?: string;
  createdAt: string;
  updatedAt: string;
}

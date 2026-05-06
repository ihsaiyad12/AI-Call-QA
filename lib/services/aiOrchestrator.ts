import { scoreWithGroq, scoreWithGemini, scoreWithOpenAI, scoreWithClaude } from './aiProviders';
import { AIProvider, AnalysisResult, LeadData } from '@/types';

export const PROVIDERS: Record<string, AIProvider> = {
  GROQ: 'groq',
  GEMINI: 'gemini',
  OPENAI: 'openai',
  CLAUDE: 'claude',
};

export const scoreCall = async (
  transcript: string,
  provider: AIProvider,
  leadData?: Partial<LeadData>
): Promise<AnalysisResult> => {
  switch (provider) {
    case PROVIDERS.GROQ:
      return await scoreWithGroq(transcript, leadData);
    case PROVIDERS.GEMINI:
      return await scoreWithGemini(transcript, leadData);
    case PROVIDERS.OPENAI:
      return await scoreWithOpenAI(transcript, leadData);
    case PROVIDERS.CLAUDE:
      return await scoreWithClaude(transcript, leadData);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
};

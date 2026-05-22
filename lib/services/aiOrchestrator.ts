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
  let result: AnalysisResult;

  switch (provider) {
    case PROVIDERS.GROQ:
      result = await scoreWithGroq(transcript, leadData);
      break;
    case PROVIDERS.GEMINI:
      result = await scoreWithGemini(transcript, leadData);
      break;
    case PROVIDERS.OPENAI:
      result = await scoreWithOpenAI(transcript, leadData);
      break;
    case PROVIDERS.CLAUDE:
      result = await scoreWithClaude(transcript, leadData);
      break;
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }

  // Prepend the ICP category to analyst notes (reasoning) for HR campaigns
  if (leadData?.category?.toLowerCase() === 'hr') {
    const icp = result.icp_category || 'No ICP Match';
    if (!result.icp_category) {
      result.icp_category = icp;
    }
    const prefix = `Lead falls under: ${icp}. `;
    if (result.reasoning) {
      if (!result.reasoning.includes('Lead falls under:')) {
        result.reasoning = `${prefix}${result.reasoning}`;
      }
    } else {
      result.reasoning = prefix;
    }
  }

  return result;
};

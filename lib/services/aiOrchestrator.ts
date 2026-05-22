import { scoreWithGroq, scoreWithGemini, scoreWithOpenAI, scoreWithClaude } from './aiProviders';
import { AIProvider, AnalysisResult, LeadData } from '@/types';

export const PROVIDERS: Record<string, AIProvider> = {
  GROQ: 'groq',
  GEMINI: 'gemini',
  OPENAI: 'openai',
  CLAUDE: 'claude',
};

const getExpectedIcpFromIndustry = (industry?: string | null): string | null => {
  if (!industry) return null;
  const ind = industry.toLowerCase().trim();

  // ICP 1: Fintech, Consulting, HR Services, SaaS
  if (
    ind.includes('fintech') ||
    ind.includes('consult') ||
    ind.includes('hr service') ||
    ind.includes('saas') ||
    ind.includes('software') ||
    ind.includes('tech')
  ) {
    return 'ICP 1';
  }

  // ICP 2: Marketing Agencies, Esports, Call Centers, Gaming
  if (
    ind.includes('marketing') ||
    ind.includes('agency') ||
    ind.includes('agencies') ||
    ind.includes('esport') ||
    ind.includes('call center') ||
    ind.includes('gaming')
  ) {
    return 'ICP 2';
  }

  // ICP 3: Restaurants, Retail, Manufacturing
  if (
    ind.includes('restaurant') ||
    ind.includes('retail') ||
    ind.includes('manufacturing') ||
    ind.includes('factory') ||
    ind.includes('food') ||
    ind.includes('beverage')
  ) {
    return 'ICP 3';
  }

  // ICP 4: Nursing Homes, Home Healthcare, Rehab Facilities
  if (
    ind.includes('nursing') ||
    ind.includes('healthcare') ||
    ind.includes('health care') ||
    ind.includes('rehab') ||
    ind.includes('medical') ||
    ind.includes('hospital') ||
    ind.includes('health') ||
    ind.includes('clinic') ||
    ind.includes('care')
  ) {
    return 'ICP 4';
  }

  return null;
};

const checkSizeForIcp = (size: number, icp: string): { isWithin: boolean; limitText: string } => {
  const icpUpper = icp.toUpperCase();
  if (icpUpper.includes('ICP 1')) {
    return { isWithin: (size >= 50 && size <= 2000), limitText: '50–2000 employees' };
  }
  if (icpUpper.includes('ICP 2')) {
    return { isWithin: (size >= 1 && size <= 100), limitText: 'Up to 100 employees' };
  }
  if (icpUpper.includes('ICP 3')) {
    return { isWithin: (size >= 21 && size <= 200), limitText: '21–200 employees' };
  }
  if (icpUpper.includes('ICP 4')) {
    return { isWithin: (size >= 50 && size <= 500), limitText: '50–500 employees' };
  }
  return { isWithin: (size >= 1 && size <= 2000), limitText: '1–2000 employees' };
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
    
    // Check company size matching the classified ICP requirements
    const sizeStr = String(leadData?.employeeCount || '').trim();
    const size = parseInt(sizeStr, 10);
    
    let isWithinLimits = true;
    let disqualificationNote = '';

    const icpUpper = icp.toUpperCase();
    const isNoMatch = icpUpper.includes('NO ICP') || icpUpper.includes('NONE') || icpUpper.includes('NOT MATCH');

    if (isNoMatch) {
      isWithinLimits = false;
      disqualificationNote = `\n\n[AUTO-DISQUALIFIED] Lead disqualified programmatically: No matching ICP category was identified for this lead.`;
    } else if (!isNaN(size)) {
      // 1. Validate against the AI's classified ICP
      const classifiedCheck = checkSizeForIcp(size, icp);
      
      // 2. Validate against the expected ICP based on lead's industry
      const expectedIcp = getExpectedIcpFromIndustry(leadData?.industry);
      
      if (expectedIcp && expectedIcp !== icp) {
        // Mismatch between classified ICP and industry expected ICP!
        // This means the AI is either incorrect or gaming the classification.
        isWithinLimits = false;
        const expectedCheck = checkSizeForIcp(size, expectedIcp);
        disqualificationNote = `\n\n[AUTO-DISQUALIFIED] Lead disqualified programmatically: Expected ${expectedIcp} based on industry "${leadData?.industry || 'N/A'}", but AI classified it as ${icp}. Company size of ${size} employees is outside the limits of ${expectedCheck.limitText} for the expected ${expectedIcp}.`;
      } else if (!classifiedCheck.isWithin) {
        isWithinLimits = false;
        disqualificationNote = `\n\n[AUTO-DISQUALIFIED] Lead disqualified programmatically: Company size of ${size} employees is outside the specified limits for ${icp} (${classifiedCheck.limitText}).`;
      } else if (expectedIcp) {
        // Industry expected ICP matches classified ICP, double check limits just to be sure
        const expectedCheck = checkSizeForIcp(size, expectedIcp);
        if (!expectedCheck.isWithin) {
          isWithinLimits = false;
          disqualificationNote = `\n\n[AUTO-DISQUALIFIED] Lead disqualified programmatically: Company size of ${size} employees is outside the specified limits for expected ${expectedIcp} (${expectedCheck.limitText}).`;
        }
      }
    }

    if (!isWithinLimits) {
      // Force disqualification programmatically
      result.verdict = 'Not Qualified';
      result.score = 0;
      result.intent = 0;
      result.authority = 0;
      result.demo_commitment = 0;
      result.timeline = 0;
      result.industry_fit = 0;
      
      if (result.reasoning) {
        if (!result.reasoning.includes('[AUTO-DISQUALIFIED]')) {
          result.reasoning += disqualificationNote;
        }
      } else {
        result.reasoning = disqualificationNote.trim();
      }
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

  // Prepend minimum company size check for LMS campaigns (minimum 51 employees)
  if (leadData?.category?.toLowerCase() === 'lms') {
    const sizeStr = String(leadData?.employeeCount || '').trim();
    const size = parseInt(sizeStr, 10);

    if (!isNaN(size) && size < 51) {
      result.verdict = 'Not Qualified';
      result.score = 0;
      result.intent = 0;
      result.authority = 0;
      result.demo_commitment = 0;
      result.timeline = 0;
      result.industry_fit = 0;

      const lmsNote = `\n\n[AUTO-DISQUALIFIED] Lead disqualified programmatically: Company size of ${size} employees is below the minimum required limit of 51 employees for the LMS category.`;
      
      if (result.reasoning) {
        if (!result.reasoning.includes('[AUTO-DISQUALIFIED]')) {
          result.reasoning += lmsNote;
        }
      } else {
        result.reasoning = lmsNote.trim();
      }
    }
  }

  return result;
};

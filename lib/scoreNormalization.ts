import { AnalysisResult } from '@/types';

const SCORE_CAPS = {
  authority: 40,
  intent: 25,
  demo_commitment: 15,
  timeline: 10,
  industry_fit: 10,
} as const;

type Verdict = AnalysisResult['verdict'];

export const normalizeVerdict = (verdict: string | null | undefined): Verdict | undefined => {
  if (!verdict) return undefined;

  const lower = verdict.toLowerCase().trim();
  if (lower.includes('good to go') || lower.includes('sql')) return 'Good to Go (SQL)';
  if (lower.includes('borderline') || lower.includes('manual review')) return 'Borderline';
  if (lower.includes('not qualified') || lower.includes('disqualified')) return 'Not Qualified';

  return undefined;
};

const normalizeMetric = (value: unknown, max: number): number => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.min(max, Math.max(0, Math.round(numericValue)));
};

const appendNormalizationNote = (reasoning: string, note: string): string => {
  if (reasoning.includes(note)) return reasoning;
  return `${reasoning}${reasoning ? ' ' : ''}${note}`.trim();
};

export const normalizeAnalysisResult = (result: Partial<AnalysisResult>): AnalysisResult => {
  const authority = normalizeMetric(result.authority, SCORE_CAPS.authority);
  const intent = normalizeMetric(result.intent, SCORE_CAPS.intent);
  const demo_commitment = normalizeMetric(result.demo_commitment, SCORE_CAPS.demo_commitment);
  const timeline = normalizeMetric(result.timeline, SCORE_CAPS.timeline);
  const industry_fit = normalizeMetric(result.industry_fit, SCORE_CAPS.industry_fit);
  const componentTotal = authority + intent + demo_commitment + timeline + industry_fit;
  const requestedVerdict = normalizeVerdict(result.verdict);
  let reasoning = typeof result.reasoning === 'string' ? result.reasoning.trim() : '';

  const hasHardDisqualification =
    requestedVerdict === 'Not Qualified' ||
    industry_fit === 0 ||
    demo_commitment === 0 ||
    componentTotal < 40;

  if (hasHardDisqualification) {
    return {
      ...result,
      verdict: 'Not Qualified',
      score: 0,
      authority,
      intent,
      demo_commitment,
      timeline,
      industry_fit,
      reasoning,
    };
  }

  const passesSqlGates =
    authority >= 30 &&
    intent >= 20 &&
    demo_commitment >= 5 &&
    timeline >= 5 &&
    industry_fit >= 5 &&
    componentTotal >= 70;

  if (passesSqlGates) {
    return {
      ...result,
      verdict: 'Good to Go (SQL)',
      score: Math.min(100, Math.max(70, componentTotal)),
      authority,
      intent,
      demo_commitment,
      timeline,
      industry_fit,
      reasoning,
    };
  }

  reasoning = appendNormalizationNote(
    reasoning,
    'Normalized to Borderline because one or more SQL gates were not met.'
  );

  return {
    ...result,
    verdict: 'Borderline',
    score: Math.min(69, Math.max(50, componentTotal)),
    authority,
    intent,
    demo_commitment,
    timeline,
    industry_fit,
    reasoning,
  };
};

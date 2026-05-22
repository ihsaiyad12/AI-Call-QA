import { NextRequest, NextResponse } from 'next/server';
import { scoreCall } from '@/lib/services/aiOrchestrator';
import { z } from 'zod';
import db from '@/lib/db';
import { LeadData } from '@/types';

const scoreSchema = z.object({
  transcript: z.string().min(1, "Transcript cannot be empty"),
  provider: z.enum(['groq', 'gemini', 'openai', 'claude']),
  leadId: z.string().nullish().transform(v => v ?? undefined),
  firstName: z.string().nullish().transform(v => v ?? undefined),
  lastName: z.string().nullish().transform(v => v ?? undefined),
  email: z.string().nullish().transform(v => v ?? undefined),
  phone: z.string().nullish().transform(v => v ?? undefined),
  jobTitle: z.string().nullish().transform(v => v ?? undefined),
  category: z.string().nullish().transform(v => v ?? undefined),
  employeeCount: z.string().nullish()
    .or(z.number().transform(n => String(n)))
    .transform(v => v ?? undefined),
  company: z.string().nullish().transform(v => v ?? undefined),
  industry: z.string().nullish().transform(v => v ?? undefined),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[api/score] Received request body keys:', Object.keys(body));

    const validation = scoreSchema.safeParse(body);
    if (!validation.success) {
      console.error('[api/score] Validation failed:', validation.error.format());
      return NextResponse.json({
        error: 'Invalid request data',
        details: validation.error.format(),
        message: validation.error.issues[0]?.message || 'Validation failed'
      }, { status: 400 });
    }

    const { 
      transcript, 
      provider, 
      leadId, 
      jobTitle, 
      category,
      firstName,
      lastName,
      email,
      phone,
      employeeCount,
      company,
      industry
    } = validation.data;

    let enrichedLeadData: Partial<LeadData> = {
      jobTitle,
      category,
      firstName,
      lastName,
      email,
      phone,
      employeeCount,
      company,
      industry
    };

    // If leadId is provided, fetch latest data from DB to ensure accuracy
    if (leadId) {
      try {
        const lead = await db.lead.findUnique(leadId);
        if (lead) {
          enrichedLeadData = {
            ...enrichedLeadData,
            firstName: lead.firstName || enrichedLeadData.firstName,
            lastName: lead.lastName || enrichedLeadData.lastName,
            email: lead.email || enrichedLeadData.email,
            phone: lead.phone || enrichedLeadData.phone,
            jobTitle: lead.jobTitle || enrichedLeadData.jobTitle,
            category: lead.category || enrichedLeadData.category,
            employeeCount: lead.employeeCount || enrichedLeadData.employeeCount,
            company: lead.company || enrichedLeadData.company,
            industry: lead.industry || enrichedLeadData.industry,
          };
        }
      } catch (err) {
        console.error(`[score] Failed to fetch lead ${leadId}:`, err);
      }
    }

    console.log(`[score] category=${enrichedLeadData.category} provider=${provider} lead=${enrichedLeadData.firstName} ${enrichedLeadData.lastName}`);
    const result = await scoreCall(transcript, provider, enrichedLeadData);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Scoring API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

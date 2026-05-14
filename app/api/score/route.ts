import { NextRequest, NextResponse } from 'next/server';
import { scoreCall } from '@/lib/services/aiOrchestrator';
import { z } from 'zod';
import db from '@/lib/db';
import { LeadData } from '@/types';

const scoreSchema = z.object({
  transcript: z.string().min(1, "Transcript is required"),
  provider: z.enum(['groq', 'gemini', 'openai', 'claude']),
  leadId: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  employeeCount: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = scoreSchema.safeParse(body);
    if (!validation.success) {
      console.error('[score] Validation failed:', JSON.stringify(validation.error.format(), null, 2));
      return NextResponse.json({
        error: 'Invalid request data',
        details: validation.error.format()
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
      employeeCount
    } = validation.data;

    let enrichedLeadData: Partial<LeadData> = {
      jobTitle: jobTitle || undefined,
      category: category || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: email || undefined,
      phone: phone || undefined,
      employeeCount: employeeCount || undefined
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

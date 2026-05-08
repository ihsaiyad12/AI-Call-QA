import { NextResponse } from 'next/server';
import db from '@/lib/db';
import axios from 'axios';

const HUBSPOT_PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;
const HUBSPOT_FORM_GUID = process.env.HUBSPOT_FORM_GUID;

/**
 * GET /api/leads/[id]
 * Fetch a single lead by ID.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await db.lead.findUnique(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error: any) {
    console.error('Get Lead Error:', error);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}

/**
 * PATCH /api/leads/[id]
 * Updates an existing lead with analysis results.
 * Used when the analyzer selects an existing lead from search.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { 
      transcript, verdict: rawVerdict, score, reasoning, status, aiProvider,
      intent, authority, demo_commitment, timeline, industry_fit, risk_level
    } = body;

    // Normalize verdict to exact DB enum values
    const normalizeVerdict = (v: string | null | undefined): string | undefined => {
      if (!v) return undefined;
      const lower = v.toLowerCase().trim();
      if (lower.includes('good to go') || lower.includes('sql')) return 'Good to Go (SQL)';
      if (lower.includes('borderline')) return 'Borderline';
      if (lower.includes('not qualified') || lower.includes('disqualified')) return 'Not Qualified';
      return v;
    };

    const verdict = normalizeVerdict(rawVerdict);

    // Ensure all metrics are numbers for the database and for calculation
    const nIntent = Number(intent) || 0;
    const nAuthority = Number(authority) || 0;
    const nDemo = Number(demo_commitment) || 0;
    const nTimeline = Number(timeline) || 0;
    const nIndustry = Number(industry_fit) || 0;

    // Ensure score matches sum of sub-metrics
    const calculatedScore = nIntent + nAuthority + nDemo + nTimeline + nIndustry;
    const finalScore = calculatedScore > 0 ? calculatedScore : (Number(score) || 0);

    // Normalize AI provider
    const finalAiProvider = aiProvider || undefined; // Don't overwrite with null if missing in update

    const updated = await db.lead.update(id, {
      transcript,
      verdict,
      score: finalScore,
      reasoning,
      intent: nIntent,
      authority: nAuthority,
      demo_commitment: nDemo,
      timeline: nTimeline,
      industry_fit: nIndustry,
      risk_level,
      status: status || 'ANALYZED',
      aiProvider: finalAiProvider
    });

    if (!updated) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update Lead Error:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

/**
 * DELETE /api/leads/[id]
 * Deletes a lead by ID.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    const deletedLead = await db.lead.delete(id);

    if (!deletedLead) {
      return NextResponse.json({ error: 'Lead not found or could not be deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error: any) {
    console.error('Delete Lead Error:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
/**
 * POST /api/leads/[id]
 * Pushes the lead data to HubSpot CRM.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await db.lead.findUnique(id) as any;

    if (!lead) {
      return NextResponse.json({ error: `Lead not found (ID: ${id})` }, { status: 404 });
    }

    const formattedNotes = `
QA SCORE: ${lead.score || 0}/100

REASONING:
${lead.reasoning || 'N/A'}

TRANSCRIPT:
${lead.transcript || 'N/A'}
`.trim();

    const payload = {
      fields: [
        { name: '0-1/firstname', value: lead.firstName || '' },
        { name: '0-1/lastname', value: lead.lastName || '' },
        { name: '0-1/email', value: lead.email || '' },
        { name: '0-1/phone', value: lead.phone || '' },
        { name: '0-1/email_notes', value: formattedNotes || '' },
        { name: '0-1/contact_employee_count', value: String(lead.employeeCount || '') },
        { name: '0-1/category', value: lead.category || '' },
        { name: '0-1/lead_source', value: 'Channel Partner' },
        { name: '0-1/converting_asset', value: 'x-engage' },
      ],
      context: {
        pageUri: 'https://x-engage.ai/call-qa',
        pageName: 'AI Call Quality Analyzer',
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'
      },
    };

    console.log('[HubSpot] Submitting payload:', JSON.stringify(payload, null, 2));

    const hsResponse = await axios.post(
      `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_GUID}`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('[HubSpot] Response:', hsResponse.status, JSON.stringify(hsResponse.data, null, 2));

    // Mark as pushed in local DB
    await db.lead.update(id, { status: 'PUSHED_TO_CRM' });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('HubSpot Push Error:', error.response?.data || error.message);
    return NextResponse.json({
      error: error.response?.data?.message || error.response?.data?.errors?.[0]?.message || 'Failed to push to CRM'
    }, { status: 500 });
  }
}

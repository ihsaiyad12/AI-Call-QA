import { NextResponse } from 'next/server';
import db from '@/lib/db';
import axios from 'axios';
import { eventEmitter } from '@/lib/events';

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
      intent, authority, demo_commitment, timeline, industry_fit, risk_level,
      disqualificationComment
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

    // Build the update payload dynamically based on provided fields
    const updateData: any = {};
    if (transcript !== undefined) updateData.transcript = transcript;
    if (verdict !== undefined) updateData.verdict = verdict;
    if (reasoning !== undefined) updateData.reasoning = reasoning;
    if (risk_level !== undefined) updateData.risk_level = risk_level;
    if (status !== undefined) updateData.status = status;
    if (aiProvider !== undefined) updateData.aiProvider = aiProvider;
    if (disqualificationComment !== undefined) updateData.disqualificationComment = disqualificationComment;

    if (intent !== undefined) updateData.intent = Number(intent) || 0;
    if (authority !== undefined) updateData.authority = Number(authority) || 0;
    if (demo_commitment !== undefined) updateData.demo_commitment = Number(demo_commitment) || 0;
    if (timeline !== undefined) updateData.timeline = Number(timeline) || 0;
    if (industry_fit !== undefined) updateData.industry_fit = Number(industry_fit) || 0;

    // Recalculate score if sub-metrics were provided, otherwise use provided score
    if (intent !== undefined || authority !== undefined) {
      const calculatedScore = (updateData.intent || 0) + (updateData.authority || 0) + (updateData.demo_commitment || 0) + (updateData.timeline || 0) + (updateData.industry_fit || 0);
      updateData.score = calculatedScore > 0 ? calculatedScore : (Number(score) || 0);
    } else if (score !== undefined) {
      updateData.score = Number(score) || 0;
    }

    // CRITICAL: If verdict is "Not Qualified", force score to 0 to ensure consistency
    if (verdict === 'Not Qualified') {
      updateData.score = 0;
    }

    const updated = await db.lead.update(id, updateData);

    if (!updated) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    eventEmitter.emit('update-lead', updated);
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

    eventEmitter.emit('update-lead', { id, deleted: true });
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
    const updated = await db.lead.update(id, { status: 'PUSHED_TO_CRM' });
    eventEmitter.emit('update-lead', updated);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('HubSpot Push Error:', error.response?.data || error.message);
    return NextResponse.json({
      error: error.response?.data?.message || error.response?.data?.errors?.[0]?.message || 'Failed to push to CRM'
    }, { status: 500 });
  }
}

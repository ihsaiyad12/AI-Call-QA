import { NextResponse } from 'next/server';
import db from '@/lib/db';
import axios from 'axios';
import { eventEmitter } from '@/lib/events';

const HUBSPOT_PORTAL_ID = '6107502';
const HUBSPOT_FORM_GUID = '0bf35c2a-3bb0-4aaf-9acb-9e72c9f1b105';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lead = await db.lead.findUnique(id) as any;

    if (!lead) {
      const allLeads = await db.lead.findMany();
      return NextResponse.json({ 
        error: `Lead not found (ID: ${id})`,
        debug: { totalLeadsInDB: allLeads.length }
      }, { status: 404 });
    }

    // Use HubSpot's server-side Integration API (JSON format)
    // This is the correct endpoint for backend submissions — NOT the browser multipart URL
    // Format notes with clear headers for HubSpot
    const formattedNotes = `
QA SCORE: ${lead.score || 0}/100

REASONING:
${lead.reasoning || 'N/A'}

TRANSCRIPT:
${lead.transcript || 'N/A'}
`.trim();

    const payload = {
      fields: [
        { objectTypeId: '0-1', name: 'firstname', value: lead.firstName },
        { objectTypeId: '0-1', name: 'lastname', value: lead.lastName },
        { objectTypeId: '0-1', name: 'email', value: lead.email },
        { objectTypeId: '0-1', name: 'phone', value: lead.phone },
        { objectTypeId: '0-1', name: 'email_notes', value: formattedNotes },
        { objectTypeId: '0-1', name: 'contact_employee_count', value: lead.employeeCount },
        { objectTypeId: '0-1', name: 'category', value: lead.category },
        { objectTypeId: '0-1', name: 'lead_source', value: 'Channel Partner' },
        { objectTypeId: '0-1', name: 'converting_asset', value: 'x-engage' },
      ],
      context: {
        pageUri: 'https://x-engage.ai/call-qa',
        pageName: 'AI Call Quality Analyzer',
      },
    };

    console.log('[HubSpot] Submitting to Integration API:', JSON.stringify(payload, null, 2));

    const hsResponse = await axios.post(
      `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_GUID}`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('[HubSpot] Response status:', hsResponse.status, 'Data:', JSON.stringify(hsResponse.data));

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

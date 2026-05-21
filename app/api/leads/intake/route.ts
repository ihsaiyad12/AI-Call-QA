import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import db from '@/lib/db';
import axios from 'axios';
import { eventEmitter } from '@/lib/events';

function parseReoonStatus(data: any): string {
  const status: string = (data?.status ?? data?.data?.status ?? 'unknown').toLowerCase().trim();
  const labelMap: Record<string, string> = {
    valid: 'Valid',
    invalid: 'Invalid',
    safe_to_send: 'Safe to Send',
    risky: 'Risky',
    unknown: 'Unknown',
    disposable: 'Disposable',
    role_account: 'Role Account',
    spamtrap: 'Spam Trap',
    catch_all: 'Catch-All',
    do_not_mail: 'Do Not Mail',
  };
  return labelMap[status] ?? `Unknown (${status})`;
}

export const maxDuration = 60;

/**
 * POST /api/leads/intake
 * Called by the Agent Lead Form. Creates a lead with status PENDING.
 * Runs Reoon email verification.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { firstName, lastName, email, phone, category, employeeCount, jobTitle } = body;

    if (!firstName || !lastName || !email || !phone || !category || !employeeCount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // --- DUPLICATE CHECK ---
    const existingLead = await db.lead.findOne({ email: email.toLowerCase().trim() });
    if (existingLead) {
      return NextResponse.json({ 
        error: 'A lead with this email already exists in the system.' 
      }, { status: 409 });
    }

    // Record time in EST
    const createdAtEST = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true
    });

    // Create lead with PENDING status
    const lead = await db.lead.create({
      firstName, lastName, email: email.toLowerCase().trim(), phone, category, employeeCount, jobTitle,
      addedBy: session.user.name,
      status: 'PENDING',
      createdAtEST
    }) as any;

    // Verify email via Reoon
    const apiKey = process.env.REOON_API_KEY;
    if (apiKey) {
      try {
        const url = `https://emailverifier.reoon.com/api/v1/verify`;
        const params = { email, mode: 'quick', key: apiKey };
        const verifyRes = await axios.get(url, { params, timeout: 5000 });
        const label = parseReoonStatus(verifyRes.data);
        await db.lead.update(lead.id, { emailStatus: label, emailStatusRaw: JSON.stringify(verifyRes.data) });
        lead.emailStatus = label;
      } catch (verifyErr: any) {
        console.error('[Reoon] Verification error:', verifyErr?.message ?? verifyErr);
        lead.emailStatus = null;
      }
    }

    eventEmitter.emit('new-lead', lead);
    return NextResponse.json(lead);
  } catch (error: any) {
    console.error('Agent Intake Error:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}

/**
 * PATCH /api/leads/intake
 * Allows an agent to update their own lead if it hasn't been analyzed yet.
 */
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, firstName, lastName, email, phone, category, employeeCount, jobTitle } = body;

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    // Fetch the lead to check ownership and status
    const lead = await db.lead.findUnique(id) as any;
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // SECURITY CHECK: Only original agent can edit
    if (lead.addedBy !== session.user.name) {
      return NextResponse.json({ error: 'You do not have permission to edit this lead' }, { status: 403 });
    }

    // STATUS CHECK: No edits after analysis starts
    if (lead.status !== 'PENDING') {
      return NextResponse.json({ 
        error: `This lead cannot be edited because it is already in ${lead.status} status.` 
      }, { status: 400 });
    }

    // Update the lead
    const updatedLead = await db.lead.update(id, {
      firstName,
      lastName,
      email: email?.toLowerCase().trim(),
      phone,
      category,
      employeeCount,
      jobTitle
    });

    eventEmitter.emit('update-lead', updatedLead);
    return NextResponse.json(updatedLead);
  } catch (error: any) {
    console.error('Agent Lead Update Error:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

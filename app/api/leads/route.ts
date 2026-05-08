import { NextResponse } from 'next/server';
import db from '@/lib/db';
import axios from 'axios';

// Reoon status field → human-readable label
function parseReoonStatus(data: any): string {
  const status: string = (data?.status ?? data?.data?.status ?? 'unknown').toLowerCase().trim();

  console.log('[Reoon] Raw response:', JSON.stringify(data));
  console.log('[Reoon] Parsed status field:', status);

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
 * GET /api/leads?q=searchTerm
 * Searches leads by email, name, or phone. Used by the analyzer for auto-fill and dashboard.
 * If no query is provided, returns all leads prioritized by PENDING status.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const parseDateParam = (param: string | null) => {
      if (!param || param === 'undefined' || param === 'null' || param.trim() === '') return null;
      return param;
    };

    const start = parseDateParam(startDateParam);
    const end = parseDateParam(endDateParam);
    
    const filter: any = {};
    if (start || end) {
      filter.createdAt = {};
      if (start) {
        // new Date('YYYY-MM-DD') defaults to UTC midnight, which is what we want
        filter.createdAt.$gte = new Date(start);
      }
      if (end) {
        // For the end date, we want to include the entire day up to 23:59:59 UTC
        const endDay = new Date(end);
        endDay.setUTCHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDay;
      }
    }

    if (query && query.trim().length >= 2) {
      const results = await db.lead.search(query.trim(), filter);
      return NextResponse.json(results);
    }

    // If no query, return all leads (prioritized by PENDING)
    const allLeads = await db.lead.findMany(filter);
    // Sort logic in db.lead.findMany is by newest first, 
    // let's ensure PENDING are at the top here or in DB layer.
    // Actually, db.lead.findMany already sorts by createdAt.
    // Let's refine the sorting to PENDING first.
    const sortedLeads = [...allLeads].sort((a: any, b: any) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json(sortedLeads);
  } catch (error: any) {
    console.error('Lead Search/Fetch Error:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

/**
 * POST /api/leads
 * Creates a fully analyzed lead (used when no existing lead was selected).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      firstName, lastName, email, phone, category, employeeCount, jobTitle, 
      transcript, verdict: rawVerdict, score, reasoning, status, aiProvider, addedBy,
      intent, authority, demo_commitment, timeline, industry_fit, risk_level
    } = body;

    // Normalize verdict to exact DB enum values
    const normalizeVerdict = (v: string | null | undefined): string | undefined => {
      if (!v) return undefined;
      const lower = v.toLowerCase().trim();
      if (lower.includes('good to go') || lower.includes('sql')) return 'Good to Go (SQL)';
      if (lower.includes('borderline')) return 'Borderline';
      if (lower.includes('not qualified') || lower.includes('disqualified')) return 'Not Qualified';
      return v; // fallback to raw value
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
    // Normalize AI provider
    const finalAiProvider = aiProvider || 'groq';

    // Record time in EST
    const createdAtEST = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    // 1. Check for existing lead to prevent duplicates (Upsert logic)
    const normalizedEmail = email.toLowerCase().trim();
    const existingLead = await db.lead.findOne({ email: normalizedEmail });

    if (existingLead) {
      console.log(`[Leads] Found existing lead for ${normalizedEmail}, updating instead of creating duplicate.`);
      
      const updated = await db.lead.update(existingLead.id, {
        firstName, lastName, phone, category, employeeCount, jobTitle, 
        transcript, verdict, score: finalScore, reasoning, 
        intent: nIntent, authority: nAuthority, demo_commitment: nDemo, timeline: nTimeline, industry_fit: nIndustry, risk_level,
        status: status || 'ANALYZED',
        aiProvider: finalAiProvider,
        // addedBy is EXPLICITLY OMITTED here to preserve the original creator
      }) as any;

      // Still trigger email verification if it wasn't done or if we want to refresh it
      // (Optional: you could skip this if existingLead.emailStatus is already set)
      
      return NextResponse.json(updated);
    }

    // 2. Create new lead if it doesn't exist
    const lead = await db.lead.create({ 
      firstName, lastName, email: normalizedEmail, phone, category, employeeCount, jobTitle, 
      transcript, verdict, score: finalScore, reasoning, 
      intent: nIntent, authority: nAuthority, demo_commitment: nDemo, timeline: nTimeline, industry_fit: nIndustry, risk_level,
      status: status || 'ANALYZED',
      aiProvider: finalAiProvider,
      addedBy,
      createdAtEST
    }) as any;

    // 2. Verify email via Reoon — quick mode (~0.5s, no SMTP)
    const apiKey = process.env.REOON_API_KEY;
    console.log('[Reoon] API key present:', !!apiKey, '| Email:', email);

    if (apiKey) {
      try {
        const url = `https://emailverifier.reoon.com/api/v1/verify`;
        const params = { email, mode: 'quick', key: apiKey };
        console.log('[Reoon] Calling:', url, params);

        const verifyRes = await axios.get(url, { params, timeout: 5000 });
        console.log('[Reoon] HTTP status:', verifyRes.status);

        const label = parseReoonStatus(verifyRes.data);
        console.log('[Reoon] Final label:', label);

        await db.lead.update(lead.id, { emailStatus: label, emailStatusRaw: JSON.stringify(verifyRes.data) });
        lead.emailStatus = label;
      } catch (verifyErr: any) {
        console.error('[Reoon] Verification error:', verifyErr?.message ?? verifyErr);
        lead.emailStatus = null;
      }
    } else {
      console.warn('[Reoon] REOON_API_KEY not found in environment');
    }

    console.log('[Leads] Returning lead with emailStatus:', lead.emailStatus);
    return NextResponse.json(lead);
  } catch (error: any) {
    console.error('Create Lead Error:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}

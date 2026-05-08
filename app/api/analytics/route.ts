import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Lead from '@/lib/models/Lead';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const parseDateParam = (param: string | null) => {
      if (!param || param === 'undefined' || param === 'null' || param.trim() === '') return null;
      return param;
    };

    const start = parseDateParam(startDateParam);
    const end = parseDateParam(endDateParam);
    
    const baseQuery: any = {};
    if (start || end) {
      baseQuery.createdAt = {};
      if (start) {
        // new Date('YYYY-MM-DD') defaults to UTC midnight
        baseQuery.createdAt.$gte = new Date(start);
      }
      if (end) {
        // Include full end day in UTC
        const endDay = new Date(end);
        endDay.setUTCHours(23, 59, 59, 999);
        baseQuery.createdAt.$lte = endDay;
      }
    }

    await dbConnect();

    // 1. Fetch KPI Totals
    const totalLeads = await Lead.countDocuments(baseQuery);
    const analyzedLeads = await Lead.countDocuments({ ...baseQuery, status: { $in: ['ANALYZED', 'PUSHED_TO_CRM'] } });
    const pushedLeads = await Lead.countDocuments({ ...baseQuery, status: 'PUSHED_TO_CRM' });
    const disqualifiedLeads = await Lead.countDocuments({ ...baseQuery, verdict: 'Not Qualified' });

    // 2. Fetch Agent Performance Leaderboard
    const agentPerformance = await Lead.aggregate([
      {
        $match: {
          addedBy: { $ne: null, $exists: true }, // Only include leads added by agents
          ...baseQuery
        }
      },
      {
        $group: {
          _id: '$addedBy',
          totalAdded: { $sum: 1 },
          analyzedCount: {
            $sum: { $cond: [{ $in: ['$status', ['ANALYZED', 'PUSHED_TO_CRM']] }, 1, 0] }
          },
          pushedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'PUSHED_TO_CRM'] }, 1, 0] }
          },
          avgScore: {
            $avg: { $cond: [{ $gt: ['$score', 0] }, '$score', null] } // Avg score only for analyzed
          },
          goodToGoCount: {
            $sum: { $cond: [{ $eq: ['$verdict', 'Good to Go (SQL)'] }, 1, 0] }
          },
          borderlineCount: {
            $sum: { $cond: [{ $eq: ['$verdict', 'Borderline'] }, 1, 0] }
          },
          notQualifiedCount: {
            $sum: { $cond: [{ $eq: ['$verdict', 'Not Qualified'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          agentName: '$_id',
          totalAdded: 1,
          analyzedCount: 1,
          pushedCount: 1,
          avgScore: { $round: ['$avgScore', 1] },
          goodToGoCount: 1,
          borderlineCount: 1,
          notQualifiedCount: 1,
          _id: 0
        }
      },
      { $sort: { totalAdded: -1, avgScore: -1 } } // Sort by volume, then quality
    ]);

    // 3. Verdict Distribution
    const verdictDistribution = await Lead.aggregate([
      {
        $match: { verdict: { $ne: null }, ...baseQuery }
      },
      {
        $group: {
          _id: '$verdict',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          verdict: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Format Verdicts for easier frontend usage
    const formattedVerdicts = {
      sql: verdictDistribution.find(v => v.verdict === 'Good to Go (SQL)')?.count || 0,
      borderline: verdictDistribution.find(v => v.verdict === 'Borderline')?.count || 0,
      notQualified: verdictDistribution.find(v => v.verdict === 'Not Qualified')?.count || 0,
    };

    // 4. Today's Stats (EST)
    const todayEST = new Date().toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }); // Format: MM/DD/YYYY
    
    console.log('[Analytics] Today EST:', todayEST);

    const pushedToday = await Lead.countDocuments({
      status: 'PUSHED_TO_CRM',
      createdAtEST: { $regex: new RegExp(`^${todayEST}`) }
    });

    const analyzedToday = await Lead.countDocuments({
      status: { $in: ['ANALYZED', 'PUSHED_TO_CRM'] },
      createdAtEST: { $regex: new RegExp(`^${todayEST}`) }
    });

    return NextResponse.json({
      kpis: {
        totalLeads,
        analyzedLeads,
        pushedLeads,
        disqualifiedLeads,
        pushedToday,
        analyzedToday,
      },
      agentPerformance,
      verdicts: formattedVerdicts,
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}

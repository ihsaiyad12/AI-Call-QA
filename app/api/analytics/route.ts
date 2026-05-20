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
        baseQuery.createdAt.$gte = new Date(start);
      }
      if (end) {
        const endDay = new Date(end);
        endDay.setUTCHours(23, 59, 59, 999);
        baseQuery.createdAt.$lte = endDay;
      }
    }

    await dbConnect();

    // Run ALL queries in parallel instead of sequentially
    const [
      totalLeads,
      analyzedLeads,
      pushedLeads,
      disqualifiedLeads,
      agentPerformance,
      verdictDistribution,
      dailyTrend
    ] = await Promise.all([
      // 1. KPI Counts
      Lead.countDocuments(baseQuery),
      Lead.countDocuments({ ...baseQuery, status: { $in: ['ANALYZED', 'PUSHED_TO_CRM'] } }),
      Lead.countDocuments({ ...baseQuery, status: 'PUSHED_TO_CRM' }),
      Lead.countDocuments({ ...baseQuery, verdict: 'Not Qualified' }),

      // 2. Agent Performance Leaderboard
      Lead.aggregate([
        {
          $match: {
            addedBy: { $ne: null, $exists: true },
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
              $avg: { $cond: [{ $gt: ['$score', 0] }, '$score', null] }
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
        { $sort: { totalAdded: -1, avgScore: -1 } }
      ]),

      // 3. Verdict Distribution
      Lead.aggregate([
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
      ]),

      // 4. Daily Trend
      Lead.aggregate([
        {
          $match: baseQuery
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            analyzed: { $sum: { $cond: [{ $in: ['$status', ['ANALYZED', 'PUSHED_TO_CRM']] }, 1, 0] } },
            pushed: { $sum: { $cond: [{ $eq: ['$status', 'PUSHED_TO_CRM'] }, 1, 0] } },
          }
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: '$_id',
            analyzed: 1,
            pushed: 1,
            _id: 0
          }
        }
      ])
    ]);

    // Format Verdicts for easier frontend usage
    const formattedVerdicts = {
      sql: verdictDistribution.find((v: any) => v.verdict === 'Good to Go (SQL)')?.count || 0,
      borderline: verdictDistribution.find((v: any) => v.verdict === 'Borderline')?.count || 0,
      notQualified: verdictDistribution.find((v: any) => v.verdict === 'Not Qualified')?.count || 0,
    };

    // Period stats: use the already-fetched values when a date range is specified
    let pushedToday, analyzedToday;
    
    if (start || end) {
      pushedToday = pushedLeads;
      analyzedToday = analyzedLeads;
    } else {
      const todayEST = new Date().toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      // Run remaining "today" queries in parallel too
      [pushedToday, analyzedToday] = await Promise.all([
        Lead.countDocuments({
          status: 'PUSHED_TO_CRM',
          createdAtEST: { $regex: new RegExp(`^${todayEST}`) }
        }),
        Lead.countDocuments({
          status: { $in: ['ANALYZED', 'PUSHED_TO_CRM'] },
          createdAtEST: { $regex: new RegExp(`^${todayEST}`) }
        })
      ]);
    }

    const response = NextResponse.json({
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
      dailyTrend,
    });

    // Cache analytics for 10s, serve stale for 30s while revalidating
    response.headers.set('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    return response;
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Lead from '@/lib/models/Lead';

export async function POST(req: Request) {
  // STRICT SAFEGUARD: Only execute if sandbox mode is explicitly active
  const isDummyActive = process.env.NEXT_PUBLIC_USE_DUMMY_DB === 'true' || process.env.USE_DUMMY_DB === 'true';
  if (!isDummyActive) {
    return NextResponse.json(
      { error: "Access Denied: Sandbox database reset is only available in Sandbox Mode." },
      { status: 403 }
    );
  }

  try {
    console.log('[Sandbox Reset] Connecting to MongoDB...');
    await dbConnect();
    console.log('[Sandbox Reset] Connected. Clearing collections...');

    // 1. Clear database collections
    await User.deleteMany({});
    await Lead.deleteMany({});
    console.log('[Sandbox Reset] Collections cleared successfully.');

    // 2. Seed Default Users
    console.log('[Sandbox Reset] Seeding default users...');
    const salt = await bcrypt.genSalt(10);
    
    const usersToSeed = [
      { username: 'admin', password: 'admin@523523', role: 'super-admin' },
      { username: 'analyst', password: 'analyst123', role: 'analyst' },
      { username: 'agent', password: 'agent123', role: 'agent' },
    ];

    for (const u of usersToSeed) {
      const hashedPassword = await bcrypt.hash(u.password, salt);
      await User.create({
        username: u.username,
        password: hashedPassword,
        role: u.role,
      });
    }
    console.log('[Sandbox Reset] Seeded default users successfully.');

    // 3. Seed Default Leads from leads.db.json
    console.log('[Sandbox Reset] Loading mock leads from leads.db.json...');
    const jsonPath = path.join(process.cwd(), 'leads.db.json');
    const jsonRaw = await fs.readFile(jsonPath, 'utf8');
    const { leads } = JSON.parse(jsonRaw);

    if (Array.isArray(leads) && leads.length > 0) {
      console.log(`[Sandbox Reset] Seeding ${leads.length} leads...`);
      
      // Clean up the leads for insertion
      const leadsToInsert = leads.map((l: any) => {
        // Strip out the custom string id field to let Mongoose assign proper MongoDB ObjectIds
        const { id, _id, ...cleanLead } = l;
        return {
          ...cleanLead,
          createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
          updatedAt: l.updatedAt ? new Date(l.updatedAt) : new Date(),
        };
      });

      await Lead.insertMany(leadsToInsert);
      console.log('[Sandbox Reset] Seeded mock leads successfully!');
    } else {
      console.log('[Sandbox Reset] No leads found in leads.db.json or empty list.');
    }

    return NextResponse.json({
      success: true,
      message: "Sandbox database cleared and pre-seeded successfully!"
    });

  } catch (error: any) {
    console.error('[Sandbox Reset] Seeding error:', error);
    return NextResponse.json(
      { error: "Seeding Failed", details: error.message || error },
      { status: 500 }
    );
  }
}

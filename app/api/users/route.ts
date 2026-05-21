import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

/**
 * GET /api/users
 * Returns a list of all users. Protected to super-admin role only.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (!session || role !== 'super-admin') {
      return NextResponse.json({ error: 'Forbidden: Super-Admin access required' }, { status: 403 });
    }

    await dbConnect();
    const users = await User.find({}, 'username role createdAt').sort({ createdAt: -1 }).lean();

    const formattedUsers = users.map((u: any) => ({
      id: u._id.toString(),
      username: u.username,
      role: u.role,
      createdAt: u.createdAt
    }));

    return NextResponse.json(formattedUsers);
  } catch (error: any) {
    console.error('Fetch Users Error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

/**
 * POST /api/users
 * Creates a new user. Protected to super-admin role only.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (!session || role !== 'super-admin') {
      return NextResponse.json({ error: 'Forbidden: Super-Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { username, password, role: targetRole } = body;

    if (!username || !password || !targetRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    if (cleanPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (!['agent', 'analyst', 'super-admin'].includes(targetRole)) {
      return NextResponse.json({ error: 'Invalid user role selected' }, { status: 400 });
    }

    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ username: cleanUsername });
    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(cleanPassword, salt);

    // Create user
    const newUser = await User.create({
      username: cleanUsername,
      password: hashedPassword,
      role: targetRole
    });

    return NextResponse.json({
      id: newUser._id.toString(),
      username: newUser.username,
      role: newUser.role,
      message: 'User successfully created'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create User Error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

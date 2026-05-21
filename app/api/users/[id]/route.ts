import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';

/**
 * DELETE /api/users/[id]
 * Deletes a user. Protected to super-admin role only.
 * Prevents self-deletion.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    const currentUsername = session?.user?.name;

    if (!session || role !== 'super-admin' || !currentUsername) {
      return NextResponse.json({ error: 'Forbidden: Super-Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await dbConnect();

    // Find the user to be deleted
    const targetUser = await User.findById(id);

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Safety guard: Enforce that super-admins cannot delete themselves
    if (targetUser.username.toLowerCase() === currentUsername.toLowerCase()) {
      return NextResponse.json({ error: 'Cannot delete your own active administrator account' }, { status: 400 });
    }

    // Delete the user
    await User.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete User Error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

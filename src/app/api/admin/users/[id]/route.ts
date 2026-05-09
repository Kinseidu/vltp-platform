import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { UserRole } from '@prisma/client';
import { audit } from '@/lib/services/audit.service';
import { unauthorized, notFound, serverError, error as apiError } from '@/lib/utils/api';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters long');

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== UserRole.ADMIN) {
      return unauthorized();
    }

    const body = await req.json();
    const { role, isActive, fullName, email, phone, newPassword } = body;

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: { applicantProfile: true }
    });
    if (!user) return notFound('User not found');

    const updateData: any = {};
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    // Handle custom password reset
    if (newPassword) {
      const validation = passwordSchema.safeParse(newPassword);
      if (!validation.success) {
        return apiError(validation.error.errors[0].message, 400);
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    // Handle applicant profile updates
    if (fullName && user.applicantProfile) {
      updateData.applicantProfile = {
        update: { fullName }
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        applicantProfile: { select: { fullName: true } }
      }
    });

    await audit({
      actorId: session.id,
      action: newPassword ? 'USER_PASSWORD_RESET' : 'USER_UPDATED',
      entity: 'User',
      entityId: params.id,
      before: {
        role: user.role,
        isActive: user.isActive,
        email: user.email,
        phone: user.phone,
        fullName: user.applicantProfile?.fullName
      },
      after: {
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        email: updatedUser.email,
        phone: updatedUser.phone,
        fullName: updatedUser.applicantProfile?.fullName
      }
    });

    return NextResponse.json({ success: true, data: { user: updatedUser } });
  } catch (error) {
    console.error('[Admin Users PUT]', error);
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== UserRole.ADMIN) {
      return unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        applicantProfile: {
          include: {
            _count: {
              select: {
                applications: true,
              }
            }
          }
        },
      }
    });

    if (!user) return notFound('User not found');

    // Prevent deletion if user has active applications
    if (user.applicantProfile && user.applicantProfile._count.applications > 0) {
      return apiError('Cannot delete user with active applications. Deactivate instead.', 400);
    }

    // Soft delete by deactivating
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    await audit({
      actorId: session.id,
      action: 'USER_DELETED',
      entity: 'User',
      entityId: params.id,
      before: user,
    });

    return NextResponse.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error('[Admin Users DELETE]', error);
    return serverError();
  }
}
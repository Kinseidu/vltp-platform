// src/lib/services/notification.service.ts
// In-app notifications with mock SMS/email abstraction

import { prisma } from '@/lib/db/prisma';
import { NotificationType } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
}

/**
 * Create an in-app notification.
 * In production, also triggers SMS/email via external service.
 */
export async function createNotification(params: CreateNotificationParams) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      linkUrl: params.linkUrl,
    },
  });

  // Mock external notification (SMS/Email abstraction)
  // In production: await smsService.send(...) or await emailService.send(...)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Notification] → ${params.type} to user ${params.userId}: ${params.title}`);
  }

  return notification;
}

/**
 * Notify applicant that a matching job was posted.
 */
export async function notifyJobMatch(userId: string, jobTitle: string, jobId: number) {
  return createNotification({
    userId,
    type: NotificationType.MATCH_ALERT,
    title: 'New job match!',
    message: `A new job matching your profile has been posted: "${jobTitle}". Apply now before the deadline.`,
    linkUrl: `/applicant/jobs/${jobId}`,
  });
}

/**
 * Notify applicant of verification status change.
 */
export async function notifyVerificationUpdate(userId: string, status: string) {
  const messages: Record<string, { title: string; message: string }> = {
    YOUTH_APPROVED: {
      title: 'Verification approved by Youth President',
      message: 'Your community verification has been approved by the Youth President. Awaiting Chief confirmation.',
    },
    CHIEF_CONFIRMED: {
      title: 'Chief confirmation recorded',
      message: 'The Chief\'s confirmation has been recorded. Your verification is now complete.',
    },
    VERIFIED: {
      title: 'You are now a Verified Local!',
      message: 'Congratulations! Your community verification is complete. You can now apply for matched jobs.',
    },
    REJECTED: {
      title: 'Verification not approved',
      message: 'Your verification request was not approved. Please contact your Youth President for details.',
    },
  };

  const content = messages[status] || {
    title: 'Verification status updated',
    message: `Your verification status has been updated to: ${status}`,
  };

  return createNotification({
    userId,
    type: NotificationType.VERIFICATION_UPDATE,
    ...content,
    linkUrl: '/applicant/verification',
  });
}

/**
 * Notify applicant of application status change.
 */
export async function notifyApplicationStatus(userId: string, status: string, jobTitle: string, applicationId: number) {
  const messages: Record<string, { title: string; message: string }> = {
    UNDER_REVIEW: { title: 'Application under review', message: `Your application for "${jobTitle}" is being reviewed by HR.` },
    SHORTLISTED: { title: 'You\'ve been shortlisted!', message: `Great news! Your application for "${jobTitle}" has been shortlisted.` },
    INVITED_FOR_INTERVIEW: { title: 'Interview invitation!', message: `You have been invited for a physical interview for "${jobTitle}". Check your application for details.` },
    REJECTED: { title: 'Application outcome', message: `Thank you for applying for "${jobTitle}". Unfortunately your application was not successful at this time.` },
  };

  const content = messages[status] || {
    title: 'Application updated',
    message: `Your application for "${jobTitle}" has been updated.`,
  };

  return createNotification({
    userId,
    type: NotificationType.APPLICATION_STATUS,
    ...content,
    linkUrl: `/applicant/applications/${applicationId}`,
  });
}

/**
 * Get unread notifications for a user.
 */
export async function getUserNotifications(userId: string, unreadOnly = false) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly && { isRead: false }) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

/**
 * Mark notifications as read.
 */
export async function markNotificationsRead(userId: string, notificationIds?: number[]) {
  return prisma.notification.updateMany({
    where: {
      userId,
      ...(notificationIds ? { id: { in: notificationIds } } : {}),
    },
    data: { isRead: true },
  });
}

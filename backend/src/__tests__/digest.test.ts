import { DigestGeneratorService } from '../services/actions/digest-generator.service';
import { EmailDigestAdapter } from '../services/outputs/email-digest.adapter';
import { EmailSenderService } from '../services/email-sender.service';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mPrisma = {
    email: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    digest: {
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userSettings: {
      findUnique: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => mPrisma),
  };
});

// Mock EmailSenderService
jest.mock('../services/email-sender.service', () => ({
  EmailSenderService: {
    send: jest.fn(),
  },
}));

const prisma = new PrismaClient();

describe('Email Digest Generator & Delivery tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DigestGeneratorService.generateDigest', () => {
    it('should generate digest correctly when no emails are present', async () => {
      (prisma.email.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.digest.create as jest.Mock).mockResolvedValue({
        id: 'digest-empty-id',
        userId: 'user-1',
        type: 'daily',
        content: { html: '', isEmpty: true },
        emailIds: [],
        status: 'pending',
      });

      const digest = await DigestGeneratorService.generateDigest(
        'user-1',
        'daily'
      );

      expect(digest.id).toBe('digest-empty-id');
      expect(prisma.email.findMany).toHaveBeenCalled();
      expect(prisma.digest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'daily',
            emailIds: [],
            status: 'pending',
          }),
        })
      );
      expect(prisma.email.updateMany).not.toHaveBeenCalled();
    });

    it('should group emails by category and limit to 20 emails', async () => {
      const mockEmails = Array.from({ length: 25 }, (_, i) => ({
        id: `email-${i}`,
        sender: 'newsletter@partner.com',
        subject: `News Update #${i}`,
        body: 'Here is some newsletter content...',
        category: 'newsletter',
        createdAt: new Date(),
        analysis: { priorityScore: 10, summary: 'AI summary' },
      }));

      (prisma.email.findMany as jest.Mock).mockResolvedValue(mockEmails);
      (prisma.digest.create as jest.Mock).mockResolvedValue({
        id: 'digest-newsletter-id',
        userId: 'user-1',
        type: 'daily',
        emailIds: mockEmails.slice(0, 20).map((e) => e.id),
        status: 'pending',
      });

      const digest = await DigestGeneratorService.generateDigest(
        'user-1',
        'daily'
      );

      expect(digest.id).toBe('digest-newsletter-id');
      // Should cap query slice to 20 emails
      expect(prisma.email.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: mockEmails.slice(0, 20).map((e) => e.id) },
        },
        data: {
          digestId: 'digest-newsletter-id',
        },
      });
    });
  });

  describe('EmailDigestAdapter.sendDigest', () => {
    it('should fetch user email, deliver via EmailSenderService and mark sent', async () => {
      const mockDigest = {
        id: 'digest-123',
        userId: 'user-1',
        type: 'daily',
        content: {
          html: '<html>Compilation</html>',
          emailCount: 5,
        },
        emailIds: ['email-1'],
        status: 'pending',
        sentAt: null,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        email: 'recipient@inboxos.dev',
      });

      await EmailDigestAdapter.sendDigest(mockDigest as any, 'user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { email: true },
      });

      expect(EmailSenderService.send).toHaveBeenCalledWith('user-1', {
        to: 'recipient@inboxos.dev',
        subject: 'Your InboxOS Daily Digest',
        text: expect.any(String),
        html: '<html>Compilation</html>',
      });

      expect(prisma.digest.update).toHaveBeenCalledWith({
        where: { id: 'digest-123' },
        data: {
          status: 'sent',
          sentAt: expect.any(Date),
        },
      });
    });

    it('should mark digest status as failed if delivery throws error', async () => {
      const mockDigest = {
        id: 'digest-123',
        userId: 'user-1',
        type: 'daily',
        content: {},
        emailIds: [],
        status: 'pending',
        sentAt: null,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        email: 'recipient@inboxos.dev',
      });
      (EmailSenderService.send as jest.Mock).mockRejectedValue(
        new Error('SMTP Offline')
      );

      await expect(
        EmailDigestAdapter.sendDigest(mockDigest as any, 'user-1')
      ).rejects.toThrow('SMTP Offline');

      expect(prisma.digest.update).toHaveBeenCalledWith({
        where: { id: 'digest-123' },
        data: {
          status: 'failed',
        },
      });
    });
  });
});

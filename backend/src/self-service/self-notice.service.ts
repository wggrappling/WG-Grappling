import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { StudentClassStatus, StudentModalityStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUserContext } from './context/authenticated-user-context';
import type { SelfNoticeProjectionDto } from './dto/self-notice-projection.dto';

const noticeSelect = (studentId: number) => ({
  id: true,
  title: true,
  content: true,
  publishedAt: true,
  reads: { where: { studentId }, select: { readAt: true } },
}) satisfies Prisma.NoticeSelect;

@Injectable()
export class SelfNoticeService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotices(context: AuthenticatedUserContext): Promise<SelfNoticeProjectionDto[]> {
    const baseQuery = {
      select: noticeSelect(context.studentId),
      orderBy: [{ publishedAt: 'desc' as const }, { id: 'desc' as const }],
      take: 200,
    };
    const visibility = this.visibleWhere(context.studentId);
    const [unread, read] = await Promise.all([
      this.prisma.notice.findMany({ ...baseQuery, where: { AND: [visibility, { reads: { none: { studentId: context.studentId } } }] } }),
      this.prisma.notice.findMany({ ...baseQuery, where: { AND: [visibility, { reads: { some: { studentId: context.studentId } } }] } }),
    ]);

    return [...unread, ...read].slice(0, 200).map((notice) => this.project(notice));
  }

  async getNotice(context: AuthenticatedUserContext, noticeId: number): Promise<SelfNoticeProjectionDto> {
    const notice = await this.findVisible(context.studentId, noticeId);
    if (!notice) throw new NotFoundException('Aviso não encontrado.');
    return this.project(notice);
  }

  async markRead(context: AuthenticatedUserContext, noticeId: number): Promise<SelfNoticeProjectionDto> {
    const notice = await this.findVisible(context.studentId, noticeId);
    if (!notice) throw new NotFoundException('Aviso não encontrado.');

    await this.prisma.noticeRead.upsert({
      where: { noticeId_studentId: { noticeId, studentId: context.studentId } },
      create: { noticeId, studentId: context.studentId },
      update: {},
    });

    return { ...this.project(notice), isRead: true };
  }

  private findVisible(studentId: number, noticeId: number) {
    return this.prisma.notice.findFirst({
      where: { id: noticeId, ...this.visibleWhere(studentId) },
      select: noticeSelect(studentId),
    });
  }

  private visibleWhere(studentId: number): Prisma.NoticeWhereInput {
    return {
      publishedAt: { lte: new Date() },
      OR: [
        { studentRecipients: { none: {} }, modalityRecipients: { none: {} }, classRecipients: { none: {} } },
        { studentRecipients: { some: { studentId } } },
        { modalityRecipients: { some: { modality: { studentModalities: { some: { studentId, status: { in: [StudentModalityStatus.ACTIVE, StudentModalityStatus.PAUSED] } } } } } } },
        { classRecipients: { some: { class: { studentClasses: { some: { studentId, status: StudentClassStatus.ACTIVE } } } } } },
      ],
    };
  }

  private project(notice: { id: number; title: string; content: string; publishedAt: Date; reads: { readAt: Date }[] }): SelfNoticeProjectionDto {
    return {
      id: notice.id,
      title: notice.title,
      content: notice.content,
      publishedAt: notice.publishedAt,
      isRead: notice.reads.length > 0,
    };
  }
}

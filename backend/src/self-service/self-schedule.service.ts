import { Injectable } from '@nestjs/common';
import { StudentClassStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUserContext } from './context/authenticated-user-context';
import type { SelfScheduleClassProjectionDto, SelfScheduleProjectionDto } from './dto/self-schedule-projection.dto';

const weekDayIndex: Record<string, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};
const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

@Injectable()
export class SelfScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchedule(context: AuthenticatedUserContext, now = new Date()): Promise<SelfScheduleProjectionDto> {
    const memberships = await this.prisma.studentClass.findMany({
      where: { studentId: context.studentId, status: StudentClassStatus.ACTIVE, class: { active: true } },
      select: { class: { select: { name: true, weekDays: true, startTime: true, endTime: true, modality: { select: { name: true } } } } },
    });
    const occurrences: SelfScheduleClassProjectionDto[] = [];
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

    for (let offset = 0; offset < 35 && occurrences.length < 14; offset += 1) {
      const day = new Date(today); day.setUTCDate(today.getUTCDate() + offset);
      for (const membership of memberships) {
        const classRecord = membership.class;
        const matches = classRecord.weekDays.some((weekDay) => weekDayIndex[weekDay.toUpperCase()] === day.getUTCDay());
        if (!matches || (offset === 0 && classRecord.startTime <= currentTime)) continue;
        occurrences.push({ date: dateOnly(day), startTime: classRecord.startTime, endTime: classRecord.endTime, className: classRecord.name, modalityName: classRecord.modality.name });
      }
      occurrences.sort((left, right) => left.date.localeCompare(right.date) || left.startTime.localeCompare(right.startTime) || left.className.localeCompare(right.className));
    }

    const limited = occurrences.slice(0, 14);
    return { next: limited[0] ?? null, upcoming: limited.slice(1) };
  }
}

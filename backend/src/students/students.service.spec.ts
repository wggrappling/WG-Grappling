import { StudentModalityStatus, StudentPlanStatus, UserRole } from '../../generated/prisma/enums';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StudentsService } from './students.service';

describe('StudentsService', () => {
  describe('findOne', () => {
    it('returns the student with the existing profile relationships', async () => {
      const student = {
        id: 7,
        person: { id: 3, address: null },
        responsibles: [],
        modalities: [],
        plans: [],
        studentClasses: [],
      };
      const findFirst = jest.fn().mockResolvedValue(student);
      const prisma = {
        student: { findFirst },
      } as unknown as PrismaService;
      const service = new StudentsService(prisma);

      await expect(service.findOne(7)).resolves.toBe(student);
      expect(findFirst).toHaveBeenCalledWith({
        where: { id: 7 },
        include: {
          person: {
            include: { address: true },
          },
          responsibles: {
            include: { responsible: true },
          },
          modalities: {
            where: { status: StudentModalityStatus.ACTIVE },
            include: { modality: true },
          },
          plans: {
            where: { status: StudentPlanStatus.ACTIVE },
            include: { plan: true },
          },
          studentClasses: {
            include: {
              class: {
                include: {
                  modality: true,
                  teacher: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      role: true,
                      active: true,
                      createdAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('preserves the existing null response when the student does not exist', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const prisma = {
        student: { findFirst },
      } as unknown as PrismaService;
      const service = new StudentsService(prisma);

      await expect(service.findOne(999)).resolves.toBeNull();
    });

    it('allows a teacher to access a student from their classes', async () => {
      const findFirst = jest.fn().mockResolvedValue({ id: 7 });
      const service = new StudentsService({ student: { findFirst } } as unknown as PrismaService);
      await expect(service.findOne(7, { id: 4, role: UserRole.TEACHER })).resolves.toEqual({ id: 7 });
      expect(findFirst.mock.calls[0][0].where).toEqual({ id: 7, studentClasses: { some: { class: { teacherUserId: 4 } } } });
    });

    it('rejects a teacher accessing a student outside their classes', async () => {
      const service = new StudentsService({ student: { findFirst: jest.fn().mockResolvedValue(null) } } as unknown as PrismaService);
      await expect(service.findOne(7, { id: 4, role: UserRole.TEACHER })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});

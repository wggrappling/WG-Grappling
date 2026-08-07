import { StudentModalityStatus, StudentPlanStatus } from '../../generated/prisma/enums';
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
      const findUnique = jest.fn().mockResolvedValue(student);
      const prisma = {
        student: { findUnique },
      } as unknown as PrismaService;
      const service = new StudentsService(prisma);

      await expect(service.findOne(7)).resolves.toBe(student);
      expect(findUnique).toHaveBeenCalledWith({
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
      const findUnique = jest.fn().mockResolvedValue(null);
      const prisma = {
        student: { findUnique },
      } as unknown as PrismaService;
      const service = new StudentsService(prisma);

      await expect(service.findOne(999)).resolves.toBeNull();
    });
  });
});

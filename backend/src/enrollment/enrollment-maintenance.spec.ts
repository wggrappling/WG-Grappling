import { ConflictException } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { ROLES_KEY } from '../auth/roles.decorator';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';

describe('Enrollment transactional maintenance', () => {
  const tx = {
    student: { findUnique: jest.fn(), update: jest.fn() }, person: { findFirst: jest.fn(), update: jest.fn() }, plan: { findFirst: jest.fn() },
    studentPlan: { findMany: jest.fn(), update: jest.fn(), create: jest.fn() }, modality: { findMany: jest.fn() },
    studentModality: { findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn() }, class: { findMany: jest.fn() },
    studentClass: { findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
  };
  const prisma = { $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
  const service = new EnrollmentService(prisma as never, {} as never);
  beforeEach(() => { jest.clearAllMocks(); tx.student.findUnique.mockResolvedValue({ id: 1, personId: 2, person: { id: 2 } }); tx.person.findFirst.mockResolvedValue(null); tx.plan.findFirst.mockResolvedValue({ id: 4 }); tx.studentPlan.findMany.mockResolvedValue([{ id: 3, planId: 3 }]); tx.modality.findMany.mockResolvedValue([]); tx.studentModality.findMany.mockResolvedValue([]); tx.studentModality.updateMany.mockResolvedValue({ count: 0 }); tx.class.findMany.mockResolvedValue([]); tx.studentClass.findMany.mockResolvedValue([]); tx.studentClass.deleteMany.mockResolvedValue({ count: 0 }); });
  it('atualiza Person e Student dentro da mesma transação', async () => { await service.maintain(1,{person:{name:'Maria',cpf:'12345678901',email:'maria@example.com'},student:{status:'ACTIVE',joinedAt:'2026-01-01T00:00:00.000Z'}} as never); expect(tx.person.update).toHaveBeenCalled(); expect(tx.student.update).toHaveBeenCalled(); expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function),{isolationLevel:'Serializable'}); });
  it('troca o plano preservando o vínculo anterior e sem acessar cobranças', async () => { await service.maintain(1,{plan:{planId:4,monthlyPrice:199.9,billingDay:10,startDate:'2026-09-01T00:00:00.000Z'}}); expect(tx.studentPlan.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:'FINISHED'})})); expect(tx.studentPlan.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({planId:4,status:'ACTIVE'})})); expect((tx as Record<string, unknown>).charge).toBeUndefined(); });
  it('impede dois planos ativos', async () => { tx.studentPlan.findMany.mockResolvedValue([{id:1},{id:2}]); await expect(service.maintain(1,{plan:{planId:4,monthlyPrice:100,billingDay:5,startDate:'2026-09-01T00:00:00.000Z'}})).rejects.toBeInstanceOf(ConflictException); });
  it('propaga falha intermediária para rollback da transação', async () => { tx.student.update.mockRejectedValue(new Error('falha')); await expect(service.maintain(1,{student:{status:'PAUSED',joinedAt:'2026-01-01T00:00:00.000Z'}} as never)).rejects.toThrow('falha'); });
  it('autoriza reception e bloqueia teacher na operação', () => { const roles=Reflect.getMetadata(ROLES_KEY,EnrollmentController.prototype.maintain); expect(roles).toEqual(expect.arrayContaining([UserRole.OWNER,UserRole.ADMIN,UserRole.RECEPTION])); expect(roles).not.toContain(UserRole.TEACHER); });
});

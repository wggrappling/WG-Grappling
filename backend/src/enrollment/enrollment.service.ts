import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { StudentModalityStatus, StudentPlanStatus, StudentStatus } from '../../generated/prisma/enums';
import { ChargeGeneratorService } from '../charge/charge-generator.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { MaintainEnrollmentDto } from './dto/maintain-enrollment.dto';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chargeGeneratorService: ChargeGeneratorService,
  ) {}

  async create(dto: CreateEnrollmentDto) {
    const { studentId, person, student: newStudent, planId, monthlyPrice, billingDay, startDate } = dto;
    const modalityIds = [...new Set(dto.modalityIds ?? [])];
    const classIds = [...new Set(dto.classIds ?? [])];
    const hasExistingStudent = studentId !== undefined;
    const hasNewStudentData = person !== undefined || newStudent !== undefined;

    if (hasExistingStudent === hasNewStudentData || (!hasExistingStudent && (!person || !newStudent))) {
      throw new BadRequestException('Informe studentId ou person e student, nunca ambos.');
    }
    if (hasExistingStudent && (dto.address || dto.responsible)) {
      throw new BadRequestException('Endereço e responsável só podem ser informados para um novo aluno.');
    }

    if (hasExistingStudent) {
      const existingStudent = await this.prisma.student.findUnique({ where: { id: studentId } });
      if (!existingStudent) throw new NotFoundException(`Student com id ${studentId} não encontrado.`);
    } else {
      if (!this.isValidCpf(person!.cpf)) throw new BadRequestException('CPF inválido.');
      if (dto.responsible && !this.isValidCpf(dto.responsible.cpf)) {
        throw new BadRequestException('CPF do responsável inválido.');
      }
      const duplicatePerson = await this.prisma.person.findFirst({
        where: { OR: [{ cpf: person!.cpf }, { email: person!.email }] },
        select: { id: true },
      });
      if (duplicatePerson) throw new ConflictException('Já existe uma pessoa cadastrada com este CPF ou e-mail.');

      if (newStudent!.enrollmentNumber) {
        const duplicateEnrollment = await this.prisma.student.findUnique({
          where: { enrollmentNumber: newStudent!.enrollmentNumber },
          select: { id: true },
        });
        if (duplicateEnrollment) throw new ConflictException('Já existe um aluno com este número de matrícula.');
      }
    }

    if (!hasExistingStudent && dto.responsible) {
      const duplicateResponsible = await this.prisma.responsible.findUnique({
        where: { cpf: dto.responsible.cpf },
        select: { id: true },
      });
      if (duplicateResponsible) throw new ConflictException('Já existe um responsável com este CPF.');
    }

    const plan = await this.prisma.plan.findFirst({ where: { id: planId, active: true } });
    if (!plan) throw new NotFoundException(`Plan com id ${planId} não encontrado.`);

    if (modalityIds.length > 0) {
      const modalities = await this.prisma.modality.findMany({ where: { id: { in: modalityIds }, active: true } });
      if (modalities.length !== modalityIds.length) {
        throw new NotFoundException('Uma ou mais modalidades informadas não foram encontradas.');
      }
    }

    if (classIds.length > 0) {
      const classes = await this.prisma.class.findMany({
        where: { id: { in: classIds }, active: true, teacher: { active: true } },
        include: { _count: { select: { studentClasses: true } } },
      });
      if (classes.length !== classIds.length) {
        throw new NotFoundException('Uma ou mais turmas informadas não foram encontradas.');
      }
      const selectedModalities = new Set(modalityIds);
      if (classes.some((item) => !selectedModalities.has(item.modalityId))) {
        throw new ConflictException('Turma incompatível com as modalidades selecionadas.');
      }
      if (classes.some((item) => item._count.studentClasses >= item.capacity)) {
        throw new ConflictException('Uma ou mais turmas atingiram a capacidade.');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let enrolledStudentId = studentId;

      if (!enrolledStudentId) {
        const createdPerson = await tx.person.create({ data: person! });
        const createdStudent = await tx.student.create({
          data: {
            personId: createdPerson.id,
            enrollmentNumber: newStudent!.enrollmentNumber
              ?? `WG-${new Date(startDate).getUTCFullYear()}-${String(createdPerson.id).padStart(6, '0')}`,
            status: newStudent!.status ?? StudentStatus.ACTIVE,
            joinedAt: new Date(newStudent!.joinedAt ?? startDate),
            notes: newStudent!.notes,
          },
        });
        enrolledStudentId = createdStudent.id;

        if (dto.address) {
          await tx.address.create({ data: { ...dto.address, personId: createdPerson.id } });
        }
        if (dto.responsible) {
          const responsible = await tx.responsible.create({ data: dto.responsible });
          await tx.studentResponsible.create({
            data: { studentId: createdStudent.id, responsibleId: responsible.id },
          });
        }
      }

      const createdStudentPlan = await tx.studentPlan.create({
        data: { studentId: enrolledStudentId, planId, startDate: new Date(startDate), monthlyPrice, billingDay, status: StudentPlanStatus.ACTIVE },
      });
      const createdStudentModalities = await Promise.all(modalityIds.map((modalityId) => tx.studentModality.create({
        data: { studentId: enrolledStudentId!, modalityId, startedAt: new Date(startDate), status: StudentModalityStatus.ACTIVE },
      })));
      const createdStudentClasses = await Promise.all(classIds.map((classId) => tx.studentClass.create({
        data: { studentId: enrolledStudentId!, classId },
      })));

      await this.chargeGeneratorService.generateEnrollmentCharges(
        enrolledStudentId, planId, new Date(startDate), billingDay, monthlyPrice, tx,
      );

      return {
        studentId: enrolledStudentId,
        studentPlanId: createdStudentPlan.id,
        studentModalityIds: createdStudentModalities.map(({ id }) => id),
        studentClassIds: createdStudentClasses.map(({ id }) => id),
        modalityCount: createdStudentModalities.length,
        classCount: createdStudentClasses.length,
      };
    });

    return { message: 'Matrícula realizada com sucesso!', data: result };
  }

  private isValidCpf(value: string) {
    const cpf = value.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    const digit = (length: number) => {
      const sum = cpf.slice(0, length).split('').reduce(
        (total, number, index) => total + Number(number) * (length + 1 - index),
        0,
      );
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
  }

  async maintain(studentId: number, dto: MaintainEnrollmentDto) {
    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({ where: { id: studentId }, include: { person: { select: { id: true } } } });
      if (!student) throw new NotFoundException('Aluno não encontrado.');

      if (dto.person) {
        const duplicate = await tx.person.findFirst({ where: { id: { not: student.personId }, OR: [{ cpf: dto.person.cpf }, { email: dto.person.email }] }, select: { id: true } });
        if (duplicate) throw new ConflictException('CPF ou e-mail já utilizado por outra pessoa.');
        await tx.person.update({ where: { id: student.personId }, data: dto.person });
      }
      if (dto.student) await tx.student.update({ where: { id: studentId }, data: { ...dto.student, joinedAt: new Date(dto.student.joinedAt) } });

      if (dto.plan) {
        const plan = await tx.plan.findFirst({ where: { id: dto.plan.planId, active: true }, select: { id: true } });
        if (!plan) throw new NotFoundException('Plano ativo não encontrado.');
        const activePlans = await tx.studentPlan.findMany({ where: { studentId, status: StudentPlanStatus.ACTIVE } });
        if (activePlans.length > 1) throw new ConflictException('Aluno possui mais de um plano ativo; regularize antes da troca.');
        const current = activePlans[0]; const startDate = new Date(dto.plan.startDate);
        if (current?.planId === dto.plan.planId) {
          await tx.studentPlan.update({ where: { id: current.id }, data: { monthlyPrice: dto.plan.monthlyPrice, billingDay: dto.plan.billingDay } });
        } else {
          if (current) await tx.studentPlan.update({ where: { id: current.id }, data: { status: StudentPlanStatus.FINISHED, endDate: startDate } });
          await tx.studentPlan.create({ data: { studentId, planId: dto.plan.planId, startDate, monthlyPrice: dto.plan.monthlyPrice, billingDay: dto.plan.billingDay, status: StudentPlanStatus.ACTIVE } });
        }
      }

      const addModalityIds = [...new Set(dto.addModalityIds ?? [])];
      if (addModalityIds.length) {
        const valid = await tx.modality.findMany({ where: { id: { in: addModalityIds }, active: true }, select: { id: true } });
        if (valid.length !== addModalityIds.length) throw new NotFoundException('Uma ou mais modalidades ativas não foram encontradas.');
        const existing = await tx.studentModality.findMany({ where: { studentId, modalityId: { in: addModalityIds } }, select: { modalityId: true } });
        if (existing.length) throw new ConflictException('Uma ou mais modalidades já possuem vínculo com o aluno.');
        await Promise.all(addModalityIds.map((modalityId) => tx.studentModality.create({ data: { studentId, modalityId, startedAt: new Date(), status: StudentModalityStatus.ACTIVE } })));
      }
      const deactivateIds = [...new Set(dto.deactivateStudentModalityIds ?? [])];
      if (deactivateIds.length) {
        const result = await tx.studentModality.updateMany({ where: { id: { in: deactivateIds }, studentId, status: StudentModalityStatus.ACTIVE }, data: { status: StudentModalityStatus.PAUSED } });
        if (result.count !== deactivateIds.length) throw new NotFoundException('Vínculo ativo de modalidade não encontrado.');
      }

      const removeClassIds = [...new Set(dto.removeStudentClassIds ?? [])];
      if (removeClassIds.length) {
        const result = await tx.studentClass.deleteMany({ where: { id: { in: removeClassIds }, studentId } });
        if (result.count !== removeClassIds.length) throw new NotFoundException('Vínculo de turma não encontrado.');
      }
      const addClassIds = [...new Set(dto.addClassIds ?? [])];
      if (addClassIds.length) {
        const classes = await tx.class.findMany({ where: { id: { in: addClassIds }, active: true, teacher: { active: true } }, include: { _count: { select: { studentClasses: true } } } });
        if (classes.length !== addClassIds.length) throw new NotFoundException('Uma ou mais turmas ativas não foram encontradas.');
        const existing = await tx.studentClass.findMany({ where: { studentId, classId: { in: addClassIds } }, select: { classId: true } });
        if (existing.length) throw new ConflictException('O aluno já possui vínculo com uma das turmas.');
        const activeModalities = await tx.studentModality.findMany({ where: { studentId, status: StudentModalityStatus.ACTIVE }, select: { modalityId: true } });
        const activeIds = new Set(activeModalities.map(({ modalityId }) => modalityId));
        if (classes.some((item) => !activeIds.has(item.modalityId))) throw new ConflictException('Turma incompatível com as modalidades ativas do aluno.');
        if (classes.some((item) => item._count.studentClasses >= item.capacity)) throw new ConflictException('Uma ou mais turmas atingiram a capacidade.');
        await Promise.all(addClassIds.map((classId) => tx.studentClass.create({ data: { studentId, classId } })));
      }

      return { message: 'Matrícula atualizada integralmente.', data: { studentId } };
    }, { isolationLevel: 'Serializable' });
  }
}

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateAttendanceBatchDto } from './dto/create-attendance-batch.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { StudentClassStatus, UserRole } from '../../generated/prisma/enums';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
type UserContext = { id: number; role: UserRole };

const attendanceDay = (value: Date) => ({
  gte: new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())),
  lt: new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + 1)),
});

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AttendanceQueryDto = {}, user?: UserContext) {
    const { studentId, classId, startDate, endDate } = query;
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) throw new BadRequestException('startDate deve ser anterior ou igual a endDate.');
    return this.prisma.attendance.findMany({
      where: {
        ...(studentId === undefined ? {} : { studentId }),
        ...(classId === undefined ? {} : { classId }),
        ...(!startDate && !endDate ? {} : { attendanceDate: { ...(startDate ? { gte: new Date(startDate) } : {}), ...(endDate ? { lte: new Date(endDate) } : {}) } }),
        ...(user?.role === UserRole.TEACHER ? { class: { teacherUserId: user.id } } : {}),
      },
      include: {
        class: { include: { modality: true } },
        student: { select: { id: true, enrollmentNumber: true } },
      },
      orderBy: { attendanceDate: 'desc' },
    });
  }

  async findOne(id: number, user?: UserContext) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, ...(user?.role === UserRole.TEACHER ? { class: { teacherUserId: user.id } } : {}) },
      include: {
        class: true,
        student: true,
      },
    });
    if (!attendance && user?.role === UserRole.TEACHER) throw new ForbiddenException('Professor sem acesso a esta presença.');
    return attendance;
  }

  async create(createAttendanceDto: CreateAttendanceDto, user?: UserContext) {
    if (user?.role === UserRole.TEACHER) {
      const ownClass = await this.prisma.class.findFirst({ where: { id: createAttendanceDto.classId, teacherUserId: user.id }, select: { id: true } });
      if (!ownClass) throw new ConflictException('Professor não pode registrar presença em turma de outro professor.');
    }
    const attendanceDate = new Date(createAttendanceDto.attendanceDate);

    const studentClass = await this.prisma.studentClass.findFirst({
      where: { classId: createAttendanceDto.classId, studentId: createAttendanceDto.studentId, status: StudentClassStatus.ACTIVE },
      select: { id: true },
    });
    if (!studentClass) throw new NotFoundException('Aluno não encontrado nesta turma.');

    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        classId: createAttendanceDto.classId,
        studentId: createAttendanceDto.studentId,
        attendanceDate: attendanceDay(attendanceDate),
      },
    });

    if (existingAttendance) {
      throw new ConflictException('Já existe um registro de presença para este aluno nesta turma nesta data.');
    }

    return this.prisma.attendance.create({
      data: {
        ...createAttendanceDto,
        attendanceDate,
      },
      include: {
        class: true,
        student: true,
      },
    });
  }

  async createBatch(createAttendanceBatchDto: CreateAttendanceBatchDto, user?: UserContext) {
    const { classId, attendanceDate, students } = createAttendanceBatchDto;
    const attendanceDateValue = new Date(attendanceDate);

    const classRecord = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord) {
      throw new NotFoundException('Class not found.');
    }
    if (user?.role === UserRole.TEACHER && classRecord.teacherUserId !== user.id) {
      throw new ConflictException('Professor não pode registrar presença em turma de outro professor.');
    }

    const studentClassRelations = await this.prisma.studentClass.findMany({
      where: { classId, status: StudentClassStatus.ACTIVE },
      select: { studentId: true },
    });

    const allowedStudentIds = new Set(studentClassRelations.map((entry) => entry.studentId));
    const requestedStudentIds = students.map((student) => student.studentId);

    const invalidStudentIds = requestedStudentIds.filter((studentId) => !allowedStudentIds.has(studentId));
    if (invalidStudentIds.length > 0) {
      throw new ConflictException('Alguns alunos não pertencem a esta turma.');
    }

    const existingAttendances = await this.prisma.attendance.findMany({
      where: {
        classId,
        attendanceDate: attendanceDay(attendanceDateValue),
        studentId: { in: requestedStudentIds },
      },
      select: { studentId: true },
    });

    const existingStudentIds = new Set(existingAttendances.map((entry) => entry.studentId));
    const duplicateStudentIds = requestedStudentIds.filter((studentId) => existingStudentIds.has(studentId));
    if (duplicateStudentIds.length > 0) {
      throw new ConflictException('Alguns alunos já possuem presença registrada para esta turma e data.');
    }

    const createdAttendances = await this.prisma.$transaction(async (tx) => {
      return tx.attendance.createMany({
        data: students.map((student) => ({
          classId,
          studentId: student.studentId,
          attendanceDate: attendanceDateValue,
          status: student.status,
        })),
      });
    });

    return {
      message: 'Presenças registradas com sucesso!',
      classId,
      attendanceDate,
      processedStudents: createdAttendances.count,
    };
  }

  async update(id: number, updateAttendanceDto: UpdateAttendanceDto) {
    return this.prisma.attendance.update({
      where: { id },
      data: updateAttendanceDto,
      include: {
        class: true,
        student: true,
      },
    });
  }

  async remove(id: number) {
    await this.prisma.attendance.delete({
      where: { id },
    });

    return {
      message: 'Registro de presença removido com sucesso!',
    };
  }
}

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateAttendanceBatchDto } from './dto/create-attendance-batch.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(studentId?: number) {
    if (studentId !== undefined && (!Number.isInteger(studentId) || studentId <= 0)) {
      throw new BadRequestException('studentId inválido.');
    }
    return this.prisma.attendance.findMany({
      where: studentId === undefined ? undefined : { studentId },
      include: {
        class: { include: { modality: true } },
        student: { select: { id: true, enrollmentNumber: true } },
      },
      orderBy: { attendanceDate: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.attendance.findUnique({
      where: { id },
      include: {
        class: true,
        student: true,
      },
    });
  }

  async create(createAttendanceDto: CreateAttendanceDto) {
    const attendanceDate = new Date(createAttendanceDto.attendanceDate);

    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        classId: createAttendanceDto.classId,
        studentId: createAttendanceDto.studentId,
        attendanceDate,
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

  async createBatch(createAttendanceBatchDto: CreateAttendanceBatchDto) {
    const { classId, attendanceDate, students } = createAttendanceBatchDto;
    const attendanceDateValue = new Date(attendanceDate);

    const classRecord = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord) {
      throw new NotFoundException('Class not found.');
    }

    const studentClassRelations = await this.prisma.studentClass.findMany({
      where: { classId },
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
        attendanceDate: attendanceDateValue,
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

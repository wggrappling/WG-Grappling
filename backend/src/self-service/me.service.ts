import { ForbiddenException, Injectable } from '@nestjs/common';
import { StudentStatus, UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUserContext } from './context/authenticated-user-context';
import type { MeProjectionDto } from './dto/me-projection.dto';
import type { SelfProfileProjectionDto } from './dto/self-profile-projection.dto';

const studentProjection = {
  id: true,
  enrollmentNumber: true,
  status: true,
  joinedAt: true,
  person: { select: {
    name: true, email: true, phone: true, cpf: true,
    address: { select: { zipCode: true, street: true, number: true, complement: true, neighborhood: true, city: true, state: true, country: true } },
  } },
} as const;

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(context: AuthenticatedUserContext): Promise<MeProjectionDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: context.userId,
        role: UserRole.ALUNO,
        active: true,
        studentId: context.studentId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        student: { select: studentProjection },
      },
    });

    if (!user?.student) {
      throw new ForbiddenException('Contexto ALUNO não disponível.');
    }

    return {
      account: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
      },
      student: {
        id: user.student.id,
        name: user.student.person.name,
        enrollmentNumber: user.student.enrollmentNumber,
        status: user.student.status,
        joinedAt: user.student.joinedAt,
      },
      academicContext: {
        active: context.studentStatus === StudentStatus.ACTIVE,
      },
    };
  }

  async getProfile(
    context: AuthenticatedUserContext,
  ): Promise<SelfProfileProjectionDto> {
    const student = await this.prisma.student.findFirst({
      where: { id: context.studentId, user: { id: context.userId } },
      select: studentProjection,
    });

    if (!student) {
      throw new ForbiddenException('Contexto ALUNO não disponível.');
    }

    return {
      name: student.person.name,
      email: student.person.email,
      phone: student.person.phone,
      maskedCpf: this.maskCpf(student.person.cpf),
      address: student.person.address,
      enrollmentNumber: student.enrollmentNumber,
      studentStatus: student.status,
      joinedAt: student.joinedAt,
    };
  }

  private maskCpf(cpf: string): string {
    const digits = cpf.replace(/\D/g, '');
    return digits.length === 11 ? `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**` : '***.***.***-**';
  }
}

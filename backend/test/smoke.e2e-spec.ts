import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { LocalStorageAdapter } from '../src/documents/storage/local-storage.adapter';
import { UserRole } from '../generated/prisma/enums';

const ADMIN_EMAIL = 'admin.smoke@wggrappling.local';
const TEACHER_EMAIL = 'teacher.smoke@wggrappling.local';

type OriginalAdmin = {
  id: number;
  name: string;
  password: string;
  role: UserRole;
  active: boolean;
} | null;

describe('SMOKE TEST operacional (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: LocalStorageAdapter;
  let password: string;
  let originalAdmin: OriginalAdmin;
  let runStartedAt: Date;
  let adminId: number | undefined;
  let teacherId: number | undefined;
  let personId: number | undefined;
  let studentId: number | undefined;
  let planId: number | undefined;
  let modalityId: number | undefined;
  let classId: number | undefined;
  let documentId: number | undefined;
  const created = {
    users: new Set<number>(), people: new Set<number>(), students: new Set<number>(), plans: new Set<number>(),
    modalities: new Set<number>(), classes: new Set<number>(), studentPlans: new Set<number>(),
    studentModalities: new Set<number>(), studentClasses: new Set<number>(), charges: new Set<number>(),
    payments: new Set<number>(), attendances: new Set<number>(), graduations: new Set<number>(),
    documents: new Set<number>(), auditLogs: new Set<number>(),
  };
  const storageKeys = new Set<string>();
  const cleanup = { created: [] as string[], removed: [] as string[], restored: [] as string[], errors: [] as string[], remaining: [] as string[] };

  const marker = `SMOKE TEST ${Date.now()}`;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  function track(type: keyof typeof created, id: number) {
    created[type].add(id);
    cleanup.created.push(`${type}:${id}`);
    return id;
  }

  async function cleanupStep(label: string, operation: () => Promise<unknown>) {
    try { await operation(); }
    catch (error) { cleanup.errors.push(`${label}: ${error instanceof Error ? error.message : 'erro desconhecido'}`); }
  }

  async function settleAudit() {
    if (!prisma || !runStartedAt) return;
    const userIds = [adminId, teacherId].filter((id): id is number => id !== undefined);
    let previous = ''; let stable = 0;
    for (let index = 0; index < 40 && stable < 4; index += 1) {
      const rows = await prisma.auditLog.findMany({
        where: { userId: { in: userIds }, createdAt: { gte: runStartedAt } }, select: { id: true }, orderBy: { id: 'asc' },
      });
      const signature = rows.map(({ id }) => id).join(',');
      stable = signature === previous ? stable + 1 : 0; previous = signature;
      rows.forEach(({ id }) => { if (!created.auditLogs.has(id)) track('auditLogs', id); });
      if (stable < 4) await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (stable < 4) throw new Error('Auditoria do SMOKE TEST não estabilizou.');
  }

  function validCpf(seed: number) {
    const base = String(seed).padStart(9, '0').slice(-9).split('').map(Number);
    const digit = (values: number[]) => {
      const sum = values.reduce((total, value, index) => total + value * (values.length + 1 - index), 0);
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    base.push(digit(base));
    base.push(digit(base));
    return base.join('');
  }

  async function discoverCreatedRelations() {
    if (!prisma) return;
    for (const id of created.students) {
      const student = await prisma.student.findUnique({
        where: { id }, include: { plans: true, modalities: true, studentClasses: true, charges: { include: { payments: true } }, documents: true, attendances: true, graduations: true },
      });
      if (!student) continue;
      if (!created.people.has(student.personId)) track('people', student.personId);
      student.plans.forEach((item) => { if (!created.studentPlans.has(item.id)) track('studentPlans', item.id); });
      student.modalities.forEach((item) => { if (!created.studentModalities.has(item.id)) track('studentModalities', item.id); });
      student.studentClasses.forEach((item) => { if (!created.studentClasses.has(item.id)) track('studentClasses', item.id); });
      student.charges.forEach((item) => {
        if (!created.charges.has(item.id)) track('charges', item.id);
        item.payments.forEach((payment) => { if (!created.payments.has(payment.id)) track('payments', payment.id); });
      });
      student.attendances.forEach((item) => { if (!created.attendances.has(item.id)) track('attendances', item.id); });
      student.graduations.forEach((item) => { if (!created.graduations.has(item.id)) track('graduations', item.id); });
      student.documents.forEach((item) => {
        if (!created.documents.has(item.id)) track('documents', item.id);
        storageKeys.add(item.storagePath);
      });
    }
  }

  beforeAll(async () => {
    password = process.env.SMOKE_TEST_PASSWORD ?? '';
    if (!password) {
      throw new Error('SMOKE_TEST_PASSWORD não definida; smoke test abortado antes de criar ou alterar dados.');
    }

    runStartedAt = new Date();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    storage = app.get(LocalStorageAdapter);

    const passwordHash = await bcrypt.hash(password, 10);
    const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    originalAdmin = existingAdmin
      ? { id: existingAdmin.id, name: existingAdmin.name, password: existingAdmin.password, role: existingAdmin.role, active: existingAdmin.active }
      : null;
    const admin = existingAdmin
      ? await prisma.user.update({ where: { id: existingAdmin.id }, data: { name: 'SMOKE TEST ADMIN', password: passwordHash, role: UserRole.ADMIN, active: true } })
      : await prisma.user.create({ data: { name: 'SMOKE TEST ADMIN', email: ADMIN_EMAIL, password: passwordHash, role: UserRole.ADMIN } });
    adminId = existingAdmin ? admin.id : track('users', admin.id);

    const staleTeacher = await prisma.user.findUnique({ where: { email: TEACHER_EMAIL } });
    if (staleTeacher) throw new Error(`Fixture TEACHER já existe (id ${staleTeacher.id}); nenhuma fixture operacional foi criada.`);
    const teacher = await prisma.user.create({
      data: { name: 'SMOKE TEST TEACHER', email: TEACHER_EMAIL, password: passwordHash, role: UserRole.TEACHER },
    });
    teacherId = track('users', teacher.id);

    const [personCollision, planCollision, modalityCollision, classCollision] = await Promise.all([
      prisma.person.findFirst({ where: { name: marker } }),
      prisma.plan.findUnique({ where: { name: `${marker} PLAN` } }),
      prisma.modality.findUnique({ where: { name: `${marker} MODALITY` } }),
      prisma.class.findFirst({ where: { name: `${marker} CLASS` } }),
    ]);
    if (personCollision || planCollision || modalityCollision || classCollision) throw new Error('Colisão de fixture SMOKE TEST encontrada.');
    const plan = await prisma.plan.create({ data: { name: `${marker} PLAN`, description: marker, price: 100, weeklyClasses: 2 } });
    planId = track('plans', plan.id);
    const modality = await prisma.modality.create({ data: { name: `${marker} MODALITY`, description: marker, hasGraduation: true } });
    modalityId = track('modalities', modality.id);
    const classRecord = await prisma.class.create({
      data: { name: `${marker} CLASS`, modalityId, teacherUserId: teacherId, weekDays: ['MONDAY'], startTime: '08:00', endTime: '09:00', capacity: 5 },
    });
    classId = track('classes', classRecord.id);
  }, 30_000);

  afterAll(async () => {
    try {
      try { await settleAudit(); }
      catch (error) { cleanup.errors.push(`audit-settle: ${error instanceof Error ? error.message : 'erro desconhecido'}`); }
      try { await discoverCreatedRelations(); }
      catch (error) { cleanup.errors.push(`fixture-discovery: ${error instanceof Error ? error.message : 'erro desconhecido'}`); }

      if (prisma) {
        await cleanupStep('auditLogs', () => prisma.auditLog.deleteMany({ where: { id: { in: [...created.auditLogs] } } }));
        await cleanupStep('payments', () => prisma.payment.deleteMany({ where: { id: { in: [...created.payments] } } }));
        await cleanupStep('charges', () => prisma.charge.deleteMany({ where: { id: { in: [...created.charges] } } }));
        await cleanupStep('graduations', () => prisma.graduation.deleteMany({ where: { id: { in: [...created.graduations] } } }));
        if (storage) for (const key of storageKeys) await cleanupStep(`storage:${key}`, () => storage.delete(key));
        await cleanupStep('documents', () => prisma.document.deleteMany({ where: { id: { in: [...created.documents] } } }));
        await cleanupStep('attendances', () => prisma.attendance.deleteMany({ where: { id: { in: [...created.attendances] } } }));
        await cleanupStep('studentClasses', () => prisma.studentClass.deleteMany({ where: { id: { in: [...created.studentClasses] } } }));
        await cleanupStep('studentModalities', () => prisma.studentModality.deleteMany({ where: { id: { in: [...created.studentModalities] } } }));
        await cleanupStep('studentPlans', () => prisma.studentPlan.deleteMany({ where: { id: { in: [...created.studentPlans] } } }));
        await cleanupStep('students', () => prisma.student.deleteMany({ where: { id: { in: [...created.students] } } }));
        await cleanupStep('people', () => prisma.person.deleteMany({ where: { id: { in: [...created.people] } } }));
        await cleanupStep('classes', () => prisma.class.deleteMany({ where: { id: { in: [...created.classes] } } }));
        await cleanupStep('modalities', () => prisma.modality.deleteMany({ where: { id: { in: [...created.modalities] } } }));
        await cleanupStep('plans', () => prisma.plan.deleteMany({ where: { id: { in: [...created.plans] } } }));
        await cleanupStep('createdUsers', () => prisma.user.deleteMany({ where: { id: { in: [...created.users] } } }));

        if (originalAdmin) {
          try {
            await prisma.user.update({ where: { id: originalAdmin.id }, data: {
              name: originalAdmin.name, password: originalAdmin.password, role: originalAdmin.role, active: originalAdmin.active,
            } });
            cleanup.restored.push(`users:${originalAdmin.id}`);
          } catch (error) { cleanup.errors.push(`restore-admin: ${error instanceof Error ? error.message : 'erro desconhecido'}`); }
        }

        const checks: Array<[keyof typeof created, Promise<Array<{ id: number }>>]> = [
          ['auditLogs', prisma.auditLog.findMany({ where: { id: { in: [...created.auditLogs] } }, select: { id: true } })],
          ['payments', prisma.payment.findMany({ where: { id: { in: [...created.payments] } }, select: { id: true } })],
          ['charges', prisma.charge.findMany({ where: { id: { in: [...created.charges] } }, select: { id: true } })],
          ['graduations', prisma.graduation.findMany({ where: { id: { in: [...created.graduations] } }, select: { id: true } })],
          ['documents', prisma.document.findMany({ where: { id: { in: [...created.documents] } }, select: { id: true } })],
          ['attendances', prisma.attendance.findMany({ where: { id: { in: [...created.attendances] } }, select: { id: true } })],
          ['studentClasses', prisma.studentClass.findMany({ where: { id: { in: [...created.studentClasses] } }, select: { id: true } })],
          ['studentModalities', prisma.studentModality.findMany({ where: { id: { in: [...created.studentModalities] } }, select: { id: true } })],
          ['studentPlans', prisma.studentPlan.findMany({ where: { id: { in: [...created.studentPlans] } }, select: { id: true } })],
          ['students', prisma.student.findMany({ where: { id: { in: [...created.students] } }, select: { id: true } })],
          ['people', prisma.person.findMany({ where: { id: { in: [...created.people] } }, select: { id: true } })],
          ['classes', prisma.class.findMany({ where: { id: { in: [...created.classes] } }, select: { id: true } })],
          ['modalities', prisma.modality.findMany({ where: { id: { in: [...created.modalities] } }, select: { id: true } })],
          ['plans', prisma.plan.findMany({ where: { id: { in: [...created.plans] } }, select: { id: true } })],
          ['users', prisma.user.findMany({ where: { id: { in: [...created.users] } }, select: { id: true } })],
        ];
        for (const [type, query] of checks) {
          try {
            const remainingIds = new Set((await query).map(({ id }) => id));
            created[type].forEach((id) => (remainingIds.has(id) ? cleanup.remaining : cleanup.removed).push(`${type}:${id}`));
          }
          catch (error) { cleanup.errors.push(`verify-${type}: ${error instanceof Error ? error.message : 'erro desconhecido'}`); }
        }
        if (storage) for (const key of storageKeys) {
          try { (await storage.exists(key) ? cleanup.remaining : cleanup.removed).push(`storage:${key}`); }
          catch (error) { cleanup.errors.push(`verify-storage:${key}: ${error instanceof Error ? error.message : 'erro desconhecido'}`); }
        }
        if (originalAdmin) {
          try {
            const admin = await prisma.user.findUnique({ where: { id: originalAdmin.id } });
            if (!admin || admin.name !== originalAdmin.name || admin.password !== originalAdmin.password
              || admin.role !== originalAdmin.role || admin.active !== originalAdmin.active || admin.email !== ADMIN_EMAIL) {
              cleanup.remaining.push(`admin-not-restored:${originalAdmin.id}`);
            }
          } catch (error) { cleanup.errors.push(`verify-admin: ${error instanceof Error ? error.message : 'erro desconhecido'}`); }
        }
      }
    } finally {
      if (app) await app.close();
      process.stdout.write(`SMOKE CLEANUP ${JSON.stringify(cleanup)}\n`);
    }
    if (cleanup.errors.length || cleanup.remaining.length) throw new Error(`Cleanup incompleto: ${JSON.stringify(cleanup)}`);
  }, 30_000);

  it('valida os fluxos reais e o RBAC sem deixar dados permanentes', async () => {
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email: ADMIN_EMAIL, password }).expect(201);
    const adminToken = login.body.access_token as string;
    expect(adminToken).toBeTruthy();
    await request(app.getHttpServer()).get('/auth/me').set(auth(adminToken)).expect(200).expect(({ body }) => {
      expect(body).toMatchObject({ id: adminId, email: ADMIN_EMAIL, role: 'ADMIN' });
    });

    const teacherLogin = await request(app.getHttpServer()).post('/auth/login').send({ email: TEACHER_EMAIL, password }).expect(201);
    const teacherToken = teacherLogin.body.access_token as string;
    await request(app.getHttpServer()).get('/charges').set(auth(teacherToken)).expect(403);

    const startDate = new Date().toISOString();
    const unique = Date.now();
    const enrollment = await request(app.getHttpServer()).post('/enrollments').set(auth(adminToken)).send({
      person: { name: marker, cpf: validCpf(unique % 1_000_000_000), email: `${unique}@smoke.wggrappling.local`, phone: '11999999999' },
      student: { status: 'ACTIVE', joinedAt: startDate, notes: marker },
      planId,
      monthlyPrice: 100,
      billingDay: 10,
      startDate,
      modalityIds: [modalityId],
      classIds: [classId],
    }).expect(201);
    studentId = track('students', enrollment.body.data.studentId);
    track('studentPlans', enrollment.body.data.studentPlanId);
    enrollment.body.data.studentModalityIds.forEach((id: number) => track('studentModalities', id));
    enrollment.body.data.studentClassIds.forEach((id: number) => track('studentClasses', id));
    const student = await prisma.student.findUnique({ where: { id: studentId }, include: { plans: true, modalities: true, studentClasses: true, charges: true } });
    expect(student).toBeTruthy();
    personId = track('people', student!.personId);
    student!.charges.forEach(({ id }) => track('charges', id));
    expect(student!.plans).toHaveLength(1);
    expect(student!.modalities).toHaveLength(1);
    expect(student!.studentClasses).toHaveLength(1);
    expect(student!.charges.length).toBeGreaterThan(0);

    const charges = await request(app.getHttpServer()).get(`/charges?studentId=${studentId}`).set(auth(adminToken)).expect(200);
    expect(charges.body.total).toBeGreaterThan(0);
    const charge = charges.body.data[0];
    const payment = await request(app.getHttpServer()).post(`/charges/${charge.id}/payments`).set(auth(adminToken)).send({
      amount: Number(charge.finalAmount), method: 'PIX', paidAt: new Date().toISOString(), reference: marker,
    }).expect(201);
    track('payments', payment.body.data.payment.id);
    expect(payment.body.data.status).toBe('PAID');

    const attendanceDate = new Date(Date.now() + 1000).toISOString();
    const attendance = await request(app.getHttpServer()).post('/attendance').set(auth(adminToken)).send({
      classId, studentId, attendanceDate, status: 'PRESENT', notes: marker,
    }).expect(201);
    track('attendances', attendance.body.id);
    await request(app.getHttpServer()).get(`/attendance?studentId=${studentId}`).set(auth(adminToken)).expect(200).expect(({ body }) => {
      expect(body.some((item: { id: number }) => item.id === attendance.body.id)).toBe(true);
    });

    const graduation = await request(app.getHttpServer()).post(`/students/${studentId}/graduations`).set(auth(adminToken)).send({
      modalityId, belt: 'WHITE', beltStartedAt: startDate, graduatedAt: new Date(Date.now() + 2000).toISOString(), notes: marker,
    }).expect(201);
    track('graduations', graduation.body.id);
    await request(app.getHttpServer()).get(`/students/${studentId}/graduations`).set(auth(adminToken)).expect(200).expect(({ body }) => {
      expect(body.some((item: { id: number }) => item.id === graduation.body.id)).toBe(true);
    });

    const pdf = Buffer.from('%PDF-1.4\n%%EOF\n');
    const uploaded = await request(app.getHttpServer()).post(`/students/${studentId}/documents`).set(auth(adminToken))
      .field('type', 'OTHER').attach('file', pdf, { filename: 'smoke-test.pdf', contentType: 'application/pdf' }).expect(201);
    documentId = track('documents', uploaded.body.data.id);
    const storedDocument = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    storageKeys.add(storedDocument.storagePath);
    await request(app.getHttpServer()).get(`/students/${studentId}/documents`).set(auth(adminToken)).expect(200).expect(({ body }) => {
      expect(body.data.some((item: { id: number }) => item.id === documentId)).toBe(true);
    });
    await request(app.getHttpServer()).get(`/documents/${documentId}/file`).set(auth(adminToken)).expect(200).expect('Content-Type', /application\/pdf/);

    await request(app.getHttpServer()).get(`/students/${studentId}/history`).set(auth(adminToken)).expect(200).expect(({ body }) => {
      const types = new Set(body.map((event: { type: string }) => event.type));
      for (const type of ['ENROLLMENT', 'PAYMENT', 'ATTENDANCE', 'GRADUATION', 'DOCUMENT']) expect(types.has(type)).toBe(true);
    });
    await request(app.getHttpServer()).delete(`/documents/${documentId}`).set(auth(adminToken)).expect(200);
    await request(app.getHttpServer()).get(`/students/${studentId}/documents`).set(auth(adminToken)).expect(200).expect(({ body }) => {
      expect(body.data.some((item: { id: number }) => item.id === documentId)).toBe(false);
    });

    await request(app.getHttpServer()).get(`/audit?userId=${adminId}&from=${encodeURIComponent(runStartedAt.toISOString())}&pageSize=100`)
      .set(auth(adminToken)).expect(200).expect(({ body }) => {
        const entities = new Set(body.data.map((entry: { entity: string }) => entry.entity));
        for (const entity of ['Enrollment', 'Payment', 'Attendance', 'Graduation', 'Document']) expect(entities.has(entity)).toBe(true);
      });
  }, 60_000);
});

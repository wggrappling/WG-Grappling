import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogService, enrollmentService } from '../services';
import type { ClassOption, ModalityOption, PlanOption } from '../types';

type Catalogs = { plans: PlanOption[]; modalities: ModalityOption[]; classes: ClassOption[] };
type FormState = Record<'name' | 'cpf' | 'email' | 'phone' | 'startDate' | 'planId' | 'monthlyPrice' | 'billingDay' | 'modalityId' | 'classId', string>;

const initialForm: FormState = {
  name: '', cpf: '', email: '', phone: '', startDate: new Date().toISOString().slice(0, 10),
  planId: '', monthlyPrice: '', billingDay: '10', modalityId: '', classId: '',
};

export function NewStudentPage() {
  const navigate = useNavigate();
  const submittingRef = useRef(false);
  const [form, setForm] = useState(initialForm);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([catalogService.getPlans(), catalogService.getModalities(), catalogService.getClasses()])
      .then(([plans, modalities, classes]) => active && setCatalogs({ plans, modalities, classes }))
      .catch((cause: unknown) => active && setError(cause instanceof Error ? cause.message : 'Erro ao carregar dados da matrícula.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const classes = useMemo(() => catalogs?.classes.filter((item) => item.active && (!form.modalityId || item.modalityId === Number(form.modalityId))) ?? [], [catalogs, form.modalityId]);
  const setField = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const handlePlan = (planId: string) => {
    const plan = catalogs?.plans.find((item) => item.id === Number(planId));
    setForm((current) => ({ ...current, planId, monthlyPrice: plan ? String(plan.price) : '' }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setError(null);
    const cpf = form.cpf.replace(/\D/g, '');
    if (form.name.trim().length < 3 || cpf.length !== 11 || !form.email.includes('@') || !form.planId || !form.modalityId || !form.classId || Number(form.monthlyPrice) < 0 || Number(form.billingDay) < 1 || Number(form.billingDay) > 31) {
      setValidation('Revise os campos obrigatórios. CPF deve ter 11 dígitos e vencimento deve estar entre 1 e 31.');
      return;
    }
    setValidation(null);
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const startDate = `${form.startDate}T00:00:00.000Z`;
      const response = await enrollmentService.createNewStudent({
        person: { name: form.name.trim(), cpf, email: form.email.trim(), ...(form.phone.trim() ? { phone: form.phone.trim() } : {}) },
        student: { joinedAt: startDate, status: 'ACTIVE' },
        planId: Number(form.planId), monthlyPrice: Number(form.monthlyPrice), billingDay: Number(form.billingDay), startDate,
        modalityIds: [Number(form.modalityId)], classIds: [Number(form.classId)],
      });
      navigate(`/students/${response.data.studentId}`, { replace: true, state: { successMessage: response.message } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível matricular o aluno.');
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <main className="students-page">
      <header className="students-page-header"><div><p className="section-eyebrow">Recepção</p><h1>Novo aluno</h1><p>Cadastre os dados e conclua a matrícula em uma única operação.</p></div><button className="secondary-action-button" type="button" onClick={() => navigate('/students')} disabled={submitting}>Voltar</button></header>
      {loading && <section className="student-load-state"><span className="loading-spinner" /><p>Carregando planos, modalidades e turmas...</p></section>}
      {!loading && error && !catalogs && <section className="student-load-state" role="alert"><strong>Não foi possível preparar o cadastro.</strong><p>{error}</p></section>}
      {!loading && catalogs && (
        <form className="new-student-form" onSubmit={submit} noValidate>
          {(validation || error) && <div className="form-error" role="alert">{validation ?? error}</div>}
          <fieldset disabled={submitting}><legend>1. Dados pessoais</legend><div className="form-grid">
            <label>Nome<input value={form.name} onChange={(e) => setField('name', e.target.value)} required /></label>
            <label>CPF<input value={form.cpf} onChange={(e) => setField('cpf', e.target.value)} inputMode="numeric" required /></label>
            <label>E-mail<input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} required /></label>
            <label>Telefone<input value={form.phone} onChange={(e) => setField('phone', e.target.value)} /></label>
          </div></fieldset>
          <fieldset disabled={submitting}><legend>2. Matrícula</legend><div className="form-grid">
            <label>Data de entrada<input type="date" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} required /></label>
            <label>Plano<select value={form.planId} onChange={(e) => handlePlan(e.target.value)} required><option value="">Selecione</option>{catalogs.plans.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label>Valor mensal<input type="number" min="0" step="0.01" value={form.monthlyPrice} onChange={(e) => setField('monthlyPrice', e.target.value)} required /></label>
            <label>Dia de vencimento<input type="number" min="1" max="31" value={form.billingDay} onChange={(e) => setField('billingDay', e.target.value)} required /></label>
          </div></fieldset>
          <fieldset disabled={submitting}><legend>3. Vínculos</legend><div className="form-grid">
            <label>Modalidade<select value={form.modalityId} onChange={(e) => { setField('modalityId', e.target.value); setField('classId', ''); }} required><option value="">Selecione</option>{catalogs.modalities.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
            <label>Turma<select value={form.classId} onChange={(e) => setField('classId', e.target.value)} required><option value="">Selecione</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          </div></fieldset>
          <div className="form-actions"><button type="submit" className="open-student-button" disabled={submitting}>{submitting ? 'Matriculando...' : 'Cadastrar e matricular'}</button></div>
        </form>
      )}
    </main>
  );
}

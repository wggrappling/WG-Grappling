import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogService, enrollmentService } from '../services';
import type { ClassOption, ModalityOption, PlanOption } from '../types';

type Catalogs = { plans: PlanOption[]; modalities: ModalityOption[]; classes: ClassOption[] };
type FormState = {
  name: string; cpf: string; email: string; phone: string; status: 'ACTIVE' | 'PAUSED' | 'INACTIVE';
  startDate: string; notes: string; planId: string; monthlyPrice: string; billingDay: string;
  zipCode: string; street: string; number: string; complement: string; neighborhood: string;
  city: string; state: string; country: string; responsibleName: string; responsibleCpf: string;
  responsibleEmail: string; responsiblePhone: string; relationship: string;
};

const initialForm: FormState = {
  name: '', cpf: '', email: '', phone: '', status: 'ACTIVE', startDate: new Date().toISOString().slice(0, 10),
  notes: '', planId: '', monthlyPrice: '', billingDay: '10', zipCode: '', street: '', number: '', complement: '',
  neighborhood: '', city: '', state: '', country: 'Brasil', responsibleName: '', responsibleCpf: '',
  responsibleEmail: '', responsiblePhone: '', relationship: '',
};

function isValidCpf(value: string) {
  const cpf = value.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    const sum = cpf.slice(0, length).split('').reduce((total, number, index) => total + Number(number) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function NewStudentPage() {
  const navigate = useNavigate();
  const submittingRef = useRef(false);
  const [form, setForm] = useState(initialForm);
  const [modalityIds, setModalityIds] = useState<number[]>([]);
  const [classIds, setClassIds] = useState<number[]>([]);
  const [includeAddress, setIncludeAddress] = useState(false);
  const [includeResponsible, setIncludeResponsible] = useState(false);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([catalogService.getPlans(), catalogService.getModalities(), catalogService.getClasses()])
      .then(([plans, modalities, classes]) => active && setCatalogs({ plans, modalities, classes }))
      .catch((cause: unknown) => active && setError(cause instanceof Error ? cause.message : 'Erro ao carregar dados da matrícula.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const availableClasses = useMemo(() => catalogs?.classes.filter((item) => item.active && item.teacher?.active !== false && modalityIds.includes(item.modalityId)) ?? [], [catalogs, modalityIds]);
  const setField = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const toggleId = (id: number, selected: number[], update: (ids: number[]) => void) => update(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  const handlePlan = (planId: string) => {
    const plan = catalogs?.plans.find((item) => item.id === Number(planId));
    setForm((current) => ({ ...current, planId, monthlyPrice: plan ? String(plan.price) : '' }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setError(null);
    const cpf = form.cpf.replace(/\D/g, '');
    const responsibleCpf = form.responsibleCpf.replace(/\D/g, '');
    const invalidAddress = includeAddress && (![form.zipCode, form.street, form.neighborhood, form.city, form.state].every((value) => value.trim()) || form.state.trim().length !== 2);
    const invalidResponsible = includeResponsible && (!form.responsibleName.trim() || !isValidCpf(responsibleCpf) || !form.relationship.trim() || (form.responsibleEmail && !form.responsibleEmail.includes('@')));
    if (form.name.trim().length < 3 || !isValidCpf(cpf) || !form.email.includes('@') || !form.planId || modalityIds.length === 0 || classIds.length === 0 || Number(form.monthlyPrice) < 0 || !form.startDate || Number(form.billingDay) < 1 || Number(form.billingDay) > 31 || invalidAddress || invalidResponsible) {
      setError('Revise os campos obrigatórios e os dados de CPF, endereço, responsável e matrícula.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const startDate = `${form.startDate}T00:00:00.000Z`;
      const response = await enrollmentService.createNewStudent({
        person: { name: form.name.trim(), cpf, email: form.email.trim(), ...(form.phone.trim() ? { phone: form.phone.trim() } : {}) },
        student: { joinedAt: startDate, status: form.status, ...(form.notes.trim() ? { notes: form.notes.trim() } : {}) },
        ...(includeAddress ? { address: { zipCode: form.zipCode.trim(), street: form.street.trim(), ...(form.number.trim() ? { number: form.number.trim() } : {}), ...(form.complement.trim() ? { complement: form.complement.trim() } : {}), neighborhood: form.neighborhood.trim(), city: form.city.trim(), state: form.state.trim().toUpperCase(), country: form.country.trim() || 'Brasil' } } : {}),
        ...(includeResponsible ? { responsible: { name: form.responsibleName.trim(), cpf: responsibleCpf, ...(form.responsibleEmail.trim() ? { email: form.responsibleEmail.trim() } : {}), ...(form.responsiblePhone.trim() ? { phone: form.responsiblePhone.trim() } : {}), relationship: form.relationship.trim() } } : {}),
        planId: Number(form.planId), monthlyPrice: Number(form.monthlyPrice), billingDay: Number(form.billingDay), startDate, modalityIds, classIds,
      });
      navigate(`/students/${response.data.studentId}`, { replace: true, state: { successMessage: response.message } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível matricular o aluno. Nenhum dado foi salvo.');
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return <main className="students-page">
    <header className="students-page-header"><div><p className="section-eyebrow">Recepção</p><h1>Novo aluno</h1><p>Cadastro completo em uma única operação transacional.</p></div><button className="secondary-action-button" type="button" onClick={() => navigate('/students')} disabled={submitting}>Voltar</button></header>
    {loading && <section className="student-load-state"><span className="loading-spinner" /><p>Carregando catálogos...</p></section>}
    {!loading && error && !catalogs && <section className="student-load-state" role="alert"><strong>Não foi possível preparar o cadastro.</strong><p>{error}</p></section>}
    {!loading && catalogs && <form className="new-student-form" onSubmit={submit} noValidate>
      {error && <div className="form-error" role="alert">{error}</div>}
      <fieldset disabled={submitting}><legend>1. Dados pessoais</legend><div className="form-grid">
        <label>Nome<input value={form.name} onChange={(e) => setField('name', e.target.value)} required /></label>
        <label>CPF<input value={form.cpf} onChange={(e) => setField('cpf', e.target.value)} inputMode="numeric" required /></label>
        <label>E-mail<input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} required /></label>
        <label>Telefone<input value={form.phone} onChange={(e) => setField('phone', e.target.value)} /></label>
      </div></fieldset>
      <fieldset disabled={submitting}><legend>2. Endereço</legend><label className="optional-section-toggle"><input type="checkbox" checked={includeAddress} onChange={(e) => setIncludeAddress(e.target.checked)} /> Incluir endereço</label>{includeAddress && <div className="form-grid">
        <label>CEP<input value={form.zipCode} onChange={(e) => setField('zipCode', e.target.value)} required /></label><label>Rua<input value={form.street} onChange={(e) => setField('street', e.target.value)} required /></label>
        <label>Número<input value={form.number} onChange={(e) => setField('number', e.target.value)} /></label><label>Complemento<input value={form.complement} onChange={(e) => setField('complement', e.target.value)} /></label>
        <label>Bairro<input value={form.neighborhood} onChange={(e) => setField('neighborhood', e.target.value)} required /></label><label>Cidade<input value={form.city} onChange={(e) => setField('city', e.target.value)} required /></label>
        <label>Estado<input maxLength={2} value={form.state} onChange={(e) => setField('state', e.target.value)} required /></label><label>País<input value={form.country} onChange={(e) => setField('country', e.target.value)} /></label>
      </div>}</fieldset>
      <fieldset disabled={submitting}><legend>3. Responsável</legend><label className="optional-section-toggle"><input type="checkbox" checked={includeResponsible} onChange={(e) => setIncludeResponsible(e.target.checked)} /> Incluir responsável</label>{includeResponsible && <div className="form-grid">
        <label>Nome<input value={form.responsibleName} onChange={(e) => setField('responsibleName', e.target.value)} required /></label><label>CPF<input value={form.responsibleCpf} onChange={(e) => setField('responsibleCpf', e.target.value)} required /></label>
        <label>E-mail<input type="email" value={form.responsibleEmail} onChange={(e) => setField('responsibleEmail', e.target.value)} /></label><label>Telefone<input value={form.responsiblePhone} onChange={(e) => setField('responsiblePhone', e.target.value)} /></label>
        <label>Grau de parentesco<input value={form.relationship} onChange={(e) => setField('relationship', e.target.value)} required /></label>
      </div>}</fieldset>
      <fieldset disabled={submitting}><legend>4. Matrícula</legend><div className="form-grid">
        <label>Status<select value={form.status} onChange={(e) => setField('status', e.target.value)}><option value="ACTIVE">Ativo</option><option value="PAUSED">Pausado</option><option value="INACTIVE">Inativo</option></select></label>
        <label>Data de entrada<input type="date" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} required /></label>
        <label>Plano<select value={form.planId} onChange={(e) => handlePlan(e.target.value)} required><option value="">Selecione</option>{catalogs.plans.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Valor mensal<input type="number" min="0" step="0.01" value={form.monthlyPrice} onChange={(e) => setField('monthlyPrice', e.target.value)} required /></label>
        <label>Dia de vencimento<input type="number" min="1" max="31" value={form.billingDay} onChange={(e) => setField('billingDay', e.target.value)} required /></label>
        <label>Observações<textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} /></label>
      </div><div className="enrollment-selection"><strong>Modalidades</strong><div className="selection-options">{catalogs.modalities.filter((item) => item.active).map((item) => <label key={item.id}><input type="checkbox" checked={modalityIds.includes(item.id)} onChange={() => { toggleId(item.id, modalityIds, setModalityIds); setClassIds((current) => current.filter((classId) => catalogs.classes.some((course) => course.id === classId && course.modalityId !== item.id))); }} />{item.name}</label>)}</div></div>
      <div className="enrollment-selection"><strong>Turmas</strong><div className="selection-options">{availableClasses.map((item) => <label key={item.id}><input type="checkbox" checked={classIds.includes(item.id)} onChange={() => toggleId(item.id, classIds, setClassIds)} />{item.name}</label>)}</div>{availableClasses.length === 0 && <p>Selecione uma modalidade para visualizar turmas ativas.</p>}</div></fieldset>
      <div className="form-actions"><button type="submit" className="open-student-button" disabled={submitting}>{submitting ? 'Matriculando...' : 'Cadastrar e matricular'}</button></div>
    </form>}
  </main>;
}

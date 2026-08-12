import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceService, catalogService } from '../services';
import type { ClassOption } from '../types';
import type { Attendance, AttendanceStatus, ClassStudents } from '../types/attendance';

export function AttendancePage() {
  const navigate = useNavigate();
  const sendingRef = useRef(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState('');
  const [roster, setRoster] = useState<ClassStudents | null>(null);
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [existing, setExisting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { catalogService.getClasses().then((items) => setClasses(items.filter((item) => item.active))).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Erro ao carregar turmas.')).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    if (!classId) { setRoster(null); return; }
    let active = true; setLoading(true); setError(null); setMessage(null);
    Promise.all([attendanceService.getClassStudents(Number(classId)), attendanceService.getAll({ classId: Number(classId), startDate: `${date}T00:00:00.000Z`, endDate: `${date}T23:59:59.999Z` })])
      .then(([classRoster, records]) => { if (!active) return; setRoster(classRoster); const current: Record<number, AttendanceStatus> = {}; classRoster.students.forEach((student) => { current[student.id] = records.find((item: Attendance & { student?: { id: number } }) => item.student?.id === student.id)?.status ?? 'PRESENT'; }); setStatuses(current); setExisting(records.length > 0); })
      .catch((cause: unknown) => active && setError(cause instanceof Error ? cause.message : 'Erro ao carregar chamada.')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [classId, date]);

  const save = async () => {
    if (!roster || existing || sendingRef.current || roster.students.length === 0) return;
    sendingRef.current = true; setSending(true); setError(null);
    try { const result = await attendanceService.createBatch({ classId: roster.class.id, attendanceDate: `${date}T12:00:00.000Z`, students: roster.students.map((student) => ({ studentId: student.id, status: statuses[student.id] ?? 'PRESENT' })) }); setMessage(result.message); setExisting(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a chamada.'); }
    finally { sendingRef.current = false; setSending(false); }
  };

  return <main className="students-page"><header className="students-page-header"><div><p className="section-eyebrow">Operação</p><h1>Chamada</h1><p>Registre a presença dos alunos por turma.</p></div><button className="secondary-action-button" onClick={() => navigate('/students')}>Voltar</button></header><section className="attendance-call-card"><div className="attendance-call-filters"><label>Data<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label>Turma<select value={classId} onChange={(e) => setClassId(e.target.value)}><option value="">Selecione</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>{loading && <div className="students-list-state"><span className="loading-spinner" /><p>Carregando chamada...</p></div>}{error && <div className="form-error" role="alert">{error}</div>}{message && <div className="financial-success">{message}</div>}{!loading && roster && <><div className="attendance-call-heading"><div><h2>{roster.class.name}</h2><p>{roster.class.modality} · {roster.class.teacher}</p></div>{existing && <strong>Chamada já registrada</strong>}</div>{roster.students.length === 0 ? <div className="students-list-state"><strong>Turma sem alunos</strong></div> : <div className="attendance-roster">{roster.students.map((student) => <div key={student.id} className="attendance-student"><strong>{student.name}</strong><div><label><input type="radio" name={`student-${student.id}`} checked={statuses[student.id] === 'PRESENT'} onChange={() => setStatuses((current) => ({ ...current, [student.id]: 'PRESENT' }))} disabled={existing} /> Presente</label><label><input type="radio" name={`student-${student.id}`} checked={statuses[student.id] === 'ABSENT'} onChange={() => setStatuses((current) => ({ ...current, [student.id]: 'ABSENT' }))} disabled={existing} /> Ausente</label><label><input type="radio" name={`student-${student.id}`} checked={statuses[student.id] === 'JUSTIFIED'} onChange={() => setStatuses((current) => ({ ...current, [student.id]: 'JUSTIFIED' }))} disabled={existing} /> Justificada</label></div></div>)}</div>}<div className="form-actions"><button className="primary-action-button" type="button" onClick={() => void save()} disabled={sending || existing || roster.students.length === 0}>{sending ? 'Salvando...' : existing ? 'Chamada registrada' : 'Salvar chamada'}</button></div></>}</section></main>;
}

import { useEffect } from 'react';
import { useApiRequest } from '../../hooks';
import { attendanceService } from '../../services';
import type { Attendance } from '../../types/attendance';

const labels = { PRESENT: 'Presente', ABSENT: 'Ausente', JUSTIFIED: 'Justificada' } as const;
export function StudentAttendanceTab({ studentId }: { studentId: number }) {
  const { data, error, loading, execute } = useApiRequest<Attendance[], [number]>();
  useEffect(() => { void execute(attendanceService.getByStudent, studentId).catch(() => undefined); }, [execute, studentId]);
  return <section id="panel-Presença" className="documents-panel" role="tabpanel" aria-labelledby="tab-Presença"><div className="documents-panel-heading"><div><p className="section-eyebrow">Frequência</p><h2>Presença</h2><p>Registros reais de frequência do aluno.</p></div></div><div className="documents-table-card">
    {loading && <div className="documents-state"><span className="loading-spinner" /><p>Carregando presenças...</p></div>}
    {error && <div className="documents-state documents-state-error" role="alert"><strong>Não foi possível carregar as presenças.</strong><p>{error.message}</p></div>}
    {!loading && !error && data?.length === 0 && <div className="documents-state"><strong>Nenhuma presença registrada</strong><p>Não há registros de frequência para este aluno.</p></div>}
    {!loading && !error && data && data.length > 0 && <div className="documents-table-scroll"><table className="documents-table"><thead><tr><th>Data</th><th>Turma</th><th>Modalidade</th><th>Status</th></tr></thead><tbody>{data.map((item) => <tr key={item.id}><td>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(item.attendanceDate))}</td><td>{item.class.name}</td><td>{item.class.modality.name}</td><td><strong>{labels[item.status]}</strong></td></tr>)}</tbody></table></div>}
  </div></section>;
}

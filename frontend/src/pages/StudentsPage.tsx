import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiRequest, useAuth } from '../hooks';
import { studentService } from '../services';
import type { ApiListResponse, Student, StudentStatus } from '../types';

const statusDetails: Record<StudentStatus, { className: string; label: string }> = {
  ACTIVE: { className: 'active', label: 'Ativo' },
  PAUSED: { className: 'paused', label: 'Pausado' },
  INACTIVE: { className: 'inactive', label: 'Inativo' },
};

const normalizeSearchValue = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]/g, '')
  .toLowerCase();

export function StudentsPage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { data, error, loading, execute } = useApiRequest<ApiListResponse<Student>>();

  useEffect(() => {
    void execute(studentService.getAll).catch(() => undefined);
  }, [execute]);

  const students = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(search);
    const allStudents = data?.data ?? [];

    if (!normalizedSearch) return allStudents;

    return allStudents.filter((student) => [
      student.person.name,
      student.enrollmentNumber,
      student.person.cpf,
    ].some((value) => normalizeSearchValue(value).includes(normalizedSearch)));
  }, [data, search]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="students-page">
      <div className="session-bar">
        <span>Conectado como <strong>{user?.name}</strong></span>
        <button type="button" onClick={handleLogout}>Sair</button>
      </div>

      <header className="students-page-header">
        <div>
          <p className="section-eyebrow">Recepção</p>
          <h1>Alunos</h1>
          <p>Pesquise e acesse a Central do Aluno.</p>
        </div>
        {!loading && !error && <span>{data?.total ?? 0} aluno(s) cadastrado(s)</span>}
      </header>

      <section className="students-list-card" aria-labelledby="students-list-title">
        <h2 id="students-list-title" className="visually-hidden">Lista de alunos</h2>
        <label className="students-search">
          <span>Pesquisar aluno</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, matrícula ou CPF"
            disabled={loading || Boolean(error)}
          />
        </label>

        {loading && (
          <div className="students-list-state" aria-live="polite">
            <span className="loading-spinner" aria-hidden="true" />
            <p>Carregando alunos...</p>
          </div>
        )}

        {error && (
          <div className="students-list-state students-list-error" role="alert">
            <strong>Não foi possível carregar os alunos.</strong>
            <p>{error.message}</p>
          </div>
        )}

        {!loading && !error && students.length === 0 && (
          <div className="students-list-state">
            <strong>{search ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}</strong>
            <p>{search ? 'Revise os termos da pesquisa.' : 'A lista de alunos está vazia.'}</p>
          </div>
        )}

        {!loading && !error && students.length > 0 && (
          <div className="students-table-scroll">
            <table className="students-table">
              <thead>
                <tr><th>Matrícula</th><th>Nome</th><th>CPF</th><th>Modalidade principal</th><th>Status</th><th><span className="visually-hidden">Ações</span></th></tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const status = statusDetails[student.status];
                  return (
                    <tr key={student.id}>
                      <td><strong>{student.enrollmentNumber}</strong></td>
                      <td>{student.person.name}</td>
                      <td>{student.person.cpf}</td>
                      <td><span className="students-unavailable">Não disponível</span></td>
                      <td><span className={`students-status ${status.className}`}>{status.label}</span></td>
                      <td><button className="open-student-button" type="button" onClick={() => navigate(`/students/${student.id}`)}>Abrir Central</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

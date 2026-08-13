import type { PropsWithChildren } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export function AdminLayout({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  return <main className="students-page"><header className="students-page-header"><div><p className="section-eyebrow">Administração</p><h1>Cadastros da academia</h1><p>Gerencie os catálogos usados na operação.</p></div><button className="secondary-action-button" onClick={() => navigate('/students')}>Voltar aos alunos</button></header><nav className="admin-nav"><NavLink to="/admin/plans">Planos</NavLink><NavLink to="/admin/modalities">Modalidades</NavLink><NavLink to="/admin/classes">Turmas</NavLink></nav>{children}</main>;
}

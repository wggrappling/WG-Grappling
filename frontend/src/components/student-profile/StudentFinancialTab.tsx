import { financialSummary, studentCharges } from '../../mocks/studentFinancial';
import { FinancialStatusBadge } from './FinancialStatusBadge';
import { FinancialSummaryCard } from './FinancialSummaryCard';

export function StudentFinancialTab() {
  return (
    <section
      id="panel-Financeiro"
      className="financial-panel"
      role="tabpanel"
      aria-labelledby="tab-Financeiro"
    >
      <div className="financial-panel-heading">
        <div>
          <p className="section-eyebrow">Visão financeira</p>
          <h2>Resumo Financeiro</h2>
          <p>Acompanhe mensalidades, vencimentos e pagamentos do aluno.</p>
        </div>
        <div className="financial-actions">
          <button className="secondary-action-button" type="button">Registrar Pagamento</button>
          <button className="primary-action-button" type="button">Gerar PIX</button>
        </div>
      </div>

      <div className="financial-summary-grid">
        {financialSummary.map((item) => (
          <FinancialSummaryCard key={item.label} {...item} />
        ))}
      </div>

      <div className="financial-table-section">
        <div className="financial-table-heading">
          <h3>Histórico de cobranças</h3>
          <span>{studentCharges.length} lançamentos</span>
        </div>

        <div className="financial-table-scroll">
          <table className="financial-table">
            <thead>
              <tr>
                <th>Competência</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Forma de pagamento</th>
              </tr>
            </thead>
            <tbody>
              {studentCharges.map((charge) => (
                <tr key={charge.id}>
                  <td><strong>{charge.reference}</strong></td>
                  <td>{charge.dueDate}</td>
                  <td>{charge.amount}</td>
                  <td><FinancialStatusBadge status={charge.status} /></td>
                  <td>{charge.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

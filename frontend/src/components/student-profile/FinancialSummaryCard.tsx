import type { FinancialSummaryItem } from '../../mocks/studentFinancial';

type FinancialSummaryCardProps = FinancialSummaryItem;

export function FinancialSummaryCard({ label, value, detail, tone }: FinancialSummaryCardProps) {
  return (
    <article className={`financial-summary-card ${tone}`}>
      <span className="financial-summary-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export type FinancialSummaryItem = {
  label: string;
  value: string;
  detail: string;
  tone: 'primary' | 'neutral' | 'success' | 'warning';
};

export function FinancialSummaryCard({ label, value, detail, tone }: FinancialSummaryItem) {
  return (
    <article className={`financial-summary-card ${tone}`}>
      <span className="financial-summary-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

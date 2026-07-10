/**
 * FAZ 42 — CEO AI Executions özeti.
 * @param {{ summary: { today: number, success: number, waiting: number, rejected: number, failed: number } }} props
 */
export default function ExecutiveAiExecutions({ summary }) {
  if (!summary) return null

  const items = [
    { id: 'today', label: 'Bugün', value: summary.today, tone: 'info' },
    { id: 'success', label: 'Başarılı', value: summary.success, tone: 'success' },
    { id: 'waiting', label: 'Bekleyen', value: summary.waiting, tone: 'warning' },
    { id: 'rejected', label: 'Reddedilen', value: summary.rejected, tone: 'critical' },
    { id: 'failed', label: 'Başarısız', value: summary.failed, tone: 'critical' },
  ]

  return (
    <section className="ecc-ai-exec" aria-label="AI Executions">
      <h2 className="ecc-ai-exec__title">AI Executions</h2>
      <div className="ecc-ai-exec__grid">
        {items.map((item) => (
          <div key={item.id} className={`ecc-ai-exec__item ecc-ai-exec__item--${item.tone}`}>
            <span className="ecc-ai-exec__label">{item.label}</span>
            <span className="ecc-ai-exec__value">{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

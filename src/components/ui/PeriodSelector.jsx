export default function PeriodSelector({ periods, active, onChange, style }) {
  return (
    <div className="period-selector" style={style}>
      {periods.map((p) => (
        <button
          key={p.value}
          className={`period-btn${active === p.value ? ' active' : ''}`}
          onClick={() => onChange(p.value)}
          type="button"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

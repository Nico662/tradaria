export default function TextTabs({ tabs, active, onChange, style }) {
  return (
    <div className="text-tabs" style={style}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          className={`text-tab${active === tab.value ? ' active' : ''}`}
          onClick={() => onChange(tab.value)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

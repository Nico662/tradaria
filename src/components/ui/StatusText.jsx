export default function StatusText({ icon, children, color, style }) {
  return (
    <span className="status-text" style={{ ...(color ? { color } : {}), ...(style || {}) }}>
      {icon && <span className="status-text-icon">{icon}</span>}
      {children}
    </span>
  );
}

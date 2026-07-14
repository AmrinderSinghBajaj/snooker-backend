export default function Card({ children, style = {}, ...props }) {
  return (
    <div
      style={{
        background: 'var(--felt-700)',
        border: '1px solid var(--felt-600)',
        borderRadius: 'var(--radius-md)',
        padding: 20,
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

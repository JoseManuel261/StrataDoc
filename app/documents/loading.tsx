export default function Loading() {
  return (
    <div style={{ padding: '2rem', maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ height: '1.75rem', width: '200px', borderRadius: '0.5rem', background: 'var(--surface)', marginBottom: '0.5rem', animation: 'pulse 1.5s ease infinite' }} />
        <div style={{ height: '0.75rem', width: '100px', borderRadius: '0.25rem', background: 'var(--surface)', animation: 'pulse 1.5s ease infinite' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ height: '56px', borderRadius: '0.625rem', background: 'var(--surface)', animation: 'pulse 1.5s ease infinite', animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.25} }`}</style>
    </div>
  )
}

import { useEffect, useRef } from 'react';

export default function AdsenseBanner({ slot = 'auto', style: extraStyle = {} }) {
  const ref  = useRef(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    try {
      const adsByGoogle = window.adsbygoogle || [];
      adsByGoogle.push({});
      window.adsbygoogle = adsByGoogle;
    } catch {}
  }, []);

  return (
    <div style={{ textAlign: 'center', ...extraStyle }}>
      <div style={{ fontSize: '8px', color: 'var(--bd2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px', fontFamily: "'Space Mono', monospace" }}>
        Publicidad
      </div>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block', maxWidth: '468px', margin: '0 auto' }}
        data-ad-client="ca-pub-6935037378242518"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

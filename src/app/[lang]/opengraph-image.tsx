import { ImageResponse } from 'next/og';
import { getDict } from '@/i18n';
import { isLocale } from '@/i18n/config';

export const alt = 'CENTER';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const d = getDict(isLocale(lang) ? lang : 'en');
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 50% 42%, #2a0c46 0%, #0a0310 38%, #000 70%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: 999,
            background: 'radial-gradient(circle at 40% 34%, #ffffff 0%, #c48cff 22%, #7c00c8 55%, #12041d 100%)',
            boxShadow: '0 0 120px 30px rgba(140,60,255,0.55)',
            marginBottom: 50,
          }}
        />
        <div style={{ fontSize: 22, letterSpacing: 12, color: '#8a8a8a', textTransform: 'uppercase' }}>{d.common.kicker}</div>
        <div style={{ fontSize: 150, letterSpacing: 52, marginTop: 16, marginLeft: 52, lineHeight: 1 }}>CENTER</div>
        <div style={{ fontSize: 26, letterSpacing: 4, color: '#6f6f6f', marginTop: 26, fontStyle: 'italic' }}>{d.common.tagline}</div>
        <div style={{ display: 'flex', gap: 36, marginTop: 44 }}>
          {['#ff4a1c', '#3d9bff', '#a63cff', '#e8eef7'].map((c) => (
            <div key={c} style={{ width: 18, height: 18, borderRadius: 999, background: c, boxShadow: `0 0 24px 6px ${c}` }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}

'use client';
import { LOCALES } from '@/i18n/config';
import { useI18n } from '@/i18n/I18nProvider';
import styles from './LangSwitch.module.css';

/** EN · IT toggle. Swaps the language in place — a running match is kept. */
export function LangSwitch({ className }: { className?: string }) {
  const { lang, d, setLang } = useI18n();
  return (
    <div className={[styles.switch, className].filter(Boolean).join(' ')} role="group" aria-label={d.lang.label}>
      {LOCALES.map((l, i) => (
        <span key={l} className={styles.item}>
          {i > 0 && <span className={styles.sep} aria-hidden="true">·</span>}
          <button
            type="button"
            lang={l}
            className={[styles.btn, l === lang ? styles.on : ''].join(' ')}
            aria-pressed={l === lang}
            title={d.lang[l]}
            onClick={() => l !== lang && setLang(l)}
          >
            {d.lang.short[l]}
          </button>
        </span>
      ))}
    </div>
  );
}

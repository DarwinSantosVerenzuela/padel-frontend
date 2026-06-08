'use client';

import { useState, useCallback } from 'react';
import { Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTranslation, type Locale } from '@/i18n';
import styles from './TranslateButton.module.css';

interface TranslateButtonProps {
  sourceId: string;
  sourceType: 'post' | 'comment' | 'message';
  originalText: string;
}

const LANG_NAMES: Record<string, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
};

/**
 * Simple language detection based on common words.
 * In production, use a proper API. This is a lightweight heuristic.
 */
function detectLanguage(text: string): string {
  const lower = text.toLowerCase();
  const esWords = ['que', 'del', 'los', 'las', 'una', 'con', 'por', 'para', 'como', 'más', 'está', 'pero', 'desde'];
  const enWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'with'];
  const ptWords = ['que', 'não', 'uma', 'com', 'para', 'você', 'como', 'mais', 'está', 'mas', 'desde', 'muito', 'também'];

  const countMatches = (words: string[]) =>
    words.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(lower)).length;

  const scores = { es: countMatches(esWords), en: countMatches(enWords), pt: countMatches(ptWords) };
  const max = Math.max(scores.es, scores.en, scores.pt);
  if (max === 0) return 'es'; // default

  if (scores.en === max) return 'en';
  if (scores.pt === max) return 'pt';
  return 'es';
}

export default function TranslateButton({ sourceId, sourceType, originalText }: TranslateButtonProps) {
  const { locale } = useTranslation();
  const supabase = createClient();
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourceLang, setSourceLang] = useState<string | null>(null);

  const detectedLang = detectLanguage(originalText);

  // Don't show button if content is likely in user's language
  if (detectedLang === locale && !translation) return null;

  const handleTranslate = useCallback(async () => {
    if (translation) {
      // Toggle back to original
      setTranslation(null);
      return;
    }

    setLoading(true);
    try {
      // Check cache first
      const { data: cached } = await supabase
        .from('translations_cache')
        .select('translated_text, source_lang')
        .eq('source_id', sourceId)
        .eq('target_lang', locale)
        .maybeSingle();

      if (cached) {
        setTranslation(cached.translated_text);
        setSourceLang(cached.source_lang);
        setLoading(false);
        return;
      }

      // Use free translation API (MyMemory - no key needed, 5000 chars/day)
      const langPair = `${detectedLang}|${locale}`;
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(originalText)}&langpair=${langPair}`
      );
      const data = await res.json();

      if (data?.responseData?.translatedText) {
        const translated = data.responseData.translatedText;
        setTranslation(translated);
        setSourceLang(detectedLang);

        // Cache the result
        await supabase.from('translations_cache').upsert({
          source_id: sourceId,
          source_type: sourceType,
          source_lang: detectedLang,
          target_lang: locale,
          translated_text: translated,
        }, { onConflict: 'source_id,target_lang' });
      }
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setLoading(false);
    }
  }, [translation, sourceId, sourceType, originalText, locale, detectedLang, supabase]);

  return (
    <div className={styles.container}>
      {translation && (
        <div className={styles.translatedBlock}>
          <span className={styles.translatedLabel}>
            Traducido de {LANG_NAMES[sourceLang || detectedLang] || sourceLang}
          </span>
          <p className={styles.translatedText}>{translation}</p>
        </div>
      )}
      <button
        className={styles.translateBtn}
        onClick={handleTranslate}
        disabled={loading}
      >
        <Globe size={12} />
        {loading ? '...' : translation ? 'Ver original' : 'Traducir'}
      </button>
    </div>
  );
}

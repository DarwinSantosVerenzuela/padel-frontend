'use client';

import { useState, useRef } from 'react';
import { Camera, X, Upload, Trash2 } from 'lucide-react';
import { compressAvatar, formatFileSize } from '@/lib/utils/imageCompressor';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useTranslation } from '@/i18n';
import styles from './AvatarUpload.module.css';

interface AvatarUploadProps {
  currentUrl: string | null;
  currentEmoji: string;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
}

export default function AvatarUpload({ currentUrl, currentEmoji, onUploaded, onRemoved }: AvatarUploadProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileInfo, setFileInfo] = useState<string | null>(null);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      const { blob, preview: prev } = await compressAvatar(file);
      setPreview(prev);
      setFileInfo(formatFileSize(blob.size));

      // Upload to Supabase Storage
      const path = `${user.id}/avatar.webp`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      // Add cache-buster
      const url = `${publicUrl}?v=${Date.now()}`;

      // Update profile
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);

      onUploaded(url);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    try {
      await supabase.storage.from('avatars').remove([`${user.id}/avatar.webp`]);
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
      setPreview(null);
      setFileInfo(null);
      onRemoved();
    } catch (err) {
      console.error('Avatar remove failed:', err);
    }
  };

  const displayUrl = preview || currentUrl;

  return (
    <div className={styles.container}>
      <div className={styles.previewWrapper}>
        {displayUrl ? (
          <img src={displayUrl} alt="Avatar" className={styles.previewImg} />
        ) : (
          <div className={styles.emojiPreview}>{currentEmoji}</div>
        )}
        {uploading && (
          <div className={styles.uploadingOverlay}>
            <div className={styles.spinner} />
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button
          className={styles.uploadBtn}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          type="button"
        >
          {displayUrl ? (
            <><Camera size={14} /> {t('profile.changePhoto')}</>
          ) : (
            <><Upload size={14} /> {t('profile.uploadPhoto')}</>
          )}
        </button>

        {displayUrl && !uploading && (
          <button
            className={styles.removeBtn}
            onClick={handleRemove}
            type="button"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {fileInfo && <span className={styles.fileInfo}>{fileInfo}</span>}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleSelect}
        className={styles.hiddenInput}
      />
    </div>
  );
}

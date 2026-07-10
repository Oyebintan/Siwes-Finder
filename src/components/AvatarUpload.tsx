'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';

function initials(name?: string | null) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

// Circular profile picture (or square company logo) with an upload overlay.
// Uploads the image via /api/upload (kind: avatar) then persists the URL to
// the account through /api/profile — used by students, employers and schools.
export default function AvatarUpload({
  name,
  avatarUrl,
  onUploaded,
  shape = 'circle',
  size = 64,
}: {
  name?: string | null;
  avatarUrl?: string;
  onUploaded?: (url: string) => void;
  shape?: 'circle' | 'square';
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(avatarUrl || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'avatar');
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');

      const saveRes = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: uploadData.url }),
      });
      if (!saveRes.ok) throw new Error('Could not save your picture');

      setUrl(uploadData.url);
      onUploaded?.(uploadData.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Upload profile picture"
        className={`relative group shrink-0 overflow-hidden ${radius}`}
        style={{ width: size, height: size }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-primary-500 dark:bg-primary-400 text-white flex items-center justify-center font-display font-extrabold" style={{ fontSize: size / 3 }}>
            {initials(name)}
          </div>
        )}
        <div className={`absolute inset-0 flex items-center justify-center bg-black/45 transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />
      {error && <div className="text-[11px] text-error font-medium text-center max-w-[140px]">{error}</div>}
    </div>
  );
}

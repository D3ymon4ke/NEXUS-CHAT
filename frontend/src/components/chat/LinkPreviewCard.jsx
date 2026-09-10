import React, { useState, useEffect } from 'react';
import { ExternalLink, Globe, Play } from 'lucide-react';

const previewCache = new Map();

const apiBaseUrl = typeof window !== 'undefined' && window.location.protocol === 'https:'
  ? 'https://187-127-40-228.sslip.io:5000'
  : 'http://187.127.40.228:5000';

function getDomain(url) {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    return url;
  }
}

function getYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  return match ? match[1] : null;
}

export function LinkPreviewCard({ url, isOwn = false }) {
  if (!url) return null;

  const domain = getDomain(url);
  const ytId = getYouTubeId(url);
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;

  const [meta, setMeta] = useState(() => previewCache.get(fullUrl) || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ytId || meta || previewCache.has(fullUrl)) return;

    let isMounted = true;
    setLoading(true);

    fetch(`${apiBaseUrl}/api/link-preview?url=${encodeURIComponent(fullUrl)}`, {
      signal: AbortSignal.timeout(4000)
    })
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json?.success && json?.data) {
          previewCache.set(fullUrl, json.data);
          setMeta(json.data);
        }
      })
      .catch(() => {
        // Silencioso se offline
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fullUrl, ytId, meta]);

  // 1. YouTube Link Preview
  if (ytId) {
    const thumbUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    return (
      <a
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`block my-2 overflow-hidden rounded-2xl border transition-all hover:scale-[1.01] max-w-sm group select-none ${
          isOwn
            ? 'bg-black/30 border-white/20 text-white shadow-md'
            : 'bg-background-dark/90 border-slate-700 text-slate-200 shadow-lg'
        }`}
      >
        <div className="relative aspect-video w-full bg-black/60 overflow-hidden">
          <img
            src={thumbUrl}
            alt="YouTube Thumbnail"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/20 transition-colors">
            <div className="w-11 h-11 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </div>
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white uppercase tracking-wider">
            YouTube
          </span>
        </div>
        <div className="p-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-semibold text-red-400 block">youtube.com</span>
            <p className="text-xs font-medium truncate opacity-90">{url}</p>
          </div>
          <ExternalLink className="w-4 h-4 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>
      </a>
    );
  }

  // 2. Rich OpenGraph Card via VPS (com imagem ou título/descrição)
  if (meta && (meta.image || meta.title)) {
    return (
      <a
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`block my-2 overflow-hidden rounded-2xl border transition-all hover:scale-[1.01] max-w-sm group select-none ${
          isOwn
            ? 'bg-black/30 border-white/20 text-white shadow-md'
            : 'bg-background-dark/90 border-slate-700/80 text-slate-200 shadow-lg'
        }`}
      >
        {meta.image && (
          <div className="relative aspect-video w-full bg-black/40 overflow-hidden border-b border-white/5">
            <img
              src={meta.image}
              alt={meta.title || domain}
              onError={(e) => { e.target.style.display = 'none'; }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        )}
        <div className="p-3 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 truncate">
              {meta.siteName || domain}
            </span>
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
          {meta.title && (
            <h4 className="text-xs font-bold leading-snug line-clamp-2 text-white group-hover:text-brand-300 transition-colors">
              {meta.title}
            </h4>
          )}
          {meta.description && (
            <p className="text-[11px] leading-relaxed opacity-75 line-clamp-2">
              {meta.description}
            </p>
          )}
        </div>
      </a>
    );
  }

  // 3. Fallback: Compact Domain & Favicon Preview
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center gap-3 p-2.5 my-1.5 rounded-xl border transition-all hover:scale-[1.01] max-w-sm group select-none ${
        isOwn
          ? 'bg-black/25 hover:bg-black/35 border-white/20 text-white shadow-sm'
          : 'bg-background-dark/85 hover:bg-background-dark border-slate-700/80 text-slate-200 shadow-md'
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden p-1">
        <img
          src={faviconUrl}
          alt={domain}
          onError={(e) => {
            e.target.style.display = 'none';
            if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
          }}
          className="w-full h-full object-contain"
          loading="lazy"
        />
        <Globe className="w-4 h-4 text-slate-400 hidden" />
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 block truncate">
          {domain}
        </span>
        <p className="text-xs truncate font-medium opacity-85">{fullUrl}</p>
      </div>

      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

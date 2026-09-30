// ==========================================================
// apps/web/src/components/portfolio/MediaGallery.tsx
// Responsive Media Gallery with Broken Image Fallback & Lightbox
// ==========================================================

import React, { useState } from 'react';
import type { ProjectMedia } from '@kdi/types';
import { Image, Video, Maximize2, X, AlertCircle } from 'lucide-react';

export interface MediaGalleryProps {
  media?: Array<Omit<ProjectMedia, 'visibility'>>;
  screenshots?: string[];
  videos?: string[];
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  media = [],
  screenshots = [],
  videos = [],
}) => {
  const [selectedItem, setSelectedItem] = useState<{ url: string; type: string; caption?: string } | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  // Consolidate media items
  const allItems: Array<{ url: string; type: 'IMAGE' | 'VIDEO' | 'ARCHITECTURE_DIAGRAM'; alt: string; caption?: string }> = [];

  // Add structured media
  for (const m of media) {
    allItems.push({
      url: m.url,
      type: m.type === 'VIDEO' ? 'VIDEO' : m.type === 'ARCHITECTURE_DIAGRAM' ? 'ARCHITECTURE_DIAGRAM' : 'IMAGE',
      alt: m.altText || 'Project Media',
      caption: m.caption,
    });
  }

  // Add raw screenshots if not duplicated
  for (const scr of screenshots) {
    if (!allItems.some((item) => item.url === scr)) {
      allItems.push({
        url: scr,
        type: 'IMAGE',
        alt: 'Project Screenshot',
      });
    }
  }

  // Add raw videos
  for (const vid of videos) {
    if (!allItems.some((item) => item.url === vid)) {
      allItems.push({
        url: vid,
        type: 'VIDEO',
        alt: 'Project Demo Video',
      });
    }
  }

  const handleImageError = (url: string) => {
    setBrokenImages((prev) => new Set(prev).add(url));
  };

  if (allItems.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400">
        <Image className="w-8 h-8 mx-auto mb-2 text-slate-500" />
        <p className="text-xs">No media assets published for this project.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {allItems.map((item, idx) => {
          const isBroken = brokenImages.has(item.url);

          return (
            <div
              key={`${item.url}-${idx}`}
              className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900/90 aspect-video flex flex-col justify-between transition hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer"
              onClick={() => !isBroken && setSelectedItem(item)}
            >
              {isBroken ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center bg-slate-950">
                  <AlertCircle className="w-8 h-8 text-amber-500/70 mb-2" />
                  <span className="text-[11px] text-slate-400 font-medium">Asset Unavailable</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">Placeholder fallback</span>
                </div>
              ) : item.type === 'VIDEO' ? (
                <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                    <Video className="w-10 h-10 text-amber-400 group-hover:scale-110 transition" />
                  </div>
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={item.alt}
                  loading="lazy"
                  onError={() => handleImageError(item.url)}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
              )}

              {/* Caption Overlay */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-2.5 flex items-center justify-between text-[11px]">
                <span className="text-slate-300 truncate max-w-[80%] font-medium">
                  {item.caption || item.alt}
                </span>
                {!isBroken && (
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 p-3 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 px-2 border-b border-slate-800">
              <span className="text-xs font-medium text-slate-200 truncate">
                {selectedItem.caption || 'Media Asset Preview'}
              </span>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-2 overflow-auto">
              {selectedItem.type === 'VIDEO' ? (
                <video
                  src={selectedItem.url}
                  controls
                  autoPlay
                  className="max-h-[70vh] rounded-lg max-w-full"
                />
              ) : (
                <img
                  src={selectedItem.url}
                  alt={selectedItem.caption || 'Preview'}
                  className="max-h-[75vh] object-contain rounded-lg max-w-full"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

"use client";

import type { ViralVideo } from "@/types/edition";

interface ViralContentProps {
  videos?: ViralVideo[];
}

export function ViralContent({ videos }: ViralContentProps) {
  if (!videos || videos.length === 0) return null;

  return (
    <div className="mt-10 pt-8 border-t border-rule">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🎬</span>
        <h3 className="font-headline text-lg font-bold">Viral Videos</h3>
      </div>
      <div className="space-y-3">
        {videos.map((video, idx) => (
          <a
            key={idx}
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 bg-muted/30 border border-rule rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <span className="text-2xl flex-shrink-0">
              {video.platform === "youtube" ? "📺" : video.platform === "x" ? "𝕏" : "🎥"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-navy transition-colors">
                {video.description}
              </p>
              {video.postedBy && (
                <p className="text-xs text-muted-foreground mt-1">
                  Posted by {video.postedBy}
                </p>
              )}
            </div>
            <span className="text-muted-foreground text-sm">↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

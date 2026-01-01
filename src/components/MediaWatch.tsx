"use client";

import type { MediaCheck } from "@/types/edition";

interface MediaWatchProps {
  checks: MediaCheck[];
}

const verdictColors: Record<string, string> = {
  "Misleading": "bg-red-600",
  "Missing Context": "bg-orange-500",
  "Spin": "bg-yellow-500",
  "Omits Key Facts": "bg-orange-600",
  "Narrative Push": "bg-purple-600",
  "Fair Coverage": "bg-green-600",
};

const verdictEmoji: Record<string, string> = {
  "Misleading": "🚨",
  "Missing Context": "⚠️",
  "Spin": "🔄",
  "Omits Key Facts": "🙈",
  "Narrative Push": "📢",
  "Fair Coverage": "✅",
};

export function MediaWatch({ checks }: MediaWatchProps) {
  if (!checks || checks.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t-2 border-red">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">🔍</span>
        <div>
          <h2 className="font-headline text-xl font-bold text-foreground">
            Media Watch
          </h2>
          <p className="text-sm text-muted-foreground">
            How other outlets covered this story — fact-checked by Americans on X
          </p>
        </div>
      </div>

      {/* Bias checks */}
      <div className="space-y-6">
        {checks.map((check, idx) => (
          <div
            key={idx}
            className="bg-muted/30 border border-rule rounded-lg overflow-hidden"
          >
            {/* Source header with verdict */}
            <div className="flex items-center justify-between p-4 bg-muted/50 border-b border-rule">
              <div className="flex-1 min-w-0">
                <p className="font-headline font-semibold text-foreground truncate">
                  {check.sourceName}
                </p>
                <a
                  href={check.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-navy hover:underline line-clamp-1"
                >
                  {check.articleTitle}
                </a>
              </div>
              <span
                className={`ml-4 px-3 py-1 rounded-full text-white text-xs font-bold whitespace-nowrap ${
                  verdictColors[check.verdict] || "bg-gray-500"
                }`}
              >
                {verdictEmoji[check.verdict]} {check.verdict}
              </span>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Their narrative */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">
                  Their Narrative
                </p>
                <p className="text-sm text-foreground/90">
                  {check.theirNarrative}
                </p>
              </div>

              {/* What they omit */}
              <div className="bg-red/5 border-l-4 border-red p-3 rounded-r">
                <p className="text-xs font-bold uppercase tracking-wide text-red mb-1">
                  What They Omit
                </p>
                <p className="text-sm text-foreground/90">{check.whatTheyOmit}</p>
              </div>

              {/* X Reality */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  What Americans on X Are Saying
                </p>
                <p className="text-sm text-foreground/90 mb-3">{check.xReality}</p>

                {/* X Quotes */}
                {check.xQuotes && check.xQuotes.length > 0 && (
                  <div className="space-y-2">
                    {check.xQuotes.map((quote, qIdx) => (
                      <div
                        key={qIdx}
                        className="bg-background border border-rule rounded p-3"
                      >
                        <p className="text-sm italic text-foreground/80">
                          "{quote.quote}"
                        </p>
                        <p className="text-xs text-navy font-medium mt-1">
                          — {quote.handle}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground mt-4 text-center italic">
        Media Watch uses X/Twitter as a source of public sentiment to fact-check mainstream narratives.
      </p>
    </div>
  );
}

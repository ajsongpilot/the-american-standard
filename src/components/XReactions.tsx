"use client";

import type { XReaction } from "@/types/edition";

interface XReactionsProps {
  reactions: XReaction[];
}

export function XReactions({ reactions }: XReactionsProps) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="mt-10 pt-8 border-t border-rule">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">𝕏</span>
        <div>
          <h3 className="font-headline text-xl font-bold">Americans React</h3>
          <p className="text-sm text-muted-foreground">
            What people are saying about this story
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {reactions.map((reaction, idx) => {
          const postUrl = reaction.url || `https://x.com/${reaction.handle.replace("@", "")}`;
          
          return (
          <a
            key={idx}
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-background border border-rule rounded-xl p-4 hover:bg-muted/20 transition-colors group"
          >
            {/* Header - User info */}
            <div className="flex items-start gap-3">
              {/* Avatar placeholder */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy to-blue-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {reaction.handle.replace("@", "").charAt(0).toUpperCase()}
              </div>
              
              <div className="flex-1 min-w-0">
                {/* Name and handle */}
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-semibold text-foreground">
                    {reaction.displayName || reaction.handle.replace("@", "")}
                  </span>
                  {reaction.verified && (
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                    </svg>
                  )}
                  <a 
                    href={`https://x.com/${reaction.handle.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground text-sm hover:text-blue-500 hover:underline"
                  >
                    {reaction.handle}
                  </a>
                </div>

                {/* Tweet content */}
                <p className="mt-2 text-foreground whitespace-pre-wrap">
                  {reaction.quote}
                </p>

                {/* Engagement stats */}
                {(reaction.likes || reaction.reposts) && (
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    {reaction.reposts && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {reaction.reposts}
                      </span>
                    )}
                    {reaction.likes && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {reaction.likes}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* X logo */}
              <span className="text-muted-foreground group-hover:text-foreground transition-colors text-lg">
                𝕏
              </span>
            </div>
          </a>
          );
        })}
      </div>
    </div>
  );
}

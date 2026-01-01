"use client";

interface WhatItMeansProps {
  content: string;
}

export function WhatItMeans({ content }: WhatItMeansProps) {
  if (!content) return null;

  return (
    <div className="my-8 p-5 bg-gradient-to-r from-crimson/10 to-crimson/5 border-l-4 border-crimson rounded-r-lg">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🇺🇸</span>
        <h3 className="font-headline text-lg font-bold text-crimson">
          What This Means For You
        </h3>
      </div>
      <p className="text-foreground leading-relaxed">
        {content}
      </p>
    </div>
  );
}

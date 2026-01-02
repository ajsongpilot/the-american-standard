"use client";

import { formatEditionDate } from "@/types/edition";

interface MastheadProps {
  date: string;
}

export function Masthead({ date }: MastheadProps) {
  const formattedDate = formatEditionDate(date);

  return (
    <header className="w-full border-b border-rule">
      {/* Top thin rule */}
      <div className="h-px bg-rule-dark" />

      {/* Main masthead */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 text-center">
        {/* Tagline above */}
        <p className="text-xs sm:text-sm tracking-[0.25em] uppercase text-muted-foreground mb-2">
          Clear. Fair. American.
        </p>

        {/* Main title */}
        <h1 className="masthead-title text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-3">
          The American Standard
        </h1>

        {/* Date */}
        <p className="font-body text-base sm:text-lg text-foreground/80">
          {formattedDate}
        </p>
      </div>

      {/* Patriotic rule */}
      <div className="patriotic-rule" />
    </header>
  );
}

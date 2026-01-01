"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface GenerateButtonProps {
  force?: boolean;
  label?: string;
}

export function GenerateButton({ force = false, label }: GenerateButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    setStatus("Connecting to Grok AI...");

    try {
      setStatus("Searching trending news sources... (this may take 1-2 minutes)");
      
      const url = force ? "/api/generate-edition?force=true" : "/api/generate-edition";
      const response = await fetch(url, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        setStatus("Edition generated! Refreshing...");
        // Refresh the page to show the new content
        window.location.reload();
      } else {
        setError(data.error || "Failed to generate edition");
        setStatus(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate edition");
      setStatus(null);
    } finally {
      setIsGenerating(false);
    }
  }

  const buttonLabel = label || (force ? "Regenerate Edition" : "Generate Today's Edition");

  return (
    <div className="space-y-4">
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        size="lg"
        className="font-semibold"
        variant={force ? "outline" : "default"}
      >
        {isGenerating ? "Generating..." : buttonLabel}
      </Button>
      
      {status && (
        <p className="text-sm text-muted-foreground animate-pulse">{status}</p>
      )}
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      <p className="text-xs text-muted-foreground">
        {force 
          ? "This will replace the current edition with fresh content from trending news."
          : "This will use Grok AI to fetch and write articles based on today's real news."
        }
      </p>
    </div>
  );
}

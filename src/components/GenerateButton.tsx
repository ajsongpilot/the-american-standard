"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function GenerateButton() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    setStatus("Connecting to Grok AI...");

    try {
      setStatus("Searching real-time news sources... (this may take 1-2 minutes)");
      
      const response = await fetch("/api/generate-edition", {
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

  return (
    <div className="space-y-4">
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        size="lg"
        className="font-semibold"
      >
        {isGenerating ? "Generating..." : "Generate Today's Edition"}
      </Button>
      
      {status && (
        <p className="text-sm text-muted-foreground animate-pulse">{status}</p>
      )}
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      <p className="text-xs text-muted-foreground">
        This will use Grok AI to fetch and write articles based on today&apos;s real news.
      </p>
    </div>
  );
}

"use client";

import type { FeaturedImage as FeaturedImageType } from "@/types/edition";

interface FeaturedImageProps {
  image: FeaturedImageType;
}

export function FeaturedImage({ image }: FeaturedImageProps) {
  return (
    <figure className="my-8">
      {/* Link to the X post - clicking opens the original */}
      <a
        href={image.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative group"
      >
        {/* Image card that links to X post */}
        <div className="relative bg-muted/30 border border-rule rounded-lg overflow-hidden">
          {/* If we have a direct image URL, show it */}
          {image.imageUrl ? (
            <img
              src={image.imageUrl}
              alt={image.description}
              className="w-full h-auto object-cover"
            />
          ) : (
            /* Otherwise show a placeholder that links to the X post */
            <div className="aspect-video flex flex-col items-center justify-center p-8 bg-gradient-to-br from-muted/50 to-muted">
              <span className="text-4xl mb-3">𝕏</span>
              <p className="text-center text-muted-foreground text-sm max-w-md">
                {image.description}
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Click to view image on X →
              </p>
            </div>
          )}
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white bg-black/50 px-3 py-1 rounded text-sm">
              View on X →
            </span>
          </div>
        </div>
      </a>
      
      {/* Caption with credit */}
      <figcaption className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground italic">
          {image.description}
        </span>
        <a
          href={image.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-muted-foreground hover:text-blue-500 transition-colors"
        >
          <span className="text-xs">📷</span>
          <span className="hover:underline">{image.sourceHandle}</span>
          <span className="text-xs">via 𝕏</span>
        </a>
      </figcaption>
    </figure>
  );
}

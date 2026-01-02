import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-rule mt-12 sm:mt-16">
      {/* Patriotic rule at top */}
      <div className="patriotic-rule" />

      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        {/* Navigation links */}
        <nav className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-6">
          <Link href="/" className="news-link text-sm">
            Today&apos;s Edition
          </Link>
          <Link href="/archives" className="news-link text-sm">
            Archives
          </Link>
          <Link href="/about" className="news-link text-sm">
            About
          </Link>
          <Link href="/contact" className="news-link text-sm">
            Contact
          </Link>
        </nav>

        <Separator className="mb-6" />

        {/* Masthead small */}
        <div className="text-center mb-4">
          <p className="font-headline text-2xl sm:text-3xl font-bold text-navy">
            The American Standard
          </p>
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mt-1">
            The 5 Stories You Need to Know
          </p>
        </div>

        {/* Copyright */}
        <p className="text-center text-sm text-muted-foreground">
          © {currentYear} The American Standard. All rights reserved.
        </p>
        <p className="text-center text-xs text-muted-foreground mt-2">
          All articles written by The American Standard Staff.
        </p>
      </div>
    </footer>
  );
}

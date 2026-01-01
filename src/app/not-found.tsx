import Link from "next/link";
import { Masthead, Footer } from "@/components/newspaper";
import { getTodayDateString } from "@/types/edition";

export default function NotFound() {
  const today = getTodayDateString();

  return (
    <div className="min-h-screen bg-background">
      <Masthead date={today} />

      <main className="max-w-3xl mx-auto px-4 py-16 sm:py-24 text-center">
        <span className="inline-block w-12 h-1 bg-red mb-6" />
        
        <h1 className="font-headline text-5xl sm:text-6xl font-bold mb-4">
          404
        </h1>
        
        <h2 className="font-headline text-2xl sm:text-3xl text-muted-foreground mb-6">
          Page Not Found
        </h2>
        
        <p className="text-lg text-foreground/80 mb-8 max-w-md mx-auto">
          We couldn&apos;t find the page you&apos;re looking for. It may have been 
          moved or no longer exists.
        </p>

        <div className="space-x-4">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-navy text-white font-medium rounded hover:bg-navy-dark transition-colors"
          >
            Today&apos;s Edition
          </Link>
          <Link
            href="/archives"
            className="inline-block px-6 py-3 border border-navy text-navy font-medium rounded hover:bg-navy hover:text-white transition-colors"
          >
            Browse Archives
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

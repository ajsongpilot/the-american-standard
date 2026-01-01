import Link from "next/link";
import { Masthead, Footer } from "@/components/newspaper";
import { getTodayDateString } from "@/types/edition";

export const metadata = {
  title: "Contact - The American Standard",
  description: "Get in touch with The American Standard editorial team.",
};

export default function ContactPage() {
  const today = getTodayDateString();

  return (
    <div className="min-h-screen bg-background">
      <Masthead date={today} />

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8">
          <span className="inline-block w-12 h-1 bg-red mb-4" />
          <h1 className="font-headline text-4xl sm:text-5xl font-bold mb-4">
            Contact Us
          </h1>
          <p className="text-muted-foreground text-lg">
            We welcome your feedback, questions, and corrections.
          </p>
        </div>

        <div className="rule-gray mb-8" />

        <article className="prose prose-lg prose-newspaper max-w-none article-text">
          <h2 className="font-headline text-2xl font-bold mt-8 mb-4">Editorial Inquiries</h2>
          
          <p>
            For questions about our coverage, to suggest story ideas, or to report 
            corrections, please email our editorial team:
          </p>
          
          <p className="font-medium text-navy">
            editorial@theamericanstandard.news
          </p>

          <h2 className="font-headline text-2xl font-bold mt-8 mb-4">Technical Support</h2>
          
          <p>
            If you&apos;re experiencing technical issues with our website or mobile app, 
            please contact our support team:
          </p>
          
          <p className="font-medium text-navy">
            support@theamericanstandard.news
          </p>

          <h2 className="font-headline text-2xl font-bold mt-8 mb-4">General Information</h2>
          
          <p>
            For all other inquiries:
          </p>
          
          <p className="font-medium text-navy">
            info@theamericanstandard.news
          </p>

          <h2 className="font-headline text-2xl font-bold mt-8 mb-4">Corrections Policy</h2>
          
          <p>
            The American Standard is committed to accuracy. If we make an error, we will 
            correct it promptly and transparently. Corrections are noted at the end of 
            the relevant article with a clear explanation of what was changed and why.
          </p>
          
          <p>
            If you believe you have found an error in our coverage, please email us with:
          </p>
          
          <ul>
            <li>The article headline and date</li>
            <li>A description of the error</li>
            <li>Any supporting documentation or sources</li>
          </ul>

          <div className="mt-12 p-6 bg-muted/30 rounded border border-rule">
            <h3 className="font-headline text-xl font-bold mb-2">Response Times</h3>
            <p className="text-sm text-muted-foreground mb-0">
              We strive to respond to all inquiries within 24-48 hours during business days. 
              Urgent correction requests are prioritized and typically addressed within 
              a few hours.
            </p>
          </div>

          <div className="mt-12 text-center border-t border-rule pt-8">
            <p className="font-headline text-2xl font-bold text-navy">
              The American Standard
            </p>
            <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mt-1">
              Clear. Fair. American.
            </p>
          </div>
        </article>

        <div className="mt-12 text-center">
          <Link href="/" className="news-link">
            ← Return to today&apos;s edition
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

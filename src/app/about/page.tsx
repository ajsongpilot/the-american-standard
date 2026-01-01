import Link from "next/link";
import { Masthead, Footer } from "@/components/newspaper";
import { getTodayDateString } from "@/types/edition";

export const metadata = {
  title: "About - The American Standard",
  description: "Learn about The American Standard and our commitment to clear, fair, American journalism.",
};

export default function AboutPage() {
  const today = getTodayDateString();

  return (
    <div className="min-h-screen bg-background">
      <Masthead date={today} />

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8">
          <span className="inline-block w-12 h-1 bg-red mb-4" />
          <h1 className="font-headline text-4xl sm:text-5xl font-bold mb-4">
            About The American Standard
          </h1>
        </div>

        <div className="rule-gray mb-8" />

        <article className="prose prose-lg prose-newspaper max-w-none article-text">
          <p className="drop-cap text-xl leading-relaxed">
            The American Standard is a daily digital newspaper dedicated to providing clear, 
            fair, and thoroughly American coverage of our nation&apos;s political landscape. 
            In an age of information overload and partisan polarization, we believe there 
            remains a vital need for journalism that respects the intelligence of its readers 
            and presents the facts without ideological spin.
          </p>

          <h2 className="font-headline text-2xl font-bold mt-8 mb-4">Our Mission</h2>
          
          <p>
            We are committed to the traditional values of American journalism: accuracy, 
            fairness, and a dedication to serving the public interest. Our reporting aims 
            to inform citizens about the workings of their government, the debates shaping 
            their communities, and the decisions that affect their daily lives.
          </p>

          <p>
            The American Standard takes no editorial position on partisan political matters. 
            We believe that well-informed citizens are capable of reaching their own 
            conclusions when presented with complete and accurate information.
          </p>

          <h2 className="font-headline text-2xl font-bold mt-8 mb-4">Our Approach</h2>
          
          <p>
            Every article in The American Standard is written by our staff with careful 
            attention to journalistic standards. We verify facts, seek multiple perspectives, 
            and strive to provide context that helps readers understand not just what happened, 
            but why it matters.
          </p>

          <p>
            Our design reflects our editorial philosophy: clean, readable, and free from 
            the distractions of modern digital media. We want reading The American Standard 
            to feel like opening a trusted newspaper—authoritative, calm, and focused on 
            what matters most.
          </p>

          <h2 className="font-headline text-2xl font-bold mt-8 mb-4">Daily Publication</h2>
          
          <p>
            A new edition of The American Standard is published each morning at 6:00 AM 
            Eastern Time. Each edition contains our coverage of the most significant 
            political news of the day, organized by section to help readers navigate to 
            the stories that interest them most.
          </p>

          <p>
            Past editions are available in our archives, providing a record of how events 
            unfolded over time and allowing readers to revisit coverage of stories they 
            may have missed.
          </p>

          <h2 className="font-headline text-2xl font-bold mt-8 mb-4">Contact</h2>
          
          <p>
            We welcome feedback from our readers. If you have questions, comments, or 
            corrections, please visit our{" "}
            <Link href="/contact" className="news-link">
              contact page
            </Link>
            .
          </p>

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

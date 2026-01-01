import type { Edition, Article } from "@/types/edition";
import { getTodayDateString } from "@/types/edition";

/**
 * Sample edition data for development and demo purposes
 * This is used when Vercel KV is not configured or no edition exists yet
 */
export function getSampleEdition(): Edition {
  const today = getTodayDateString();
  const timestamp = new Date().toISOString();

  const sampleArticles: Article[] = [
    {
      id: "lead-story-1",
      headline:
        "Congress Reaches Historic Bipartisan Agreement on Infrastructure Funding",
      subheadline:
        "Lawmakers bridge partisan divide with $500 billion plan for roads, bridges, and broadband",
      leadParagraph:
        "In a rare display of bipartisan cooperation, Congressional leaders from both parties announced a landmark infrastructure agreement Thursday that would allocate $500 billion over the next decade to repair aging roads and bridges, expand rural broadband access, and modernize the nation's electrical grid.",
      body: `The agreement, which has been in negotiations for nearly eight months, represents one of the most significant legislative achievements of the current session. Senate Majority Leader and Minority Leader appeared together at a joint press conference to announce the deal, marking an unusual moment of unity in an otherwise deeply divided capital.

"This is what the American people sent us here to do," said the Majority Leader. "They want us to put aside our differences and work together on the issues that matter most to their daily lives."

The package includes $200 billion for highway and bridge repair, $100 billion for broadband expansion with a focus on underserved rural communities, $80 billion for rail improvements, and $120 billion for clean energy infrastructure.

Critics on both flanks have expressed reservations. Some progressive lawmakers argue the package doesn't go far enough to address climate change, while fiscal conservatives have raised concerns about the spending levels. However, centrist members from both parties expressed optimism about its chances of passage.

The House is expected to take up the measure next week, where leadership believes they have secured enough votes for passage.`,
      section: "National Politics",
      byline: "The American Standard Staff",
      imageUrl: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&h=800&fit=crop",
      imageCaption:
        "The United States Capitol, where lawmakers announced the bipartisan infrastructure agreement.",
      publishedAt: timestamp,
      isLeadStory: true,
      wordCount: 580,
    },
    {
      id: "national-2",
      headline: "Supreme Court to Hear Major Case on State Regulatory Powers",
      leadParagraph:
        "The Supreme Court announced Monday it will hear arguments in a case that could significantly reshape the balance of power between federal agencies and state governments, potentially limiting the regulatory authority that agencies have exercised for decades.",
      body: `The case, which originated in a dispute over environmental regulations, asks the justices to reconsider how much deference courts should give to federal agency interpretations of ambiguous statutes.

Legal experts say a ruling against the agencies could have far-reaching implications for regulations governing everything from environmental protection to financial oversight.

The court will hear arguments in the spring term, with a decision expected by late June.`,
      section: "National Politics",
      byline: "The American Standard Staff",
      imageUrl: "https://images.unsplash.com/photo-1555848962-6e79363ec58f?w=800&h=600&fit=crop",
      imageCaption: "The Supreme Court Building in Washington, D.C.",
      publishedAt: timestamp,
      isLeadStory: false,
      wordCount: 420,
    },
    {
      id: "washington-1",
      headline: "White House Announces New Economic Advisory Council Members",
      leadParagraph:
        "The administration unveiled three new appointments to the Council of Economic Advisers Wednesday, selecting a diverse group of economists with expertise in labor markets, international trade, and monetary policy.",
      body: `The appointments come as the administration seeks to bolster its economic messaging ahead of what analysts expect to be a challenging fiscal year.

The new appointees bring a combined six decades of experience from academia, the private sector, and previous government service. They are expected to play key roles in shaping the administration's response to inflation concerns and ongoing supply chain challenges.`,
      section: "Washington Briefs",
      byline: "The American Standard Staff",
      publishedAt: timestamp,
      isLeadStory: false,
      wordCount: 350,
    },
    {
      id: "washington-2",
      headline:
        "Pentagon Releases Annual Report on Military Readiness and Modernization",
      leadParagraph:
        "Defense officials presented their annual assessment of military readiness to Congress Tuesday, highlighting both significant improvements in key capabilities and ongoing concerns about recruitment and retention.",
      body: `The report noted substantial progress in modernizing the nuclear deterrent and expanding cyber warfare capabilities, but warned that personnel shortages in critical technical fields remain a challenge.

Committee members from both parties pressed officials on the recruitment shortfalls, which have affected all branches of the armed forces in recent years.`,
      section: "Washington Briefs",
      byline: "The American Standard Staff",
      publishedAt: timestamp,
      isLeadStory: false,
      wordCount: 380,
    },
    {
      id: "state-local-1",
      headline:
        "Governors Coalition Announces Joint Plan to Address Housing Shortage",
      leadParagraph:
        "A bipartisan coalition of twelve governors from across the country announced a coordinated initiative Thursday to tackle the nationwide housing shortage, proposing regulatory reforms and incentive programs aimed at boosting construction of affordable units.",
      body: `The plan includes model legislation to streamline permitting processes, tax incentives for developers who build affordable housing, and funding mechanisms to support workforce housing in high-cost metropolitan areas.

"This isn't a red state or blue state problem—it's an American problem," said the coalition's chair. "Working families in every corner of this country are struggling to find housing they can afford."

The initiative comes as home prices and rents have reached historic highs in many markets, pricing out middle-class buyers and putting pressure on local economies.`,
      section: "State & Local",
      byline: "The American Standard Staff",
      imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop",
      imageCaption: "New housing construction, part of efforts to address the nationwide shortage.",
      publishedAt: timestamp,
      isLeadStory: false,
      wordCount: 450,
    },
    {
      id: "state-local-2",
      headline: "Midwest States Report Record Agricultural Exports Despite Challenges",
      leadParagraph:
        "Despite ongoing supply chain disruptions and volatile commodity markets, agricultural exports from the Midwest reached record levels in the latest fiscal year, according to data released by state commerce departments.",
      body: `Strong demand from Asian markets and favorable exchange rates helped offset higher transportation costs and labor shortages that have plagued the sector.

State agriculture officials credited diversification efforts and investments in processing capacity for the strong performance, while cautioning that challenges remain heading into the new growing season.`,
      section: "State & Local",
      byline: "The American Standard Staff",
      publishedAt: timestamp,
      isLeadStory: false,
      wordCount: 320,
    },
    {
      id: "opinion-1",
      headline: "Editorial: The Case for Renewed Civic Education in American Schools",
      leadParagraph:
        "A healthy democracy depends on an informed and engaged citizenry. Yet recent surveys reveal troubling gaps in Americans' understanding of basic civic institutions and processes. It is time for our nation to recommit to robust civic education.",
      body: `Studies consistently show that many Americans cannot name the three branches of government, explain how a bill becomes law, or describe the basic protections guaranteed by the Constitution. This civic illiteracy weakens the foundation of self-government.

The solution begins in our schools. Civic education was once a cornerstone of American public education, but in recent decades it has been crowded out by other priorities. States and local school boards should restore dedicated civics instruction and ensure that students graduate with a firm understanding of how their government works.

This is not a partisan issue. Americans of all political persuasions benefit when citizens understand and participate in their democracy. An investment in civic education is an investment in America's future.`,
      section: "Opinion",
      byline: "The American Standard Editorial Board",
      publishedAt: timestamp,
      isLeadStory: false,
      wordCount: 480,
    },
    {
      id: "national-3",
      headline: "Federal Reserve Signals Cautious Approach to Interest Rate Decisions",
      leadParagraph:
        "Federal Reserve officials indicated Wednesday that they will proceed carefully in upcoming interest rate decisions, balancing concerns about persistent inflation against signs of cooling economic growth.",
      body: `The central bank's latest policy statement emphasized a data-dependent approach, suggesting officials want to see more evidence that inflation is sustainably declining before committing to rate cuts.

Markets had anticipated more definitive guidance, and stocks dipped slightly following the announcement. However, analysts noted that the Fed's cautious tone was consistent with recent communications and should not be interpreted as a significant policy shift.

Economic indicators have sent mixed signals in recent weeks, with employment remaining strong even as some sectors show signs of softening demand.`,
      section: "National Politics",
      byline: "The American Standard Staff",
      imageUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=600&fit=crop",
      imageCaption: "The Federal Reserve building in Washington, D.C.",
      publishedAt: timestamp,
      isLeadStory: false,
      wordCount: 390,
    },
  ];

  return {
    date: today,
    publishedAt: timestamp,
    articles: sampleArticles,
    generatedAt: timestamp,
    version: 1,
  };
}

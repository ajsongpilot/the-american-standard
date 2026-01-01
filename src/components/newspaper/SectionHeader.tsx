import type { ArticleSection } from "@/types/edition";

interface SectionHeaderProps {
  section: ArticleSection;
}

export function SectionHeader({ section }: SectionHeaderProps) {
  return (
    <div className="section-header">
      {section}
    </div>
  );
}

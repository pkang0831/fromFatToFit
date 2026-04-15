import type { BlogSection } from '@/content/blog/posts';

interface BlogArticleContentProps {
  sections: BlogSection[];
}

export function BlogArticleContent({ sections }: BlogArticleContentProps) {
  return (
    <div className="space-y-10">
      {sections.map((section, index) => {
        if (section.type === 'quote') {
          return (
            <blockquote
              key={`${section.type}-${index}`}
              className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] px-6 py-8 text-2xl font-semibold leading-relaxed tracking-tight text-white md:px-8 md:text-3xl"
            >
              “{section.quote}”
            </blockquote>
          );
        }

        if (section.type === 'list') {
          return (
            <section key={`${section.type}-${index}`} className="space-y-5">
              {section.title ? (
                <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{section.title}</h2>
              ) : null}
              {section.intro ? (
                <p className="text-lg leading-8 text-white/68">{section.intro}</p>
              ) : null}
              <ul className="space-y-3 rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6 text-white/72">
                {section.items.map((item, itemIndex) => (
                  <li key={`${index}-${itemIndex}`} className="flex items-start gap-3 text-base leading-7">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {section.outro ? (
                <p className="text-lg leading-8 text-white/68">{section.outro}</p>
              ) : null}
            </section>
          );
        }

        return (
          <section key={`${section.type}-${index}`} className="space-y-5">
            {section.title ? (
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{section.title}</h2>
            ) : null}
            <div className="space-y-5">
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={`${index}-${paragraphIndex}`} className="text-lg leading-8 text-white/68">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

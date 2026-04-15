import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

import { BlogArticleContent } from '@/components/blog/BlogArticleContent';
import { BlogPostCard } from '@/components/blog/BlogPostCard';
import { getAllBlogPosts, getBlogPostBySlug, getRelatedBlogPosts } from '@/content/blog/posts';

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  return getAllBlogPosts().map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = getBlogPostBySlug(params.slug);

  if (!post) {
    return {
      title: 'Not Found',
    };
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.socialDescription,
      type: 'article',
      url: `https://devenira.com/blog/${post.slug}`,
      publishedTime: post.date,
      images: [{ url: `https://devenira.com${post.heroImage}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.socialDescription,
      images: [`https://devenira.com${post.heroImage}`],
    },
  };
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedBlogPosts(post.slug, 2);

  return (
    <div className="bg-[#0a0a0f] text-white">
      <section className="px-6 py-16 md:py-20">
        <article className="mx-auto max-w-4xl">
          <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/42">
              <Link href="/blog" className="transition-colors hover:text-primary">
                Blog
              </Link>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>{post.date}</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>{post.readingTime}</span>
            </div>

            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="max-w-3xl text-4xl font-bold leading-[0.95] tracking-tight text-white md:text-6xl">
                {post.title}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-white/62 md:text-xl">{post.deck}</p>
            </div>

            <div className="overflow-hidden rounded-[32px] border border-white/[0.08] bg-white/[0.03]">
              <div className="relative aspect-[16/10]">
                <Image
                  src={post.heroImage}
                  alt={post.heroAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 960px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060609] via-transparent to-transparent" />
              </div>
            </div>

            <div className="rounded-[32px] border border-white/[0.08] bg-[#080810] px-6 py-8 md:px-10 md:py-10">
              <div className="mx-auto max-w-3xl">
                <BlogArticleContent sections={post.sections} />
              </div>
            </div>

            <div className="rounded-[32px] border border-primary/20 bg-primary/[0.08] px-6 py-8 md:px-8">
              <div className="mx-auto max-w-3xl space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Next step</p>
                <h2 className="text-3xl font-bold tracking-tight text-white">{post.ctaTitle}</h2>
                <p className="max-w-2xl text-lg leading-8 text-white/62">{post.ctaBody}</p>
                <Link
                  href="/try"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-white shadow-glow-cyan transition-transform duration-200 hover:scale-[1.02]"
                >
                  Try the free body scan
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </article>
      </section>

      {relatedPosts.length > 0 ? (
        <section className="px-6 pb-24">
          <div className="mx-auto max-w-6xl space-y-8">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Keep reading</p>
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                More articles
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              {relatedPosts.map((relatedPost) => (
                <BlogPostCard key={relatedPost.slug} post={relatedPost} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

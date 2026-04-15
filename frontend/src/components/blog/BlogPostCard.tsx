import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import type { BlogPost } from '@/content/blog/posts';

interface BlogPostCardProps {
  post: BlogPost;
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.03] transition-all duration-200 hover:-translate-y-1 hover:border-white/[0.14] hover:bg-white/[0.05]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={post.heroImage}
          alt={post.heroAlt}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060609] via-[#060609]/20 to-transparent" />
        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
          {post.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/[0.12] bg-black/30 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/70 backdrop-blur-md"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span>{post.date}</span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span>{post.readingTime}</span>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold leading-tight text-white">{post.title}</h2>
          <p className="text-sm leading-7 text-white/58">{post.description}</p>
        </div>

        <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          Read article
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

import { blogAuthors, blogSource } from '@/lib/source';
import { getPosts } from '@/lib/blog';
import { BlogCards } from '@/components/blog';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog - OpenLiate',
  description: 'Engineering notes, architecture decompositions, and announcements from the OpenLiate team.',
};

export default function BlogIndexPage() {
  const posts = getPosts(blogSource.getPages(), blogAuthors);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fd-foreground">
          OpenLiate Engineering Blog
        </h1>
        <p className="text-base sm:text-lg text-fd-muted-foreground max-w-2xl leading-relaxed">
          Deep dives into sovereign AI agents, mathematical integrations by parts, ReAct loops, Model Context Protocol (MCP), and Indic model performance.
        </p>
      </div>

      <BlogCards posts={posts} />
    </div>
  );
}

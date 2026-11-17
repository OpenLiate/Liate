import { blogSource } from '@/lib/source';
import { getPosts, getTags } from '@/lib/blog';
import { BlogHeader, BlogTagCards, BlogTitle, BlogBackLink } from '@/components/blog';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Tags - OpenLiate Blog',
};

export default function BlogTagsPage() {
  const tags = getTags(getPosts(blogSource.getPages()));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-16 sm:px-6">
      <BlogHeader>
        <BlogBackLink href="/blog" />
        <BlogTitle>All Tags</BlogTitle>
      </BlogHeader>
      <BlogTagCards tags={tags} />
    </div>
  );
}

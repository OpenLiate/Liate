import { notFound } from 'next/navigation';
import { blogAuthors, blogSource } from '@/lib/source';
import { getPosts, getTagPosts, getTags } from '@/lib/blog';
import { BlogCards, BlogHeader, BlogTitle, BlogBackLink } from '@/components/blog';
import type { Metadata } from 'next';

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export default async function BlogTagPostsPage(props: TagPageProps) {
  const { tag } = await props.params;
  const result = getTagPosts(getPosts(blogSource.getPages(), blogAuthors), tag);
  if (!result) notFound();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
      <BlogHeader>
        <BlogBackLink href="/blog/tags" />
        <BlogTitle>Tag: #{result.tag.name}</BlogTitle>
      </BlogHeader>
      <BlogCards posts={result.posts} />
    </div>
  );
}

export async function generateStaticParams() {
  return getTags(getPosts(blogSource.getPages())).map((tag) => ({ tag: tag.slug }));
}

export async function generateMetadata(props: TagPageProps): Promise<Metadata> {
  const { tag } = await props.params;
  return {
    title: `#${tag} - OpenLiate Blog`,
  };
}

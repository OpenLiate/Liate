import { notFound } from 'next/navigation';
import { blogAuthors, blogSource } from '@/lib/source';
import { findPost, getPosts } from '@/lib/blog';
import { getMDXComponents } from '@/components/mdx';
import {
  BlogAuthors,
  BlogBackLink,
  BlogBody,
  BlogDate,
  BlogDescription,
  BlogHeader,
  BlogPage,
  BlogPostNav,
  BlogTags,
  BlogTitle,
} from '@/components/blog';
import type { Metadata } from 'next';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogPostPage(props: PostPageProps) {
  const { slug } = await props.params;
  const page = blogSource.getPage([slug]);
  if (!page) notFound();

  const posts = getPosts(blogSource.getPages(), blogAuthors);
  const found = findPost(posts, page.url);
  const newer = found?.newer;
  const older = found?.older;
  const post = found?.post || {
    title: page.data.title,
    description: page.data.description,
    tags: ((page.data.tags as string[]) || []).filter(Boolean),
    authors: [],
    date: page.data.date ? new Date(page.data.date) : undefined,
    url: page.url,
    page,
  };

  const MDX = page.data.body;

  return (
    <BlogPage>
      <BlogHeader>
        <BlogBackLink href="/blog" />
        <BlogTitle>{post.title}</BlogTitle>
        {post.description && <BlogDescription>{post.description}</BlogDescription>}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <BlogAuthors authors={post.authors} />
          {post.date && <BlogDate date={post.date} />}
        </div>
        <BlogTags tags={post.tags} />
      </BlogHeader>
      <BlogBody>
        <MDX components={getMDXComponents()} />
      </BlogBody>
      <BlogPostNav newer={newer} older={older} />
    </BlogPage>
  );
}

export async function generateStaticParams() {
  return blogSource.getPages().map((page) => ({
    slug: page.slugs[0],
  }));
}

export async function generateMetadata(props: PostPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const page = blogSource.getPage([slug]);
  if (!page) notFound();

  return {
    title: `${page.data.title} - OpenLiate Blog`,
    description: page.data.description,
  };
}

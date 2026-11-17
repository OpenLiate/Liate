import { pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';

export interface BlogAuthor {
  name: string;
  title?: string;
  url?: string;
  image?: string;
}

export const blogPageSchema = pageSchema.extend({
  date: z.string().or(z.date()).optional(),
  tags: z.array(z.string()).optional(),
  authors: z.array(z.string()).optional(),
  image: z.string().optional(),
});

export interface Post {
  url: string;
  title: string;
  description?: string;
  date?: Date;
  tags: string[];
  authors: (BlogAuthor | string)[];
  image?: string;
  page: any;
}

export interface Tag {
  name: string;
  slug: string;
  count: number;
}

export function getPosts(
  pages: any[],
  authorsMap: Record<string, BlogAuthor> = {}
): Post[] {
  return pages
    .map((page) => {
      const data = page.data;
      const rawDate = data.date;
      const date = rawDate ? new Date(rawDate) : undefined;
      const tags = ((data.tags as string[]) || []).filter(Boolean);
      const rawAuthors = ((data.authors as string[]) || []).filter(Boolean);
      const authors = rawAuthors.map((key) => authorsMap[key] || key);

      return {
        url: page.url,
        title: data.title,
        description: data.description,
        date,
        tags,
        authors,
        image: data.image,
        page,
      };
    })
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.getTime() - a.date.getTime();
    });
}

export function findPost(posts: Post[], url: string) {
  const index = posts.findIndex((p) => p.url === url);
  if (index === -1) return undefined;

  return {
    post: posts[index],
    newer: index > 0 ? posts[index - 1] : undefined,
    older: index < posts.length - 1 ? posts[index + 1] : undefined,
  };
}

export function getTags(posts: Post[]): Tag[] {
  const countMap: Record<string, { name: string; count: number }> = {};
  for (const post of posts) {
    for (const tag of post.tags) {
      const slug = tag.toLowerCase().replace(/\s+/g, '-');
      if (!countMap[slug]) {
        countMap[slug] = { name: tag, count: 0 };
      }
      countMap[slug].count++;
    }
  }

  return Object.entries(countMap).map(([slug, { name, count }]) => ({
    name,
    slug,
    count,
  }));
}

export function getTagPosts(posts: Post[], tagSlug: string) {
  const tag = getTags(posts).find((t) => t.slug === tagSlug);
  if (!tag) return undefined;

  return {
    tag,
    posts: posts.filter((p) =>
      p.tags.some((t) => t.toLowerCase().replace(/\s+/g, '-') === tagSlug)
    ),
  };
}

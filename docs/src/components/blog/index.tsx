import React, { ReactNode } from 'react';
import Link from 'next/link';
import type { BlogAuthor, Post, Tag } from '@/lib/blog';
import { ArrowLeft, Calendar, Tag as TagIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export function BlogCards({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16 text-fd-muted-foreground">
        No blog posts published yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <article
          key={post.url}
          className="group relative flex flex-col rounded-2xl border border-fd-border bg-fd-card/50 hover:bg-fd-accent/40 hover:border-fd-foreground/20 transition-all overflow-hidden p-6 shadow-xs"
        >
          {post.image && (
            <div className="mb-4 aspect-video w-full overflow-hidden rounded-xl bg-fd-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.image}
                alt={post.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          )}

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-fd-secondary text-fd-secondary-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <h2 className="text-xl font-bold tracking-tight text-fd-foreground group-hover:text-fd-primary transition-colors line-clamp-2">
            <Link href={post.url} className="after:absolute after:inset-0">
              {post.title}
            </Link>
          </h2>

          {post.description && (
            <p className="mt-2 text-sm text-fd-muted-foreground line-clamp-3 leading-relaxed flex-1">
              {post.description}
            </p>
          )}

          <div className="mt-6 pt-4 border-t border-fd-border flex items-center justify-between text-xs text-fd-muted-foreground">
            <div className="flex items-center gap-2">
              {post.authors.map((a, i) => {
                const name = typeof a === 'string' ? a : a.name;
                const img = typeof a === 'object' ? a.image : undefined;
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={name}
                        className="size-5 rounded-full object-cover border border-fd-border"
                      />
                    )}
                    <span className="font-medium text-fd-foreground">{name}</span>
                  </div>
                );
              })}
            </div>

            {post.date && (
              <time dateTime={post.date.toISOString()}>
                {post.date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function BlogPage({
  children,
}: {
  toc?: any;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}

export function BlogHeader({ children }: { children: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 pb-8 border-b border-fd-border">
      {children}
    </header>
  );
}

export function BlogBackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-fd-muted-foreground hover:text-fd-foreground transition-colors mb-2 w-fit"
    >
      <ArrowLeft className="size-3.5" />
      <span>Back to blog</span>
    </Link>
  );
}

export function BlogTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-fd-foreground leading-tight">
      {children}
    </h1>
  );
}

export function BlogDescription({ children }: { children: ReactNode }) {
  return (
    <p className="text-lg text-fd-muted-foreground leading-relaxed mt-1">
      {children}
    </p>
  );
}

export function BlogAuthors({
  authors,
}: {
  authors?: (BlogAuthor | string)[];
}) {
  if (!authors || authors.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 pt-2">
      {authors.map((a, i) => {
        const name = typeof a === 'string' ? a : a.name;
        const title = typeof a === 'object' ? a.title : undefined;
        const img = typeof a === 'object' ? a.image : undefined;
        const url = typeof a === 'object' ? a.url : undefined;

        const content = (
          <div className="flex items-center gap-2.5">
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img}
                alt={name}
                className="size-8 rounded-full object-cover border border-fd-border"
              />
            )}
            <div>
              <p className="text-sm font-semibold text-fd-foreground leading-tight">
                {name}
              </p>
              {title && (
                <p className="text-xs text-fd-muted-foreground leading-tight">
                  {title}
                </p>
              )}
            </div>
          </div>
        );

        if (url) {
          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              {content}
            </a>
          );
        }

        return <div key={i}>{content}</div>;
      })}
    </div>
  );
}

export function BlogTags({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {tags.map((t) => (
        <Link
          key={t}
          href={`/blog/tags/${t.toLowerCase().replace(/\s+/g, '-')}`}
          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-fd-secondary border border-fd-border text-fd-secondary-foreground hover:bg-fd-accent transition-colors"
        >
          <TagIcon className="size-3" />
          <span>{t}</span>
        </Link>
      ))}
    </div>
  );
}

export function BlogDate({ date }: { date: Date | string }) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-fd-muted-foreground">
      <Calendar className="size-3.5" />
      <time dateTime={d.toISOString()}>
        {d.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </time>
    </div>
  );
}

export function BlogBody({ children }: { children: ReactNode }) {
  return (
    <div className="pt-8 prose dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-fd-primary prose-code:font-mono">
      {children}
    </div>
  );
}

export function BlogPostNav({
  newer,
  older,
}: {
  newer?: Post;
  older?: Post;
}) {
  if (!newer && !older) return null;

  return (
    <div className="mt-16 pt-8 border-t border-fd-border grid grid-cols-1 sm:grid-cols-2 gap-4">
      {older ? (
        <Link
          href={older.url}
          className="flex flex-col p-4 rounded-xl border border-fd-border hover:bg-fd-accent/40 transition-colors"
        >
          <span className="inline-flex items-center gap-1 text-xs text-fd-muted-foreground mb-1">
            <ChevronLeft className="size-3.5" /> Older Post
          </span>
          <span className="text-sm font-semibold text-fd-foreground line-clamp-1">
            {older.title}
          </span>
        </Link>
      ) : (
        <div />
      )}

      {newer && (
        <Link
          href={newer.url}
          className="flex flex-col items-end text-end p-4 rounded-xl border border-fd-border hover:bg-fd-accent/40 transition-colors"
        >
          <span className="inline-flex items-center gap-1 text-xs text-fd-muted-foreground mb-1">
            Newer Post <ChevronRight className="size-3.5" />
          </span>
          <span className="text-sm font-semibold text-fd-foreground line-clamp-1">
            {newer.title}
          </span>
        </Link>
      )}
    </div>
  );
}

export function BlogTagCards({ tags }: { tags: Tag[] }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {tags.map((t) => (
        <Link
          key={t.slug}
          href={`/blog/tags/${t.slug}`}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-fd-border bg-fd-card/50 hover:bg-fd-accent text-sm font-medium text-fd-foreground transition-colors"
        >
          <span>{t.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-fd-muted text-fd-muted-foreground">
            {t.count}
          </span>
        </Link>
      ))}
    </div>
  );
}

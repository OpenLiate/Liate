import { llms, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsRoute } from './shared';
import { defineCollections, defineDocs } from 'fumadocs-mdx/macro';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { type BlogAuthor, blogPageSchema } from './blog';
import { openapi } from './openapi';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export const blog = defineCollections({
  type: 'doc',
  dir: 'content/blog',
  schema: blogPageSchema,
});

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader(
  {
    docs: docs.toFumadocsSource(),
    openapi: await openapi.staticSource({
      baseDir: 'agent-api',
      groupBy: 'tag',
    }),
  },
  {
    baseUrl: docsRoute,
    plugins: [lucideIconsPlugin(), openapi.loaderPlugin()],
  },
);

export const blogSource = loader({
  baseUrl: '/blog',
  source: blog.toFumadocsSource(),
});

export const blogAuthors: Record<string, BlogAuthor> = {
  liate: {
    name: 'OpenLiate Team',
    title: 'Core Maintainers',
    url: 'https://openliate.tech',
    image: 'https://github.com/OpenLiate.png',
  },
  sarvam: {
    name: 'Sarvam AI',
    title: 'Sovereign AI Partner',
    url: 'https://www.sarvam.ai',
    image: 'https://github.com/sarvamai.png',
  },
};

export const docsLlms = llms(source, {
  renderPage: async (page) => {
    if (page.type === 'openapi') {
      return JSON.stringify(page.data.getSchema().bundled, null, 2);
    }
    return `# ${page.data.title} (${page.url})\n\n${await page.data.getText('processed')}`;
  },
});

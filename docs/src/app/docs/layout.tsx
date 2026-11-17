import { source } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';
import { DocsLayoutClient } from '@/components/docs/docs-layout-client';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayoutClient tree={source.getPageTree()} baseOptions={baseOptions()}>
      {children}
    </DocsLayoutClient>
  );
}

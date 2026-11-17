import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { gitConfig } from './shared';
import DotMatrixLogo from '@/components/ui/dot-matrix-logo';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-2 text-fd-foreground">
          <DotMatrixLogo size={18} interactive={false} color="currentColor" />
          <span className="font-bold text-xs sm:text-sm tracking-tight text-fd-foreground whitespace-nowrap">
            OpenLiate
          </span>
        </div>
      ),
    },
    links: [
      {
        text: 'Product',
        url: 'https://openliate.tech',
        external: true,
      },
      {
        text: 'Community',
        url: 'https://github.com/OpenLiate/Liate/discussions',
        external: true,
      },
      {
        text: 'Support',
        url: 'https://github.com/OpenLiate/Liate/issues',
        external: true,
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}

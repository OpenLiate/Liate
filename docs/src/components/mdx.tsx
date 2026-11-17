import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Callout } from 'fumadocs-ui/components/callout';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Card, Cards } from 'fumadocs-ui/components/card';
import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Callout,
    Note: (props: any) => <Callout type="info" {...props} />,
    Tip: (props: any) => <Callout type="info" {...props} />,
    Info: (props: any) => <Callout type="info" {...props} />,
    Warning: (props: any) => <Callout type="warn" {...props} />,
    Danger: (props: any) => <Callout type="error" {...props} />,
    Tabs,
    Tab,
    CodeGroup: Tabs,
    Steps,
    Step,
    Card,
    Cards,
    CardGroup: Cards,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}

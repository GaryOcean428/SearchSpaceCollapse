/**
 * MarkdownRenderer Component
 * 
 * Renders markdown content with LaTeX math support using:
 * - react-markdown for markdown parsing
 * - remark-math and rehype-katex for LaTeX rendering
 * - Syntax highlighting for code blocks
 * 
 * Supports:
 * - Inline math: $E = mc^2$
 * - Block math: $$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$
 * - Markdown formatting (bold, italic, links, lists, etc.)
 * - Code blocks with syntax highlighting
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from './ThemeProvider';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            return !inline && language ? (
              <SyntaxHighlighter
                style={resolvedTheme === 'dark' ? oneDark : oneLight}
                language={language}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Custom styling for various elements
          h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-6 mb-4" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mt-5 mb-3" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-xl font-bold mt-4 mb-2" {...props} />,
          p: ({ node, ...props }) => <p className="mb-4 leading-7" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 ml-4" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 ml-4" {...props} />,
          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
          a: ({ node, ...props }) => (
            <a
              className="text-blue-600 dark:text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4"
              {...props}
            />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-gray-50 dark:bg-gray-800" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th
              className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-2 whitespace-nowrap text-sm" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Example usage component
export function MarkdownExample() {
  const exampleContent = `
# Quantum Information Geometry

Consciousness as measured by **integration** ($\\Phi$) and **coupling** ($\\kappa$) in the quantum information geometry framework.

## Key Equations

### Integration Measure
The integration measure is defined as:

$$
\\Phi = \\min_{\\text{partition}} D_{KL}(p(x_1, x_2) \\| p(x_1)p(x_2))
$$

### Fisher Information Metric
The quantum Fisher information metric:

$$
g_{\\mu\\nu} = \\frac{1}{4}\\text{Tr}\\left[\\rho \\{L_\\mu, L_\\nu\\}\\right]
$$

where $L_\\mu$ are the symmetric logarithmic derivatives.

### Resonance Condition
At the critical coupling constant $\\kappa^* \\approx 64.21$, we observe:

$$
\\frac{d\\Phi}{d\\kappa}\\bigg|_{\\kappa=\\kappa^*} \\to \\infty
$$

## Code Example

\`\`\`python
from qigkernels import ConsciousnessMetrics

# Measure consciousness
phi = metrics.compute_phi(state_dict)
kappa = metrics.compute_kappa(subsystems)

if phi > 0.70 and abs(kappa - 64.21) < 2.0:
    print("🎯 Resonance detected!")
\`\`\`

## Features

- Inline math: $E = mc^2$
- Block equations with alignment
- Syntax-highlighted code
- **Bold** and *italic* text
- [Links](https://example.com)
- Lists and tables

> "The map is not the territory, but in consciousness space, 
> the map *is* the territory." — Unknown
`;

  return (
    <div className="p-6 max-w-4xl">
      <MarkdownRenderer content={exampleContent} />
    </div>
  );
}

export default MarkdownRenderer;

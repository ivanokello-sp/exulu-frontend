'use client';

import { cn } from '@/lib/utils';
import type { ComponentProps, HTMLAttributes } from 'react';
import { isValidElement, memo, useState, useEffect } from 'react';
import ReactMarkdown, { type Options } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { CodeBlock, CodeBlockCopyButton } from './code-block';
import 'katex/dist/katex.min.css';
import hardenReactMarkdown from 'harden-react-markdown';
import { BundledLanguage } from 'shiki';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { DocumentNode, useQuery } from '@apollo/client';
import { GET_CHUNK_BY_ID } from '@/queries/queries';
import { getPresignedUrl } from '../uppy-dashboard';
import Link from 'next/link';
import { LinkIcon } from 'lucide-react';

/**
 * Parses markdown text and removes incomplete tokens to prevent partial rendering
 * of links, images, bold, and italic formatting during streaming.
 */
function parseIncompleteMarkdown(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let result = text;

  // Handle incomplete links and images
  // Pattern: [...] or ![...] where the closing ] is missing
  const linkImagePattern = /(!?\[)([^\]]*?)$/;
  const linkMatch = result.match(linkImagePattern);
  if (linkMatch) {
    // If we have an unterminated [ or ![, remove it and everything after
    const startIndex = result.lastIndexOf(linkMatch[1]);
    result = result.substring(0, startIndex);
  }

  // Handle incomplete bold formatting (**)
  const boldPattern = /(\*\*)([^*]*?)$/;
  const boldMatch = result.match(boldPattern);
  if (boldMatch) {
    // Count the number of ** in the entire string
    const asteriskPairs = (result.match(/\*\*/g) || []).length;
    // If odd number of **, we have an incomplete bold - complete it
    if (asteriskPairs % 2 === 1) {
      result = `${result}**`;
    }
  }

  // Handle incomplete italic formatting (__)
  const italicPattern = /(__)([^_]*?)$/;
  const italicMatch = result.match(italicPattern);
  if (italicMatch) {
    // Count the number of __ in the entire string
    const underscorePairs = (result.match(/__/g) || []).length;
    // If odd number of __, we have an incomplete italic - complete it
    if (underscorePairs % 2 === 1) {
      result = `${result}__`;
    }
  }

  // Handle incomplete single asterisk italic (*)
  const singleAsteriskPattern = /(\*)([^*]*?)$/;
  const singleAsteriskMatch = result.match(singleAsteriskPattern);
  if (singleAsteriskMatch) {
    // Count single asterisks that aren't part of **
    const singleAsterisks = result.split('').reduce((acc, char, index) => {
      if (char === '*') {
        // Check if it's part of a ** pair
        const prevChar = result[index - 1];
        const nextChar = result[index + 1];
        if (prevChar !== '*' && nextChar !== '*') {
          return acc + 1;
        }
      }
      return acc;
    }, 0);

    // If odd number of single *, we have an incomplete italic - complete it
    if (singleAsterisks % 2 === 1) {
      result = `${result}*`;
    }
  }

  // Handle incomplete single underscore italic (_)
  const singleUnderscorePattern = /(_)([^_]*?)$/;
  const singleUnderscoreMatch = result.match(singleUnderscorePattern);
  if (singleUnderscoreMatch) {
    // Count single underscores that aren't part of __
    const singleUnderscores = result.split('').reduce((acc, char, index) => {
      if (char === '_') {
        // Check if it's part of a __ pair
        const prevChar = result[index - 1];
        const nextChar = result[index + 1];
        if (prevChar !== '_' && nextChar !== '_') {
          return acc + 1;
        }
      }
      return acc;
    }, 0);

    // If odd number of single _, we have an incomplete italic - complete it
    if (singleUnderscores % 2 === 1) {
      result = `${result}_`;
    }
  }

  // Handle incomplete inline code blocks (`) - but avoid code blocks (```)
  const inlineCodePattern = /(`)([^`]*?)$/;
  const inlineCodeMatch = result.match(inlineCodePattern);
  if (inlineCodeMatch) {
    // Check if we're dealing with a code block (triple backticks)
    const hasCodeBlockStart = result.includes('```');
    const codeBlockPattern = /```[\s\S]*?```/g;
    const completeCodeBlocks = (result.match(codeBlockPattern) || []).length;
    const allTripleBackticks = (result.match(/```/g) || []).length;

    // If we have an odd number of ``` sequences, we're inside an incomplete code block
    // In this case, don't complete inline code
    const insideIncompleteCodeBlock = allTripleBackticks % 2 === 1;

    if (!insideIncompleteCodeBlock) {
      // Count the number of single backticks that are NOT part of triple backticks
      let singleBacktickCount = 0;
      for (let i = 0; i < result.length; i++) {
        if (result[i] === '`') {
          // Check if this backtick is part of a triple backtick sequence
          const isTripleStart = result.substring(i, i + 3) === '```';
          const isTripleMiddle =
            i > 0 && result.substring(i - 1, i + 2) === '```';
          const isTripleEnd = i > 1 && result.substring(i - 2, i + 1) === '```';

          if (!(isTripleStart || isTripleMiddle || isTripleEnd)) {
            singleBacktickCount++;
          }
        }
      }

      // If odd number of single backticks, we have an incomplete inline code - complete it
      if (singleBacktickCount % 2 === 1) {
        result = `${result}\``;
      }
    }
  }

  // Handle incomplete strikethrough formatting (~~)
  const strikethroughPattern = /(~~)([^~]*?)$/;
  const strikethroughMatch = result.match(strikethroughPattern);
  if (strikethroughMatch) {
    // Count the number of ~~ in the entire string
    const tildePairs = (result.match(/~~/g) || []).length;
    // If odd number of ~~, we have an incomplete strikethrough - complete it
    if (tildePairs % 2 === 1) {
      result = `${result}~~`;
    }
  }

  return result;
}

// Create a hardened version of ReactMarkdown
const HardenedMarkdown = hardenReactMarkdown(ReactMarkdown);

export type ResponseProps = HTMLAttributes<HTMLDivElement> & {
  options?: Options;
  children: Options['children'];
  allowedImagePrefixes?: ComponentProps<
    ReturnType<typeof hardenReactMarkdown>
  >['allowedImagePrefixes'];
  allowedLinkPrefixes?: ComponentProps<
    ReturnType<typeof hardenReactMarkdown>
  >['allowedLinkPrefixes'];
  defaultOrigin?: ComponentProps<
    ReturnType<typeof hardenReactMarkdown>
  >['defaultOrigin'];
  parseIncompleteMarkdown?: boolean;
};

// Custom component to render citations as badges with hover dialog
const CitationBadge = ({ itemName, chunkId, chunkIndex, context, itemId }: {
  itemName: string;
  itemId: string;
  chunkId: string;
  chunkIndex: string;
  context: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!context || !chunkId) {
    return null;
  }

  let query: DocumentNode | undefined = undefined;
  try {
    query = GET_CHUNK_BY_ID(context);
  } catch (error) {
    console.error('Error parsing citation:', error);
    return null;
  }

  // Only fetch chunk data when hover card is opened
  const { data, loading } = useQuery(query, {
    variables: { id: chunkId },
    skip: !isOpen || !context, // Skip query if not open or no context provided
    onError: (error) => {
      console.error('Error fetching chunk:', error);
    }
  });

  const chunk: {
    item_name: string;
    chunk_index: number;
    chunk_content: string;
    chunk_id: string;
    chunk_source: string;
    chunk_metadata: Record<string, string>;
    chunk_created_at: string;
    chunk_updated_at: string;
    item_id: string;
    item_external_id: string;
  } | undefined = data?.[`${context}_itemsChunkById`];

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    async function loadPdfUrl() {
      if (chunk?.chunk_metadata?.pdf) {
        setLoadingPdf(true);
        try {
          const url = await getPresignedUrl(chunk.chunk_metadata.pdf);
          setPdfUrl(url);
        } catch (error) {
          console.error('Error loading PDF URL:', error);
          setPdfUrl(null);
        } finally {
          setLoadingPdf(false);
        }
      } else {
        setPdfUrl(null);
        setLoadingPdf(false);
      }
    }
    loadPdfUrl();
  }, [chunk?.chunk_metadata?.pdf]);

  const page = chunk?.chunk_metadata?.page ? parseInt(chunk.chunk_metadata.page) : 1;

  let preview: React.ReactNode | undefined = undefined;
  if (chunk?.chunk_metadata?.pdf) {
    if (loadingPdf) {
      preview = <div className="text-sm text-muted-foreground">Loading PDF preview...</div>;
    } else if (pdfUrl) {
      preview = (
        <div className="space-y-2">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline hover:text-primary/80"
          >
            Open the PDF here
          </a>
          <iframe src={`${pdfUrl}#page=${page}`} style={{ width: '100%', height: '100vh' }} title="PDF viewer" />
        </div>
      );
    }
  }

  return (
    <HoverCard openDelay={200} closeDelay={100} open={isOpen} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        <Badge
          variant="secondary"
          className="mx-1 inline-flex cursor-pointer items-center gap-1 text-xs font-normal hover:bg-secondary/80"
          title={`Source: ${itemName} (Chunk ${parseInt(chunkIndex) + 1})`}
        >
          <span className="max-w-[200px] truncate">{itemName}</span>
          {chunkIndex && <span className="text-muted-foreground">#{parseInt(chunkIndex) + 1}</span>}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-[900px] max-h-[800px] overflow-y-auto" side="top">
        {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
        {chunk && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                {
                  (itemId && context) ? <Link className="flex items-center gap-1" href={`/data/${context}/${itemId}`} target="_blank"><span className="max-w-[200px] truncate hover:underline cursor-pointer">{itemName}</span><LinkIcon className="size-4" /></Link> : <span className="max-w-[200px] truncate">{itemName}</span>
                }
              </h4>
              <span className="text-xs text-muted-foreground">Chunk #{chunk.chunk_index + 1}</span>
            </div>
            <div className="text-sm">
              {
                preview ? preview : (
                  <Response parseIncompleteMarkdown={false}>
                    {chunk.chunk_content}
                  </Response>
                )
              }
            </div>
            <div className="text-xs text-muted-foreground flex flex-col gap-1">
              <span className="text-muted-foreground">Source: {chunk.item_name}</span>
              <span className="text-muted-foreground">Chunk #{chunk.chunk_index + 1}</span>
              <span className="text-muted-foreground">Item ID: {chunk.item_id}</span>
              <span className="text-muted-foreground">Item External ID: {chunk.item_external_id}</span>
              <span className="text-muted-foreground">Created at: {chunk.chunk_created_at ? new Date(chunk.chunk_created_at).toLocaleString() : 'N/A'}</span>
              <span className="text-muted-foreground">Updated at: {chunk.chunk_updated_at ? new Date(chunk.chunk_updated_at).toLocaleString() : 'N/A'}</span>
            </div>
            {/* Metadata */}
            <div className="text-xs text-muted-foreground">
              {chunk.chunk_metadata && Object.entries(chunk.chunk_metadata).map(([key, value]) => (
                <div key={key}>
                  <span className="text-muted-foreground">{key}: {value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && !chunk && context && (
          <div className="text-md text-muted-foreground">
            <div className="font-semibold mb-2">Chunk {chunkId} not found in context {context}.</div>
            {/* Show the data as a table */}
            <table className="w-full border-collapse border border-border">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-sm">Key</th>
                  <th className="px-4 py-2 text-left font-semibold text-sm">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2 text-sm">Item name</td>
                  <td className="px-4 py-2 text-sm">{itemName}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm">Chunk ID</td>
                  <td className="px-4 py-2 text-sm">{chunkId}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm">Chunk index</td>
                  <td className="px-4 py-2 text-sm">{chunkIndex}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm">Context</td>
                  <td className="px-4 py-2 text-sm">{context}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {!context && (
          <div className="text-sm text-muted-foreground">Context {context} not available.</div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};

const components = {
  // Custom component to render citation markers as badges
  'cite-marker': ({ node }: { node?: any }) => {
    const dataCitation = node?.properties?.['dataCitation'] as string | undefined;

    if (!dataCitation) {
      return null;
    }

    try {
      const citationContent = decodeURIComponent(dataCitation);
      // Each cite-marker contains a single citation in format:
      // item_name|item_id|chunk_id|chunk_index|context.
      const citeParts = citationContent.split('|');

      if (citeParts.length >= 5) {
        // Extract just the filename from the path if it includes slashes
        const itemName = citeParts[0].split('/').pop() || citeParts[0];
        const itemId = citeParts[1];
        const chunkId = citeParts[2];
        const chunkIndex = citeParts[3];
        const context = citeParts[4];

        return (
          <CitationBadge
            context={context?.trim()}
            itemName={itemName?.trim()}
            itemId={itemId?.trim()}
            chunkId={chunkId?.trim()}
            chunkIndex={chunkIndex?.trim()}
          />
        );
      }

      return null;
    } catch (error) {
      console.error('Error parsing citation:', error);
      return null;
    }
  },
  ol: ({ node, children, className, ...props }) => (
    <ol className={cn('ml-4 list-outside list-decimal', className)} {...props}>
      {children}
    </ol>
  ),
  li: ({ node, children, className, ...props }) => (
    <li className={cn('py-1', className)} {...props}>
      {children}
    </li>
  ),
  ul: ({ node, children, className, ...props }) => (
    <ul className={cn('ml-4 list-outside list-disc', className)} {...props}>
      {children}
    </ul>
  ),
  hr: ({ node, className, ...props }) => (
    <hr className={cn('my-6 border-border', className)} {...props} />
  ),
  strong: ({ node, children, className, ...props }) => (
    <span className={cn('font-semibold', className)} {...props}>
      {children}
    </span>
  ),
  a: ({ node, children, className, ...props }) => (
    <a
      className={cn('font-medium text-primary underline', className)}
      rel="noreferrer"
      target="_blank"
      {...props}
    >
      {children}
    </a>
  ),
  h1: ({ node, children, className, ...props }) => (
    <h1
      className={cn('mt-6 mb-2 font-semibold text-3xl', className)}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ node, children, className, ...props }) => (
    <h2
      className={cn('mt-6 mb-2 font-semibold text-2xl', className)}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ node, children, className, ...props }) => (
    <h3 className={cn('mt-6 mb-2 font-semibold text-xl', className)} {...props}>
      {children}
    </h3>
  ),
  h4: ({ node, children, className, ...props }) => (
    <h4 className={cn('mt-6 mb-2 font-semibold text-lg', className)} {...props}>
      {children}
    </h4>
  ),
  h5: ({ node, children, className, ...props }) => (
    <h5
      className={cn('mt-6 mb-2 font-semibold text-base', className)}
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ node, children, className, ...props }) => (
    <h6 className={cn('mt-6 mb-2 font-semibold text-sm', className)} {...props}>
      {children}
    </h6>
  ),
  table: ({ node, children, className, ...props }) => (
    <div className="my-4 overflow-x-auto">
      <table
        className={cn('w-full border-collapse border border-border', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ node, children, className, ...props }) => (
    <thead className={cn('bg-muted/50', className)} {...props}>
      {children}
    </thead>
  ),
  tbody: ({ node, children, className, ...props }) => (
    <tbody className={cn('divide-y divide-border', className)} {...props}>
      {children}
    </tbody>
  ),
  tr: ({ node, children, className, ...props }) => (
    <tr className={cn('border-border border-b', className)} {...props}>
      {children}
    </tr>
  ),
  th: ({ node, children, className, ...props }) => (
    <th
      className={cn('px-4 py-2 text-left font-semibold text-sm', className)}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ node, children, className, ...props }) => (
    <td className={cn('px-4 py-2 text-sm', className)} {...props}>
      {children}
    </td>
  ),
  blockquote: ({ node, children, className, ...props }) => (
    <blockquote
      className={cn(
        'my-4 border-muted-foreground/30 border-l-4 pl-4 text-muted-foreground italic',
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ node, className, ...props }) => {
    const inline = node?.position?.start.line === node?.position?.end.line;

    if (!inline) {
      return <code className={className} {...props} />;
    }

    return (
      <code
        className={cn(
          'rounded bg-muted px-1.5 py-0.5 font-mono text-sm',
          className
        )}
        {...props}
      />
    );
  },
  pre: ({ node, className, children }) => {
    let language = 'javascript';

    if (typeof node?.properties?.className === 'string') {
      language = node.properties.className.replace('language-', '');
    }

    // Extract code content from children safely
    let code = '';
    if (
      isValidElement(children) &&
      children.props &&
      typeof (children.props as { children?: unknown }).children === 'string'
    ) {
      code = (children.props as { children: string }).children;
    } else if (typeof children === 'string') {
      code = children;
    }

    return (
      <CodeBlock
        className={cn('my-4 h-auto', className)}
        code={code}
        language={language as BundledLanguage}
      >
        <CodeBlockCopyButton
          onCopy={() => console.log('Copied code to clipboard')}
          onError={() => console.error('Failed to copy code to clipboard')}
        />
      </CodeBlock>
    );
  },
};

export const Response = memo(
  ({
    className,
    options,
    children,
    allowedImagePrefixes,
    allowedLinkPrefixes,
    defaultOrigin,
    parseIncompleteMarkdown: shouldParseIncompleteMarkdown = true,
    ...props
  }: ResponseProps) => {
    // Parse the children to remove incomplete markdown tokens if enabled
    const parsedChildren =
      typeof children === 'string' && shouldParseIncompleteMarkdown
        ? parseIncompleteMarkdown(children)
        : children;

    return (
      <div
        className={cn(
          'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
          className
        )}
        {...props}
      >
        <HardenedMarkdown
          allowedImagePrefixes={allowedImagePrefixes ?? ['*']}
          allowedLinkPrefixes={allowedLinkPrefixes ?? ['*']}
          components={components as any}
          defaultOrigin={defaultOrigin}
          rehypePlugins={[rehypeRaw as any, rehypeKatex]}
          remarkPlugins={[remarkGfm, remarkMath]}
          {...options}
        >
          {parsedChildren}
        </HardenedMarkdown>
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = 'Response';

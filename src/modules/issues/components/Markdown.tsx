/**
 * A small markdown renderer for issue bodies and comments.
 *
 * Hand-rolled rather than pulled in as a dependency, and — more importantly —
 * it renders to **React elements**, never to an HTML string. There is no
 * `dangerouslySetInnerHTML` anywhere in this file. Issue bodies are typed by
 * users and shown to other users, so a renderer that injected HTML would be a
 * stored-XSS hole in a page whose entire purpose is pasting in whatever broke.
 *
 * What it supports, which is what people actually type into a bug report:
 *
 *   # ## ###        headings
 *   - * and 1.      bullet and numbered lists (single level)
 *   > quote         blockquotes
 *   ```code```      fenced code blocks
 *   `code`          inline code
 *   **bold** *em*   emphasis
 *   ~~strike~~      strikethrough
 *   [text](url)     links (http/https/mailto and same-origin paths only)
 *   ![alt](url)     images
 *   #41             a reference to another issue, linked
 *   - [ ] / - [x]   task list checkboxes (read-only)
 *   ---             horizontal rule
 *
 * Anything else renders as the literal text the author typed, which is the
 * right failure mode: a report should never lose characters.
 */
import { Link } from 'react-router-dom';

import { cn } from '@/shared/utils';

/** Only these link schemes are rendered as links; anything else stays as text. */
const SAFE_SCHEME = /^(https?:\/\/|mailto:|\/)/i;

interface MarkdownProps {
  source: string;
  className?: string;
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; language: string; lines: string[] }
  | { type: 'quote'; lines: string[] }
  | { type: 'list'; ordered: boolean; items: { text: string; checked: boolean | null }[] }
  | { type: 'rule' };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    // Fenced code. An unterminated fence runs to the end of the text rather
    // than swallowing the rest as a paragraph.
    const fence = line.match(/^```\s*(\S*)\s*$/);
    if (fence) {
      const language = fence[1] ?? '';
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1; // skip the closing fence
      blocks.push({ type: 'code', language, lines: body });
      continue;
    }

    if (/^\s*$/.test(line)) {
      index += 1;
      continue;
    }

    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      blocks.push({ type: 'rule' });
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        text: heading[2].trim(),
      });
      index += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const body: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        body.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      blocks.push({ type: 'quote', lines: body });
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const items: { text: string; checked: boolean | null }[] = [];
      while (index < lines.length) {
        const itemMatch = ordered
          ? lines[index].match(/^\s*\d+[.)]\s+(.*)$/)
          : lines[index].match(/^\s*[-*+]\s+(.*)$/);
        if (!itemMatch) break;
        let text = itemMatch[1];
        let checked: boolean | null = null;
        const task = text.match(/^\[( |x|X)\]\s+(.*)$/);
        if (task) {
          checked = task[1].toLowerCase() === 'x';
          text = task[2];
        }
        items.push({ text, checked });
        index += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // A paragraph runs until a blank line or the start of another block.
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      !/^\s*$/.test(lines[index]) &&
      !/^```/.test(lines[index]) &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !/^\s*>\s?/.test(lines[index]) &&
      !/^\s*[-*+]\s+/.test(lines[index]) &&
      !/^\s*\d+[.)]\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
    }
  }

  return blocks;
}

/**
 * Inline formatting, as React nodes.
 *
 * One pass with a combined pattern, so the first construct to appear wins and
 * the pieces cannot nest into each other incorrectly. Code spans are matched
 * first for the reason every markdown renderer does it: `**not bold**` inside
 * backticks must stay literal.
 */
const INLINE = new RegExp(
  [
    '`([^`]+)`', // 1: inline code
    '!\\[([^\\]]*)\\]\\(([^)\\s]+)\\)', // 2,3: image
    '\\[([^\\]]+)\\]\\(([^)\\s]+)\\)', // 4,5: link
    '\\*\\*([^*]+)\\*\\*', // 6: bold
    '__([^_]+)__', // 7: bold
    '\\*([^*\\n]+)\\*', // 8: italic
    '~~([^~]+)~~', // 9: strikethrough
    '(?:^|(?<=\\s))#(\\d+)\\b', // 10: issue reference
    '(https?://[^\\s<>()]+)', // 11: bare URL
  ].join('|'),
  'g',
);

function renderInline(text: string, keyPrefix: string) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let counter = 0;
  INLINE.lastIndex = 0;

  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const key = `${keyPrefix}-${counter++}`;
    const [
      ,
      code,
      imageAlt,
      imageUrl,
      linkText,
      linkUrl,
      boldStar,
      boldUnderscore,
      italic,
      strike,
      issueNumber,
      bareUrl,
    ] = match;

    if (code !== undefined) {
      nodes.push(
        <code
          key={key}
          className="rounded border bg-muted px-1 py-0.5 font-mono text-[0.85em]"
        >
          {code}
        </code>,
      );
    } else if (imageUrl !== undefined) {
      nodes.push(
        SAFE_SCHEME.test(imageUrl) ? (
          <img
            key={key}
            src={imageUrl}
            alt={imageAlt || ''}
            className="my-2 max-h-[480px] max-w-full rounded border"
          />
        ) : (
          `![${imageAlt}](${imageUrl})`
        ),
      );
    } else if (linkUrl !== undefined) {
      nodes.push(
        SAFE_SCHEME.test(linkUrl) ? (
          <a
            key={key}
            href={linkUrl}
            target={linkUrl.startsWith('/') ? undefined : '_blank'}
            rel="noreferrer noopener"
            className="text-primary underline underline-offset-2 hover:no-underline"
          >
            {linkText}
          </a>
        ) : (
          `[${linkText}](${linkUrl})`
        ),
      );
    } else if (boldStar !== undefined || boldUnderscore !== undefined) {
      nodes.push(
        <strong key={key} className="font-semibold">
          {boldStar ?? boldUnderscore}
        </strong>,
      );
    } else if (italic !== undefined) {
      nodes.push(<em key={key}>{italic}</em>);
    } else if (strike !== undefined) {
      nodes.push(
        <span key={key} className="line-through opacity-70">
          {strike}
        </span>,
      );
    } else if (issueNumber !== undefined) {
      // "#41" links to that issue -- the way people cross-reference in prose.
      nodes.push(
        <Link
          key={key}
          to={`/issues/${issueNumber}`}
          className="font-medium text-primary hover:underline"
        >
          #{issueNumber}
        </Link>,
      );
    } else if (bareUrl !== undefined) {
      nodes.push(
        <a
          key={key}
          href={bareUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="break-all text-primary underline underline-offset-2 hover:no-underline"
        >
          {bareUrl}
        </a>,
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

/** Newlines inside a paragraph render as line breaks, as they do on GitHub. */
function renderParagraphText(text: string, keyPrefix: string) {
  return text.split('\n').flatMap((line, index) => {
    const rendered = renderInline(line, `${keyPrefix}-l${index}`);
    return index === 0 ? rendered : [<br key={`${keyPrefix}-br${index}`} />, ...rendered];
  });
}

const HEADING_CLASS: Record<number, string> = {
  1: 'text-xl font-semibold',
  2: 'text-lg font-semibold',
  3: 'text-base font-semibold',
  4: 'text-sm font-semibold',
  5: 'text-sm font-semibold',
  6: 'text-sm font-semibold text-muted-foreground',
};

export function Markdown({ source, className }: MarkdownProps) {
  const trimmed = (source ?? '').trim();
  if (!trimmed) {
    return <p className={cn('text-sm italic text-muted-foreground', className)}>No description provided.</p>;
  }

  const blocks = parseBlocks(trimmed);

  return (
    <div className={cn('space-y-3 text-sm leading-relaxed', className)}>
      {blocks.map((block, index) => {
        const key = `b${index}`;
        switch (block.type) {
          case 'heading': {
            const Tag = `h${Math.min(block.level + 1, 6)}` as 'h2';
            return (
              <Tag key={key} className={cn('mt-1', HEADING_CLASS[block.level])}>
                {renderInline(block.text, key)}
              </Tag>
            );
          }
          case 'code':
            return (
              <pre
                key={key}
                className="overflow-x-auto rounded-md border bg-muted p-3 font-mono text-xs"
              >
                <code>{block.lines.join('\n')}</code>
              </pre>
            );
          case 'quote':
            return (
              <blockquote
                key={key}
                className="border-l-4 pl-3 text-muted-foreground"
              >
                {renderParagraphText(block.lines.join('\n'), key)}
              </blockquote>
            );
          case 'list':
            return block.ordered ? (
              <ol key={key} className="list-decimal space-y-1 pl-6">
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    {renderInline(item.text, `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ol>
            ) : (
              <ul
                key={key}
                className={cn(
                  'space-y-1',
                  // A task list keeps its own checkbox, so it loses the bullet.
                  block.items.some((item) => item.checked !== null)
                    ? 'pl-1'
                    : 'list-disc pl-6',
                )}
              >
                {block.items.map((item, itemIndex) => (
                  <li
                    key={`${key}-${itemIndex}`}
                    className={item.checked !== null ? 'flex items-start gap-2 list-none' : undefined}
                  >
                    {item.checked !== null && (
                      <input
                        type="checkbox"
                        checked={item.checked}
                        readOnly
                        className="mt-1 h-3.5 w-3.5"
                        aria-label={item.text}
                      />
                    )}
                    <span className={item.checked ? 'text-muted-foreground line-through' : undefined}>
                      {renderInline(item.text, `${key}-${itemIndex}`)}
                    </span>
                  </li>
                ))}
              </ul>
            );
          case 'rule':
            return <hr key={key} className="border-t" />;
          case 'paragraph':
          default:
            return <p key={key}>{renderParagraphText(block.text, key)}</p>;
        }
      })}
    </div>
  );
}

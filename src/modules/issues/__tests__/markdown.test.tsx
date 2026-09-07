import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Markdown } from '../components/Markdown';

/**
 * The renderer's job is to format a bug report without ever handing user text
 * to the DOM as markup. The XSS cases below are the reason it renders React
 * nodes instead of an HTML string, so they are the tests that matter most.
 */
function renderMarkdown(source: string) {
  return render(
    <MemoryRouter>
      <Markdown source={source} />
    </MemoryRouter>,
  );
}

describe('markdown safety', () => {
  it('never injects raw HTML', () => {
    const { container } = renderMarkdown('<img src=x onerror="alert(1)"> and <b>bold</b>');
    expect(container.querySelector('img')).toBeNull();
    // The tags survive as literal text -- a report must not lose characters.
    expect(container.textContent).toContain('<img src=x onerror="alert(1)">');
    expect(container.querySelector('b')).toBeNull();
  });

  it('refuses a javascript: link', () => {
    const { container } = renderMarkdown('[click me](javascript:alert(1))');
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('[click me](javascript:alert(1))');
  });

  it('refuses a javascript: image', () => {
    const { container } = renderMarkdown('![x](javascript:alert(1))');
    expect(container.querySelector('img')).toBeNull();
  });

  it('allows an https link and opens it in a new tab', () => {
    renderMarkdown('[docs](https://example.com/page)');
    const link = screen.getByRole('link', { name: 'docs' });
    expect(link).toHaveAttribute('href', 'https://example.com/page');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('allows a same-origin path and keeps it in the app', () => {
    renderMarkdown('[the screen](/dispatch/bills-linking)');
    const link = screen.getByRole('link', { name: 'the screen' });
    expect(link).toHaveAttribute('href', '/dispatch/bills-linking');
    expect(link).not.toHaveAttribute('target');
  });
});

describe('markdown formatting', () => {
  it('renders headings, bold and inline code', () => {
    const { container } = renderMarkdown('## What happened\n\nThe **scan** hit `KeyError`.');
    expect(screen.getByText('What happened').tagName).toBe('H3');
    expect(container.querySelector('strong')?.textContent).toBe('scan');
    expect(container.querySelector('code')?.textContent).toBe('KeyError');
  });

  it('keeps markdown inside a code span literal', () => {
    const { container } = renderMarkdown('`**not bold**`');
    expect(container.querySelector('strong')).toBeNull();
    expect(container.querySelector('code')?.textContent).toBe('**not bold**');
  });

  it('renders a fenced code block whole', () => {
    const { container } = renderMarkdown('```python\nprint(1)\nprint(2)\n```');
    expect(container.querySelector('pre')?.textContent).toBe('print(1)\nprint(2)');
  });

  it('renders an unterminated fence rather than dropping the text', () => {
    const { container } = renderMarkdown('```\nhalf a traceback');
    expect(container.querySelector('pre')?.textContent).toBe('half a traceback');
  });

  it('renders bullet and numbered lists', () => {
    const { container } = renderMarkdown('- one\n- two\n\n1. first\n2. second');
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
  });

  it('renders a task list with its checkboxes', () => {
    const { container } = renderMarkdown('- [x] done\n- [ ] not done');
    const boxes = container.querySelectorAll('input[type="checkbox"]');
    expect(boxes).toHaveLength(2);
    expect((boxes[0] as HTMLInputElement).checked).toBe(true);
    expect((boxes[1] as HTMLInputElement).checked).toBe(false);
  });

  it('links a #number reference to that issue', () => {
    renderMarkdown('Same as #41 probably.');
    expect(screen.getByRole('link', { name: '#41' })).toHaveAttribute('href', '/issues/41');
  });

  it('does not treat a heading as an issue reference', () => {
    renderMarkdown('# Heading');
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Heading')).toBeTruthy();
  });

  it('says so when there is no description', () => {
    renderMarkdown('   ');
    expect(screen.getByText('No description provided.')).toBeTruthy();
  });
});

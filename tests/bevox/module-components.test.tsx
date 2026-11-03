/**
 * Reusability + default-state tests for ModuleStream and ModuleSection.
 *
 * Uses `react-dom/server::renderToStaticMarkup` (no new dep, no DOM
 * environment needed) to SSR the components in multiple configurations
 * and assert the resulting HTML. This proves:
 *
 *   - the components are typed correctly (tsc in vitest transform)
 *   - the title / subtitle / count / children slots work
 *   - the collapse state (`defaultOpen`) properly hides children when false
 *   - multiple instances with different props render independently
 *
 * Note: we cannot assert the CLICK behavior here because that requires a
 * DOM + React event system. The click handler itself is a single-line
 * `setOpen(o => !o)` — the risk of it breaking is minimal and Tasks
 * 12-15 will exercise it for real when the module pages ship.
 */

/* eslint-disable react/no-children-prop -- children are passed as createElement args; the null prop only satisfies the props type */
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ModuleStream } from '@/components/bevox/ModuleStream';
import { ModuleSection } from '@/components/bevox/ModuleSection';

describe('ModuleStream', () => {
  it('renders title, subtitle, and children', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ModuleStream,
        { children: null, title: 'Knowledge', subtitle: 'estado do clone' },
        React.createElement('span', null, 'body content'),
      ),
    );
    expect(html).toContain('Knowledge');
    expect(html).toContain('estado do clone');
    expect(html).toContain('body content');
    expect(html).toContain('data-mc-module-stream');
  });

  it('omits subtitle when not provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ModuleStream,
        { children: null, title: 'Approvals' },
        React.createElement('span', null, 'x'),
      ),
    );
    expect(html).toContain('Approvals');
    // The subtitle <p> tag should not appear
    expect(html).not.toContain('estado do clone');
  });

  it('accepts multiple children in order', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ModuleStream,
        { children: null, title: 'Health' },
        React.createElement('span', { key: 'a' }, 'FIRST'),
        React.createElement('span', { key: 'b' }, 'SECOND'),
        React.createElement('span', { key: 'c' }, 'THIRD'),
      ),
    );
    const firstIdx = html.indexOf('FIRST');
    const secondIdx = html.indexOf('SECOND');
    const thirdIdx = html.indexOf('THIRD');
    expect(firstIdx).toBeGreaterThan(0);
    expect(secondIdx).toBeGreaterThan(firstIdx);
    expect(thirdIdx).toBeGreaterThan(secondIdx);
  });
});

describe('ModuleSection', () => {
  it('renders title and children when defaultOpen=true (default)', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ModuleSection,
        { children: null, title: 'status' },
        React.createElement('span', null, 'inner body'),
      ),
    );
    expect(html).toContain('status');
    expect(html).toContain('inner body');
    expect(html).toContain('data-open="true"');
    expect(html).toContain('aria-expanded="true"');
    // Collapsed marker should be minus sign (HTML-escaped)
    expect(html).toMatch(/\[(−|&#x2212;)\]/);
  });

  it('hides children and shows the + marker when defaultOpen=false', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ModuleSection,
        { children: null, title: 'events', defaultOpen: false },
        React.createElement('span', null, 'secret body'),
      ),
    );
    expect(html).toContain('events');
    expect(html).not.toContain('secret body');
    expect(html).toContain('data-open="false"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('[+]');
  });

  it('renders the count when provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ModuleSection,
        { children: null, title: 'drafts', count: 7 },
        React.createElement('span', null, 'x'),
      ),
    );
    expect(html).toContain('drafts');
    expect(html).toContain('· 7');
  });

  it('does not render the count dot when count is undefined', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ModuleSection,
        { children: null, title: 'status' },
        React.createElement('span', null, 'x'),
      ),
    );
    // The bullet separator only appears with a count
    expect(html).not.toContain('· ');
  });

  it('renders count = 0 as "· 0" (zero is valid)', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ModuleSection,
        { children: null, title: 'drafts', count: 0 },
        React.createElement('span', null, 'x'),
      ),
    );
    expect(html).toContain('· 0');
  });

  it('is reusable: multiple instances render independently', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        'div',
        null,
        React.createElement(
          ModuleSection,
          { children: null, key: '1', title: 'first', defaultOpen: true },
          React.createElement('span', null, 'ONE'),
        ),
        React.createElement(
          ModuleSection,
          { children: null, key: '2', title: 'second', defaultOpen: false },
          React.createElement('span', null, 'TWO'),
        ),
        React.createElement(
          ModuleSection,
          { children: null, key: '3', title: 'third', count: 42 },
          React.createElement('span', null, 'THREE'),
        ),
      ),
    );
    // First is open → body visible
    expect(html).toContain('first');
    expect(html).toContain('ONE');
    // Second is closed → body hidden
    expect(html).toContain('second');
    expect(html).not.toContain('TWO');
    // Third has count + is open → body visible
    expect(html).toContain('third');
    expect(html).toContain('· 42');
    expect(html).toContain('THREE');
  });
});

describe('ModuleStream + ModuleSection integration', () => {
  it('composes a realistic module page layout', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ModuleStream,
        { children: null, title: 'Knowledge', subtitle: 'estado do bevox-knowledge' },
        React.createElement(
          ModuleSection,
          { children: null, key: 'status', title: 'status' },
          React.createElement('dl', null, 'branch main / clean'),
        ),
        React.createElement(
          ModuleSection,
          { children: null, key: 'drafts', title: 'drafts', count: 2, defaultOpen: false },
          React.createElement('span', null, 'draft list'),
        ),
      ),
    );
    expect(html).toContain('Knowledge');
    expect(html).toContain('estado do bevox-knowledge');
    expect(html).toContain('status');
    expect(html).toContain('branch main / clean'); // status section is open
    expect(html).toContain('drafts');
    expect(html).toContain('· 2');
    expect(html).not.toContain('draft list'); // drafts section is closed
  });
});

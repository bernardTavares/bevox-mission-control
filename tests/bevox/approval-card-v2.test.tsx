/**
 * ApprovalCardV2 rendering tests.
 *
 * Uses react-dom/server::renderToStaticMarkup to render the card for each
 * of the 3 canonical action types + the fallback "no card" case, and asserts
 * that every block (Ação / Resumo / Por que agora / Alvo / Evidência / Risco
 * / Rollback) is present and correctly specialized to the action.
 *
 * This also proves that the component is purely presentational — no state,
 * no effects, no fetches — by rendering server-side without a DOM.
 */

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {
  ApprovalCardV2,
  type CardV2,
} from '@/components/bevox/ApprovalCardV2';

function render(el: React.ReactElement): string {
  return renderToStaticMarkup(el);
}

describe('ApprovalCardV2 — commit action', () => {
  const commitCard: CardV2 = {
    summary: 'Commit em main: adiciona ADR-007',
    why_now: 'Você editou 2 arquivos canônicos e solicitou commit.',
    target: {
      branch: 'main',
      scope: '2 arquivo(s) canônico(s)',
      files: ['30_adr/ADR-007-naming.md', '20_architecture/system-map.md'],
    },
    evidence: {
      commit_message: 'adr(007): aceita ADR-007',
      diffstat: ' 30_adr/ADR-007-naming.md | 42 ++++++++++\n 1 file changed',
      diff_preview: '+++ b/30_adr/ADR-007-naming.md\n+# ADR-007\n+## Status: aceita',
      diff_preview_file: '30_adr/ADR-007-naming.md',
      diff_preview_truncated: false,
    },
    risk: {
      level: 'medium',
      reason: 'mexe em ADR aceita',
      rollback: 'knowledge-sync restore <bundle> --apply',
    },
  };

  it('renders all 6 blocks with commit-specific target + evidence', () => {
    const html = render(
      React.createElement(ApprovalCardV2, {
        shortId: 'aaaaaaaa',
        action: 'canonical commit',
        card: commitCard,
        state: 'pending',
      }),
    );
    // Header
    expect(html).toContain('[aaaaaaaa]');
    expect(html).toContain('pending');
    // Block labels (uppercase with letter-spacing — check for the text)
    expect(html).toContain('Ação');
    expect(html).toContain('Resumo');
    expect(html).toContain('Por que agora');
    expect(html).toContain('Alvo');
    expect(html).toContain('Evidência');
    expect(html).toContain('Risco / Rollback');
    // Content
    expect(html).toContain('canonical commit');
    expect(html).toContain('Commit em main: adiciona ADR-007');
    expect(html).toContain('Você editou 2 arquivos canônicos');
    // Commit-specific target block
    expect(html).toContain('Branch');
    expect(html).toContain('main');
    expect(html).toContain('30_adr/ADR-007-naming.md');
    expect(html).toContain('20_architecture/system-map.md');
    // Commit-specific evidence block
    expect(html).toContain('adr(007): aceita ADR-007');
    expect(html).toContain('Diffstat:');
    // Risk
    expect(html).toContain('medium');
    expect(html).toContain('mexe em ADR aceita');
    expect(html).toContain('restore &lt;bundle&gt;');
    // Footer reminder
    expect(html).toContain('Telegram');
    expect(html).toContain('read-only');
    // Data attributes
    expect(html).toContain('data-mc-approval-card');
    expect(html).toContain('data-mc-action="canonical commit"');
    expect(html).toContain('data-mc-state="pending"');
  });
});

describe('ApprovalCardV2 — push action', () => {
  const pushCard: CardV2 = {
    summary: 'Push de 3 commits para origin/main',
    why_now: 'A branch main está 3 commits à frente de origin/main.',
    target: {
      branch: 'main',
      remote: 'origin',
      commits_ahead: 3,
    },
    evidence: {
      commits_preview: 'abc1234 feat: add X\ndef5678 fix: handle Y\nghi9012 docs: Z',
      is_fast_forward: true,
    },
    risk: {
      level: 'low',
      reason: 'Fast-forward trivial',
      rollback: 'git revert <sha>',
    },
  };

  it('renders push-specific target + evidence blocks', () => {
    const html = render(
      React.createElement(ApprovalCardV2, {
        shortId: 'bbbbbbbb',
        action: 'canonical push',
        card: pushCard,
        state: 'granted',
      }),
    );
    expect(html).toContain('[bbbbbbbb]');
    expect(html).toContain('canonical push');
    // Push-specific target
    expect(html).toContain('Commits a subir');
    expect(html).toContain('main → origin/main');
    expect(html).toContain('3');
    // Push-specific evidence
    expect(html).toContain('Commits:');
    expect(html).toContain('feat: add X');
    expect(html).toContain('Fast-forward:');
    expect(html).toContain('yes');
    expect(html).toContain('granted');
  });
});

describe('ApprovalCardV2 — marker action', () => {
  const markerCard: CardV2 = {
    summary: 'Criar release tag v0.3-knowledge-spine',
    why_now: 'Release marker solicitado após foundation freeze',
    target: {
      tag: 'v0.3-knowledge-spine',
      head_sha: 'abcdef1234567890abcdef',
      version: 'v0.3',
      type: 'release',
    },
    evidence: {
      marker_message: 'release: E1 Knowledge Spine complete',
      recent_commits: 'abc1234 feat\ndef5678 fix',
    },
    risk: {
      level: 'high',
      reason: 'release tag major',
      rollback: 'git tag -d <tag>',
    },
  };

  it('renders marker-specific target + evidence blocks', () => {
    const html = render(
      React.createElement(ApprovalCardV2, {
        shortId: 'cccccccc',
        action: 'canonical create-marker',
        card: markerCard,
        state: 'executed',
      }),
    );
    expect(html).toContain('[cccccccc]');
    expect(html).toContain('canonical create-marker');
    // Marker-specific target
    expect(html).toContain('Tag');
    expect(html).toContain('v0.3-knowledge-spine');
    expect(html).toContain('abcdef1234'); // first 10 chars of head_sha
    expect(html).toContain('Versão');
    expect(html).toContain('Tipo');
    expect(html).toContain('release');
    // Marker-specific evidence
    expect(html).toContain('Mensagem do marker');
    expect(html).toContain('E1 Knowledge Spine complete');
    expect(html).toContain('Commits recentes marcados');
    // Risk high
    expect(html).toContain('high');
    expect(html).toContain('executed');
  });
});

describe('ApprovalCardV2 — fallback for missing card', () => {
  it('renders a minimal header when card is null', () => {
    const html = render(
      React.createElement(ApprovalCardV2, {
        shortId: 'dddddddd',
        action: 'canonical commit',
        card: null,
        state: 'expired',
      }),
    );
    expect(html).toContain('[dddddddd]');
    expect(html).toContain('canonical commit');
    expect(html).toContain('expired');
    expect(html).toContain('sem card');
    // The full 6-block layout should NOT be there
    expect(html).not.toContain('Por que agora');
  });
});

describe('ApprovalCardV2 — state pill', () => {
  it('omits the pill when state is undefined', () => {
    const html = render(
      React.createElement(ApprovalCardV2, {
        shortId: 'eeeeeeee',
        action: 'canonical commit',
        card: { summary: 's', why_now: 'w' },
      }),
    );
    // No state → no pill element; header still has the shortId
    expect(html).toContain('[eeeeeeee]');
    expect(html).not.toContain('data-mc-state="pending"');
  });
});

describe('ApprovalCardV2 — zero mutation surfaces', () => {
  it('never renders a button or form for approve/reject', () => {
    const html = render(
      React.createElement(ApprovalCardV2, {
        shortId: 'ffffffff',
        action: 'canonical commit',
        card: {
          summary: 'x',
          why_now: 'y',
          target: { branch: 'main' },
          evidence: { commit_message: 'z' },
          risk: { level: 'low' },
        },
        state: 'pending',
      }),
    );
    // Not a single <button>, <form>, or onClick action
    expect(html).not.toMatch(/<button[\s>]/i);
    expect(html).not.toMatch(/<form[\s>]/i);
    expect(html).not.toMatch(/onclick=/i);
    expect(html).not.toMatch(/type="submit"/i);
    // Also not the words that imply an action surface
    expect(html.toLowerCase()).not.toContain('aprovar');
    expect(html.toLowerCase()).not.toContain('rejeitar');
    expect(html.toLowerCase()).not.toContain('executar');
  });
});

/**
 * Testes unitários para validate-compliance.js
 * Verifica extração de tokens, parsing de CSS, e detecção de violações.
 */

import { describe, it, expect } from 'vitest';
import {
  extractDesignTokens,
  extractPresentationStyles,
  extractInlineStyles,
  parseCssDeclarations,
  isAllowedValue,
  matchesTokenValue,
  validateCompliance
} from '../../src/validate-compliance.js';

// ============================================================
// Design System CSS de teste
// ============================================================

const MOCK_DESIGN_SYSTEM = `
:root {
  --color-primary: #1B2A4A;
  --color-secondary: #C9A96E;
  --color-accent: #722F37;
  --color-neutral: #FAF8F5;
  --color-text: #2C2C2C;
  --color-text-light: #F5F5F0;
  --font-heading: 'Playfair Display', serif;
  --font-body: 'Inter', sans-serif;
  --font-weight-heading: 700;
  --font-weight-body: 400;
  --font-size-h1: 48px;
  --font-size-h2: 36px;
  --font-size-h3: 28px;
  --font-size-body: 16px;
  --font-size-small: 14px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 32px;
  --space-xl: 64px;
  --border-thin: 1px solid var(--color-secondary);
  --border-accent: 2px solid var(--color-accent);
  --shadow-subtle: 0 2px 8px rgba(27, 42, 74, 0.08);
  --shadow-elevated: 0 8px 32px rgba(27, 42, 74, 0.16);
  --transition-default: 400ms ease;
}
`;

// ============================================================
// extractDesignTokens
// ============================================================

describe('extractDesignTokens', () => {
  it('extrai tokens de cores corretamente', () => {
    const tokens = extractDesignTokens(MOCK_DESIGN_SYSTEM);
    expect(tokens.colors).toHaveLength(6);
    expect(tokens.colors[0]).toEqual({ name: '--color-primary', value: '#1B2A4A' });
  });

  it('extrai tokens de fontes', () => {
    const tokens = extractDesignTokens(MOCK_DESIGN_SYSTEM);
    expect(tokens.fonts.length).toBeGreaterThanOrEqual(2);
    expect(tokens.fonts.find(f => f.name === '--font-heading')).toBeDefined();
    expect(tokens.fonts.find(f => f.name === '--font-body')).toBeDefined();
  });

  it('extrai tokens de font-size', () => {
    const tokens = extractDesignTokens(MOCK_DESIGN_SYSTEM);
    expect(tokens.fontSizes.length).toBeGreaterThanOrEqual(5);
    expect(tokens.fontSizes.find(f => f.name === '--font-size-h1')).toBeDefined();
  });

  it('extrai tokens de espaçamento', () => {
    const tokens = extractDesignTokens(MOCK_DESIGN_SYSTEM);
    expect(tokens.spacing.length).toBeGreaterThanOrEqual(5);
    expect(tokens.spacing.find(s => s.name === '--space-md')).toBeDefined();
  });

  it('extrai tokens de bordas e sombras', () => {
    const tokens = extractDesignTokens(MOCK_DESIGN_SYSTEM);
    expect(tokens.borders.length).toBeGreaterThanOrEqual(2);
    expect(tokens.shadows.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// extractPresentationStyles
// ============================================================

describe('extractPresentationStyles', () => {
  it('extrai bloco #presentation-styles do HTML', () => {
    const html = `
      <style id="design-system">:root { --color: red; }</style>
      <style id="presentation-styles">
        .reveal { color: var(--color-text); }
        .reveal h1 { font-size: var(--font-size-h1); }
      </style>
    `;
    const css = extractPresentationStyles(html);
    expect(css).toContain('.reveal { color: var(--color-text); }');
    expect(css).toContain('.reveal h1 { font-size: var(--font-size-h1); }');
  });

  it('retorna string vazia se bloco não existe', () => {
    const html = '<style id="other">body { margin: 0; }</style>';
    const css = extractPresentationStyles(html);
    expect(css).toBe('');
  });
});

// ============================================================
// extractInlineStyles
// ============================================================

describe('extractInlineStyles', () => {
  it('extrai inline styles de elementos', () => {
    const html = `
      <!-- Slides Content (injected) -->
      <div class="reveal"><div class="slides">
        <section>
          <p style="color: #ff0000; font-size: 20px">Texto</p>
          <div style="margin: 10px">Box</div>
        </section>
      </div></div>
    `;
    const styles = extractInlineStyles(html);
    expect(styles.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// parseCssDeclarations
// ============================================================

describe('parseCssDeclarations', () => {
  it('parseia declarações CSS simples', () => {
    const css = `.reveal { color: var(--color-text); font-size: 16px; }`;
    const decls = parseCssDeclarations(css);
    expect(decls).toContainEqual({
      selector: '.reveal',
      property: 'color',
      value: 'var(--color-text)'
    });
    expect(decls).toContainEqual({
      selector: '.reveal',
      property: 'font-size',
      value: '16px'
    });
  });

  it('parseia múltiplos seletores', () => {
    const css = `
      .reveal h1 { color: #1B2A4A; }
      .reveal p { font-size: 16px; }
    `;
    const decls = parseCssDeclarations(css);
    expect(decls.find(d => d.selector === '.reveal h1')).toBeDefined();
    expect(decls.find(d => d.selector === '.reveal p')).toBeDefined();
  });

  it('parseia regras dentro de @media', () => {
    const css = `
      @media (max-width: 768px) {
        .reveal h1 { font-size: 32px; }
      }
    `;
    const decls = parseCssDeclarations(css);
    expect(decls.find(d => d.property === 'font-size' && d.value === '32px')).toBeDefined();
  });
});

// ============================================================
// isAllowedValue
// ============================================================

describe('isAllowedValue', () => {
  it('permite var() references', () => {
    expect(isAllowedValue('var(--color-primary)', 'color')).toBe(true);
    expect(isAllowedValue('var(--space-md)', 'padding')).toBe(true);
  });

  it('permite inherit, initial, unset', () => {
    expect(isAllowedValue('inherit', 'color')).toBe(true);
    expect(isAllowedValue('initial', 'margin')).toBe(true);
    expect(isAllowedValue('unset', 'padding')).toBe(true);
  });

  it('permite auto e none', () => {
    expect(isAllowedValue('auto', 'margin')).toBe(true);
    expect(isAllowedValue('none', 'border')).toBe(true);
  });

  it('permite valor 0', () => {
    expect(isAllowedValue('0', 'margin')).toBe(true);
    expect(isAllowedValue('0px', 'padding')).toBe(true);
  });

  it('permite porcentagens', () => {
    expect(isAllowedValue('50%', 'margin')).toBe(true);
    expect(isAllowedValue('100%', 'font-size')).toBe(true);
  });

  it('não permite valores hex ad-hoc', () => {
    expect(isAllowedValue('#ff0000', 'color')).toBe(false);
    expect(isAllowedValue('#123456', 'background-color')).toBe(false);
  });

  it('não permite valores px ad-hoc para font-size', () => {
    expect(isAllowedValue('20px', 'font-size')).toBe(false);
  });

  it('permite transparent e currentColor', () => {
    expect(isAllowedValue('transparent', 'background-color')).toBe(true);
    expect(isAllowedValue('currentColor', 'color')).toBe(true);
  });
});

// ============================================================
// matchesTokenValue
// ============================================================

describe('matchesTokenValue', () => {
  const tokens = extractDesignTokens(MOCK_DESIGN_SYSTEM);

  it('reconhece valor literal de cor do design system', () => {
    expect(matchesTokenValue('#1B2A4A', 'color', tokens)).toBe(true);
    expect(matchesTokenValue('#C9A96E', 'background-color', tokens)).toBe(true);
  });

  it('reconhece valor literal de font-size do design system', () => {
    expect(matchesTokenValue('48px', 'font-size', tokens)).toBe(true);
    expect(matchesTokenValue('16px', 'font-size', tokens)).toBe(true);
  });

  it('reconhece valor literal de spacing do design system', () => {
    expect(matchesTokenValue('16px', 'padding', tokens)).toBe(true);
    expect(matchesTokenValue('32px', 'margin', tokens)).toBe(true);
  });

  it('rejeita valores que não são tokens', () => {
    expect(matchesTokenValue('#ff0000', 'color', tokens)).toBe(false);
    expect(matchesTokenValue('20px', 'font-size', tokens)).toBe(false);
    expect(matchesTokenValue('10px', 'padding', tokens)).toBe(false);
  });
});

// ============================================================
// validateCompliance (integração)
// ============================================================

describe('validateCompliance', () => {
  it('retorna compliant para HTML que usa apenas tokens', () => {
    const html = `
      <style id="presentation-styles">
        .reveal { color: var(--color-text); font-size: var(--font-size-body); }
        .reveal h1 { font-size: var(--font-size-h1); color: var(--color-primary); }
        .reveal .slide-content { padding: var(--space-lg); margin: 0; }
      </style>
      <div class="reveal"><div class="slides"><section></section></div></div>
    `;
    const report = validateCompliance(html, MOCK_DESIGN_SYSTEM);
    expect(report.compliant).toBe(true);
    expect(report.violations).toHaveLength(0);
  });

  it('detecta violação de cor ad-hoc', () => {
    const html = `
      <style id="presentation-styles">
        .reveal .custom { color: #ff0000; }
      </style>
      <div class="reveal"><div class="slides"><section></section></div></div>
    `;
    const report = validateCompliance(html, MOCK_DESIGN_SYSTEM);
    expect(report.compliant).toBe(false);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0].property).toBe('color');
    expect(report.violations[0].value).toBe('#ff0000');
  });

  it('detecta violação de font-size ad-hoc', () => {
    const html = `
      <style id="presentation-styles">
        .reveal .big { font-size: 72px; }
      </style>
      <div class="reveal"><div class="slides"><section></section></div></div>
    `;
    const report = validateCompliance(html, MOCK_DESIGN_SYSTEM);
    expect(report.compliant).toBe(false);
    expect(report.violations[0].property).toBe('font-size');
    expect(report.violations[0].value).toBe('72px');
  });

  it('permite valores literais que correspondem a tokens', () => {
    const html = `
      <style id="presentation-styles">
        .reveal { color: #2C2C2C; font-size: 16px; padding: 32px; }
      </style>
      <div class="reveal"><div class="slides"><section></section></div></div>
    `;
    const report = validateCompliance(html, MOCK_DESIGN_SYSTEM);
    expect(report.compliant).toBe(true);
  });

  it('reporta summary correto', () => {
    const html = `
      <style id="presentation-styles">
        .reveal { color: var(--color-text); font-size: 99px; padding: var(--space-md); }
      </style>
      <div class="reveal"><div class="slides"><section></section></div></div>
    `;
    const report = validateCompliance(html, MOCK_DESIGN_SYSTEM);
    expect(report.summary.totalChecked).toBe(3);
    expect(report.summary.violations).toBe(1);
    expect(report.summary.compliant).toBe(2);
  });

  it('exit code 0 para compliant, 3 para violações (verificado via report.compliant)', () => {
    const compliantHtml = `
      <style id="presentation-styles">
        .reveal { color: var(--color-text); }
      </style>
    `;
    const violatingHtml = `
      <style id="presentation-styles">
        .reveal { color: #ff0000; }
      </style>
    `;
    expect(validateCompliance(compliantHtml, MOCK_DESIGN_SYSTEM).compliant).toBe(true);
    expect(validateCompliance(violatingHtml, MOCK_DESIGN_SYSTEM).compliant).toBe(false);
  });
});

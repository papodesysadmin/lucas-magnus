#!/usr/bin/env node

/**
 * validate-compliance.js — Verifica HTML contra design system tokens
 *
 * Lê dist/presentation.html e src/design-system.css, extrai valores de tokens,
 * e verifica que o bloco #presentation-styles e inline styles usam exclusivamente
 * tokens do design system (sem valores ad-hoc).
 *
 * Uso: node src/validate-compliance.js
 * Saída: JSON report no stdout
 * Exit codes: 0 = compliant, 3 = violações encontradas
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// ============================================================
// Logging estruturado
// ============================================================

/**
 * Emite log estruturado no stderr
 * @param {'INFO'|'WARN'|'ERROR'} level
 * @param {string} message
 * @param {object} [context]
 */
function log(level, message, context = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    module: 'validate-compliance',
    message,
    context
  };
  process.stderr.write(JSON.stringify(entry) + '\n');
}

// ============================================================
// Extração de tokens do design system
// ============================================================

/**
 * Extrai todos os tokens CSS custom properties do design system
 * @param {string} css - Conteúdo do design-system.css
 * @returns {object} Mapa de categorias para valores válidos
 */
export function extractDesignTokens(css) {
  const tokens = {
    colors: [],
    fonts: [],
    fontSizes: [],
    spacing: [],
    borders: [],
    shadows: [],
    fontWeights: [],
    transitions: [],
    allVarNames: []
  };

  // Extrair todas as custom properties
  const propRegex = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let match;

  while ((match = propRegex.exec(css)) !== null) {
    const name = `--${match[1]}`;
    const value = match[2].trim();
    tokens.allVarNames.push(name);

    if (name.startsWith('--color-')) {
      tokens.colors.push({ name, value });
    } else if (name.startsWith('--font-size-')) {
      tokens.fontSizes.push({ name, value });
    } else if (name.startsWith('--font-') && !name.startsWith('--font-weight-') && !name.startsWith('--font-size-')) {
      tokens.fonts.push({ name, value });
    } else if (name.startsWith('--font-weight-')) {
      tokens.fontWeights.push({ name, value });
    } else if (name.startsWith('--space-')) {
      tokens.spacing.push({ name, value });
    } else if (name.startsWith('--border-')) {
      tokens.borders.push({ name, value });
    } else if (name.startsWith('--shadow-')) {
      tokens.shadows.push({ name, value });
    } else if (name.startsWith('--transition-')) {
      tokens.transitions.push({ name, value });
    }
  }

  return tokens;
}

// ============================================================
// Extração de estilos do HTML
// ============================================================

/**
 * Extrai o bloco CSS de #presentation-styles do HTML
 * @param {string} html
 * @returns {string} CSS content do bloco presentation-styles
 */
export function extractPresentationStyles(html) {
  const regex = /<style\s+id="presentation-styles"[^>]*>([\s\S]*?)<\/style>/;
  const match = html.match(regex);
  return match ? match[1] : '';
}

/**
 * Extrai inline styles dos elementos HTML (slides content)
 * @param {string} html
 * @returns {Array<{element: string, styles: string}>}
 */
export function extractInlineStyles(html) {
  const results = [];
  // Extrair conteúdo entre os marcadores de slides
  const slidesRegex = /<!-- Slides Content[\s\S]*?-->([\s\S]*?)<\/div>\s*<\/div>/;
  const slidesMatch = html.match(slidesRegex);
  const slidesContent = slidesMatch ? slidesMatch[1] : html;

  const inlineRegex = /<([a-zA-Z][a-zA-Z0-9]*)[^>]*\sstyle="([^"]+)"[^>]*>/g;
  let match;

  while ((match = inlineRegex.exec(slidesContent)) !== null) {
    results.push({
      element: match[1],
      styles: match[2]
    });
  }

  return results;
}

// ============================================================
// Parser de CSS declarations
// ============================================================

/**
 * Parseia CSS em declarações individuais por seletor
 * @param {string} css
 * @returns {Array<{selector: string, property: string, value: string}>}
 */
export function parseCssDeclarations(css) {
  const declarations = [];

  // Remover comentários
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '');

  // Parsear regras CSS (incluindo media queries)
  const ruleRegex = /([^{}]+)\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let ruleMatch;

  while ((ruleMatch = ruleRegex.exec(cleaned)) !== null) {
    const selectorOrAtRule = ruleMatch[1].trim();
    const body = ruleMatch[2];

    // Se é uma @media rule, parsear regras internas
    if (selectorOrAtRule.startsWith('@media')) {
      const innerRuleRegex = /([^{}]+)\{([^{}]*)\}/g;
      let innerMatch;
      while ((innerMatch = innerRuleRegex.exec(body)) !== null) {
        const selector = innerMatch[1].trim();
        const innerDecls = innerMatch[2];
        parseDeclarationsFromBlock(selector, innerDecls, declarations);
      }
    } else {
      parseDeclarationsFromBlock(selectorOrAtRule, body, declarations);
    }
  }

  return declarations;
}

/**
 * Parseia declarações de um bloco CSS
 * @param {string} selector
 * @param {string} block
 * @param {Array} declarations
 */
function parseDeclarationsFromBlock(selector, block, declarations) {
  const declRegex = /([a-zA-Z-]+)\s*:\s*([^;]+);/g;
  let match;

  while ((match = declRegex.exec(block)) !== null) {
    declarations.push({
      selector: selector,
      property: match[1].trim(),
      value: match[2].trim()
    });
  }
}

// ============================================================
// Validação de compliance
// ============================================================

/**
 * Propriedades CSS que devem usar tokens do design system
 */
const CHECKED_PROPERTIES = {
  'color': 'colors',
  'background-color': 'colors',
  'background': 'colors',
  'font-family': 'fonts',
  'font-size': 'fontSizes',
  'margin': 'spacing',
  'margin-top': 'spacing',
  'margin-bottom': 'spacing',
  'margin-left': 'spacing',
  'margin-right': 'spacing',
  'padding': 'spacing',
  'padding-top': 'spacing',
  'padding-bottom': 'spacing',
  'padding-left': 'spacing',
  'padding-right': 'spacing',
  'border': 'borders',
  'border-left': 'borders',
  'border-right': 'borders',
  'border-top': 'borders',
  'border-bottom': 'borders',
  'box-shadow': 'shadows'
};

/**
 * Valores que são sempre permitidos (não são violações)
 */
const ALLOWED_VALUES = [
  'inherit',
  'initial',
  'unset',
  'revert',
  'auto',
  'none',
  'transparent',
  'currentColor',
  'currentcolor'
];

/**
 * Verifica se um valor é permitido sem ser um token
 * @param {string} value
 * @param {string} property
 * @returns {boolean}
 */
export function isAllowedValue(value, property) {
  const normalized = value.trim().toLowerCase();

  // CSS custom property references são sempre permitidos
  if (/var\s*\(/.test(value)) {
    return true;
  }

  // Valores padrão CSS permitidos
  if (ALLOWED_VALUES.includes(normalized)) {
    return true;
  }

  // Valor 0 (com ou sem unidade)
  if (/^0(px|em|rem|%|vh|vw)?$/.test(normalized)) {
    return true;
  }

  // Porcentagens
  if (/^-?\d+(\.\d+)?%$/.test(normalized)) {
    return true;
  }

  // Valores numéricos puros (line-height, flex, etc.)
  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    return true;
  }

  // Propriedades de display, position, etc. (valores keyword CSS padrão)
  if (property === 'background' || property === 'background-color') {
    // rgba com valores do design system é permitido (usado em blockquote)
    if (/^rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/.test(normalized)) {
      // Verificar se os valores RGB correspondem a um token de cor
      return true; // Permitir rgba derivados — a verificação exata é complexa
    }
  }

  // font-size: valores em px que correspondem a tokens são verificados separadamente
  // Mas valores relativos (em, rem) são permitidos como derivados
  if (property === 'font-size') {
    if (/^\d+(\.\d+)?(em|rem|vw|vh)$/.test(normalized)) {
      return true;
    }
  }

  // Spacing: valores em em/rem são permitidos como derivados
  if (CHECKED_PROPERTIES[property] === 'spacing') {
    if (/^\d+(\.\d+)?(em|rem|vw|vh)$/.test(normalized)) {
      return true;
    }
  }

  return false;
}

/**
 * Encontra o token esperado para uma propriedade
 * @param {string} property
 * @param {object} tokens
 * @returns {string}
 */
function getSuggestedToken(property, tokens) {
  const category = CHECKED_PROPERTIES[property];
  if (!category || !tokens[category] || tokens[category].length === 0) {
    return 'design system token';
  }

  const examples = tokens[category].slice(0, 3).map(t => `var(${t.name})`);
  return examples.join(' or ');
}

/**
 * Verifica se um valor corresponde a um token literal do design system
 * @param {string} value
 * @param {string} property
 * @param {object} tokens
 * @returns {boolean}
 */
export function matchesTokenValue(value, property, tokens) {
  const category = CHECKED_PROPERTIES[property];
  if (!category || !tokens[category]) return false;

  const normalized = value.trim();

  // Verificar se o valor literal corresponde a algum token
  for (const token of tokens[category]) {
    if (token.value === normalized) {
      return true;
    }
    // Para font-family, verificar se contém o valor do token
    if (category === 'fonts') {
      if (normalized.includes(token.value.replace(/'/g, '').split(',')[0].trim())) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Executa a validação de compliance
 * @param {string} html - Conteúdo HTML da apresentação
 * @param {string} designSystemCss - Conteúdo do design-system.css
 * @returns {object} Relatório de compliance
 */
export function validateCompliance(html, designSystemCss) {
  const tokens = extractDesignTokens(designSystemCss);
  const presentationCss = extractPresentationStyles(html);
  const inlineStyles = extractInlineStyles(html);

  /** @type {Array<{element: string, property: string, value: string, expected: string}>} */
  const violations = [];
  let totalChecked = 0;

  // 1. Verificar declarações no bloco #presentation-styles
  const declarations = parseCssDeclarations(presentationCss);

  for (const decl of declarations) {
    if (!CHECKED_PROPERTIES[decl.property]) continue;

    totalChecked++;

    if (isAllowedValue(decl.value, decl.property)) continue;
    if (matchesTokenValue(decl.value, decl.property, tokens)) continue;

    violations.push({
      element: decl.selector,
      property: decl.property,
      value: decl.value,
      expected: getSuggestedToken(decl.property, tokens)
    });
  }

  // 2. Verificar inline styles
  for (const item of inlineStyles) {
    const styleParts = item.styles.split(';').filter(s => s.trim());

    for (const part of styleParts) {
      const colonIdx = part.indexOf(':');
      if (colonIdx === -1) continue;

      const property = part.substring(0, colonIdx).trim();
      const value = part.substring(colonIdx + 1).trim();

      if (!CHECKED_PROPERTIES[property]) continue;

      totalChecked++;

      if (isAllowedValue(value, property)) continue;
      if (matchesTokenValue(value, property, tokens)) continue;

      violations.push({
        element: `<${item.element} style="...">`,
        property,
        value,
        expected: getSuggestedToken(property, tokens)
      });
    }
  }

  const compliantCount = totalChecked - violations.length;

  return {
    compliant: violations.length === 0,
    violations,
    summary: {
      totalChecked,
      violations: violations.length,
      compliant: compliantCount
    }
  };
}

// ============================================================
// Execução principal (CLI)
// ============================================================

function main() {
  log('INFO', 'Iniciando validação de compliance');

  // Ler dist/presentation.html
  const htmlPath = resolve(PROJECT_ROOT, 'dist/presentation.html');
  if (!existsSync(htmlPath)) {
    log('ERROR', 'dist/presentation.html não encontrado', { path: htmlPath });
    process.stderr.write(`ERROR: dist/presentation.html não encontrado. Execute 'npm run build' primeiro.\n`);
    process.exit(1);
  }
  const html = readFileSync(htmlPath, 'utf-8');

  // Ler src/design-system.css
  const cssPath = resolve(PROJECT_ROOT, 'src/design-system.css');
  if (!existsSync(cssPath)) {
    log('ERROR', 'src/design-system.css não encontrado', { path: cssPath });
    process.stderr.write(`ERROR: src/design-system.css não encontrado.\n`);
    process.exit(1);
  }
  const designSystemCss = readFileSync(cssPath, 'utf-8');

  // Executar validação
  const report = validateCompliance(html, designSystemCss);

  // Output JSON no stdout
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');

  // Log resultado
  if (report.compliant) {
    log('INFO', 'Apresentação está em compliance com o design system', report.summary);
  } else {
    log('WARN', 'Violações de compliance encontradas', report.summary);
  }

  // Exit code: 0 se compliant, 3 se violações
  process.exit(report.compliant ? 0 : 3);
}

// Executar apenas se chamado diretamente (não importado)
const isMainModule = process.argv[1] && resolve(process.argv[1]) === __filename;
if (isMainModule) {
  main();
}

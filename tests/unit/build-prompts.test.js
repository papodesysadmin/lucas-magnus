/**
 * Testes unitários para build-prompts.js
 * Valida: schema validation, formatação Markdown, geração completa
 */

import { describe, it, expect } from 'vitest';
import { validateConfig, formatPrompt, generateMarkdown } from '../../src/build-prompts.js';

// --- Fixtures ---

function makeValidItem(overrides = {}) {
  return {
    assetName: 'Test Asset',
    dimensions: { width: 1024, height: 1024 },
    category: 'monogram',
    styleKeywords: ['classic', 'serif', 'navy', 'gold', 'elegant', 'premium', 'refined'],
    description: 'A detailed description that meets the minimum character requirement for validation purposes. This text needs to be at least two hundred characters long to pass the schema validation check. Adding more words here to ensure we exceed the fifty word minimum as well for the word count validation that is required by the schema.',
    negativePrompt: ['bad quality', 'blurry', 'pixelated', 'cartoon'],
    ...overrides
  };
}

function makeValidConfig() {
  return [
    makeValidItem({ assetName: 'Monogram', category: 'monogram' }),
    makeValidItem({ assetName: 'Etymology', category: 'etymology' }),
    makeValidItem({ assetName: 'Branding', category: 'branding' }),
    makeValidItem({ assetName: 'Celebration', category: 'celebration' }),
    makeValidItem({ assetName: 'Texture 1', category: 'texture', dimensions: { width: 1920, height: 1080 } }),
    makeValidItem({ assetName: 'Texture 2', category: 'texture', dimensions: { width: 1920, height: 1080 } })
  ];
}

// --- validateConfig ---

describe('validateConfig', () => {
  it('aceita configuração válida com todas as categorias', () => {
    const result = validateConfig(makeValidConfig());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejeita input que não é array', () => {
    const result = validateConfig('not an array');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('array');
  });

  it('rejeita array vazio', () => {
    const result = validateConfig([]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('pelo menos 1');
  });

  it('rejeita item com campo obrigatório ausente', () => {
    const item = makeValidItem();
    delete item.assetName;
    const result = validateConfig([item]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('assetName'))).toBe(true);
  });

  it('rejeita assetName vazio', () => {
    const result = validateConfig([makeValidItem({ assetName: '' })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('assetName'))).toBe(true);
  });

  it('rejeita dimensions com width < 512', () => {
    const result = validateConfig([makeValidItem({ dimensions: { width: 256, height: 1024 } })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('width'))).toBe(true);
  });

  it('rejeita dimensions com height < 512', () => {
    const result = validateConfig([makeValidItem({ dimensions: { width: 1024, height: 100 } })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('height'))).toBe(true);
  });

  it('rejeita categoria inválida', () => {
    const result = validateConfig([makeValidItem({ category: 'invalid' })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('category'))).toBe(true);
  });

  it('rejeita menos de 5 style keywords', () => {
    const result = validateConfig([makeValidItem({ styleKeywords: ['a', 'b', 'c'] })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('styleKeywords'))).toBe(true);
  });

  it('rejeita description com menos de 200 caracteres', () => {
    const result = validateConfig([makeValidItem({ description: 'Too short' })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('description'))).toBe(true);
  });

  it('rejeita negativePrompt com menos de 3 items', () => {
    const result = validateConfig([makeValidItem({ negativePrompt: ['a', 'b'] })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('negativePrompt'))).toBe(true);
  });

  it('rejeita ausência de keywords Old Money Tech obrigatórias', () => {
    const result = validateConfig([makeValidItem({
      styleKeywords: ['random1', 'random2', 'random3', 'random4', 'random5']
    })]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Old Money Tech'))).toBe(true);
  });

  it('rejeita config sem cobertura de categoria texture (mínimo 2)', () => {
    const config = [
      makeValidItem({ category: 'monogram' }),
      makeValidItem({ category: 'etymology' }),
      makeValidItem({ category: 'branding' }),
      makeValidItem({ category: 'celebration' }),
      makeValidItem({ category: 'texture' }) // apenas 1 texture
    ];
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('texture'))).toBe(true);
  });
});

// --- formatPrompt ---

describe('formatPrompt', () => {
  const item = makeValidItem({
    assetName: 'LM Crest',
    dimensions: { width: 1024, height: 768 },
    category: 'monogram',
    styleKeywords: ['classic', 'serif', 'navy', 'gold', 'elegant'],
    negativePrompt: ['bad1', 'bad2', 'bad3']
  });

  it('inclui asset name como heading h2', () => {
    const output = formatPrompt(item);
    expect(output).toContain('## LM Crest');
  });

  it('inclui dimensions com sufixo "pixels"', () => {
    const output = formatPrompt(item);
    expect(output).toContain('**Dimensions:** 1024x768 pixels');
  });

  it('inclui categoria', () => {
    const output = formatPrompt(item);
    expect(output).toContain('**Category:** monogram');
  });

  it('inclui style keywords separadas por vírgula', () => {
    const output = formatPrompt(item);
    expect(output).toContain('**Style Keywords:** classic, serif, navy, gold, elegant');
  });

  it('inclui seção Prompt com descrição', () => {
    const output = formatPrompt(item);
    expect(output).toContain('### Prompt');
    expect(output).toContain(item.description);
  });

  it('inclui seção Negative Prompt com items em lista', () => {
    const output = formatPrompt(item);
    expect(output).toContain('### Negative Prompt');
    expect(output).toContain('- bad1');
    expect(output).toContain('- bad2');
    expect(output).toContain('- bad3');
  });
});

// --- generateMarkdown ---

describe('generateMarkdown', () => {
  const config = makeValidConfig();

  it('gera header com título do projeto', () => {
    const output = generateMarkdown(config);
    expect(output).toContain('# Image Prompts — Lucas Magnus Presentation');
  });

  it('gera header com referência Old Money Tech', () => {
    const output = generateMarkdown(config);
    expect(output).toContain('Old Money Tech');
  });

  it('gera uma seção para cada item da config', () => {
    const output = generateMarkdown(config);
    for (const item of config) {
      expect(output).toContain(`## ${item.assetName}`);
    }
  });

  it('separa seções com divisor horizontal', () => {
    const output = generateMarkdown(config);
    const separators = output.match(/---/g);
    // Header tem 1 separator + entre cada seção (n-1 separators)
    expect(separators.length).toBeGreaterThanOrEqual(config.length);
  });
});

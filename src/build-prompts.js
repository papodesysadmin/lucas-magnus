#!/usr/bin/env node

/**
 * build-prompts.js
 * Lê prompts-config.json, valida contra JSON Schema, e gera prompts estruturados
 * em dist/image-prompts.md formatado em Markdown.
 *
 * Exit codes:
 *   0 — Sucesso
 *   1 — Erro de build (config ausente, JSON inválido, validação falhou)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Logging estruturado ---

function log(level, message, context = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    module: 'build-prompts',
    message,
    ...(Object.keys(context).length > 0 ? { context } : {})
  };
  process.stderr.write(JSON.stringify(entry) + '\n');
}

// --- Constantes ---

const VALID_CATEGORIES = ['monogram', 'etymology', 'branding', 'celebration', 'texture'];
const REQUIRED_CATEGORIES = ['monogram', 'etymology', 'branding', 'celebration'];
const MIN_TEXTURE_PROMPTS = 2;
const OLD_MONEY_TECH_KEYWORDS = ['classic', 'serif', 'navy', 'gold', 'elegant'];
const MIN_STYLE_KEYWORDS = 5;
const MIN_DESCRIPTION_CHARS = 200;
const MIN_DESCRIPTION_WORDS = 50;
const MIN_NEGATIVE_ITEMS = 3;
const MIN_DIMENSION = 512;

// --- Schema Validation ---

/**
 * Valida um item de prompt contra o schema.
 * Retorna array de erros (vazio se válido).
 */
function validateItem(item, index) {
  const errors = [];
  const prefix = `items[${index}]`;

  const requiredFields = ['assetName', 'dimensions', 'category', 'styleKeywords', 'description', 'negativePrompt'];

  // Verificar campos obrigatórios
  for (const field of requiredFields) {
    if (item[field] === undefined || item[field] === null) {
      errors.push(`${prefix}: campo obrigatório '${field}' ausente`);
    }
  }

  if (errors.length > 0) return errors;

  // assetName
  if (typeof item.assetName !== 'string' || item.assetName.trim().length < 1) {
    errors.push(`${prefix}.assetName: deve ser string não-vazia`);
  }

  // dimensions
  if (typeof item.dimensions !== 'object' || item.dimensions === null) {
    errors.push(`${prefix}.dimensions: deve ser um objeto`);
  } else {
    if (item.dimensions.width === undefined || item.dimensions.height === undefined) {
      errors.push(`${prefix}.dimensions: 'width' e 'height' são obrigatórios`);
    } else {
      if (!Number.isInteger(item.dimensions.width) || item.dimensions.width < MIN_DIMENSION) {
        errors.push(`${prefix}.dimensions.width: deve ser inteiro >= ${MIN_DIMENSION}, recebido: ${item.dimensions.width}`);
      }
      if (!Number.isInteger(item.dimensions.height) || item.dimensions.height < MIN_DIMENSION) {
        errors.push(`${prefix}.dimensions.height: deve ser inteiro >= ${MIN_DIMENSION}, recebido: ${item.dimensions.height}`);
      }
    }
  }

  // category
  if (typeof item.category !== 'string' || !VALID_CATEGORIES.includes(item.category)) {
    errors.push(`${prefix}.category: deve ser um de [${VALID_CATEGORIES.join(', ')}], recebido: '${item.category}'`);
  }

  // styleKeywords
  if (!Array.isArray(item.styleKeywords)) {
    errors.push(`${prefix}.styleKeywords: deve ser um array`);
  } else {
    if (item.styleKeywords.length < MIN_STYLE_KEYWORDS) {
      errors.push(`${prefix}.styleKeywords: mínimo ${MIN_STYLE_KEYWORDS} items, recebido: ${item.styleKeywords.length}`);
    }
    for (let i = 0; i < item.styleKeywords.length; i++) {
      if (typeof item.styleKeywords[i] !== 'string') {
        errors.push(`${prefix}.styleKeywords[${i}]: deve ser string`);
      }
    }
    // Validar presença de keywords "Old Money Tech"
    const keywordsLower = item.styleKeywords.map(k => k.toLowerCase());
    for (const required of OLD_MONEY_TECH_KEYWORDS) {
      const found = keywordsLower.some(k => {
        if (required === 'serif') {
          return k === 'serif' || k.includes('serif');
        }
        return k === required || k.includes(required);
      });
      if (!found) {
        errors.push(`${prefix}.styleKeywords: keyword "Old Money Tech" obrigatória ausente: '${required}'`);
      }
    }
  }

  // description
  if (typeof item.description !== 'string') {
    errors.push(`${prefix}.description: deve ser string`);
  } else {
    if (item.description.length < MIN_DESCRIPTION_CHARS) {
      errors.push(`${prefix}.description: mínimo ${MIN_DESCRIPTION_CHARS} caracteres, recebido: ${item.description.length}`);
    }
    const wordCount = item.description.trim().split(/\s+/).length;
    if (wordCount < MIN_DESCRIPTION_WORDS) {
      errors.push(`${prefix}.description: mínimo ${MIN_DESCRIPTION_WORDS} palavras, recebido: ${wordCount}`);
    }
  }

  // negativePrompt
  if (!Array.isArray(item.negativePrompt)) {
    errors.push(`${prefix}.negativePrompt: deve ser um array`);
  } else {
    if (item.negativePrompt.length < MIN_NEGATIVE_ITEMS) {
      errors.push(`${prefix}.negativePrompt: mínimo ${MIN_NEGATIVE_ITEMS} items, recebido: ${item.negativePrompt.length}`);
    }
    for (let i = 0; i < item.negativePrompt.length; i++) {
      if (typeof item.negativePrompt[i] !== 'string') {
        errors.push(`${prefix}.negativePrompt[${i}]: deve ser string`);
      }
    }
  }

  return errors;
}

/**
 * Valida cobertura de categorias obrigatórias.
 * Retorna array de erros.
 */
function validateCategoryCoverage(config) {
  const errors = [];
  const categoryCounts = {};

  for (const item of config) {
    if (item.category) {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    }
  }

  // Verificar categorias obrigatórias (mínimo 1 cada)
  for (const category of REQUIRED_CATEGORIES) {
    if (!categoryCounts[category] || categoryCounts[category] < 1) {
      errors.push(`Cobertura de categorias: pelo menos 1 prompt da categoria '${category}' é obrigatório`);
    }
  }

  // Verificar mínimo de 2 textures
  if (!categoryCounts.texture || categoryCounts.texture < MIN_TEXTURE_PROMPTS) {
    errors.push(`Cobertura de categorias: mínimo ${MIN_TEXTURE_PROMPTS} prompts da categoria 'texture', encontrado: ${categoryCounts.texture || 0}`);
  }

  return errors;
}

/**
 * Valida o array completo de configurações contra o schema.
 * Retorna { valid: boolean, errors: string[] }
 */
export function validateConfig(config) {
  const errors = [];

  if (!Array.isArray(config)) {
    errors.push('Config deve ser um array');
    return { valid: false, errors };
  }

  if (config.length < 1) {
    errors.push('Config deve ter pelo menos 1 item');
    return { valid: false, errors };
  }

  // Validar cada item individualmente
  for (let i = 0; i < config.length; i++) {
    const itemErrors = validateItem(config[i], i);
    errors.push(...itemErrors);
  }

  // Validar cobertura de categorias (só se items individuais são válidos)
  if (errors.length === 0) {
    const coverageErrors = validateCategoryCoverage(config);
    errors.push(...coverageErrors);
  }

  return { valid: errors.length === 0, errors };
}

// --- Markdown Formatting ---

/**
 * Formata um item de prompt em Markdown estruturado.
 */
export function formatPrompt(item) {
  const dimensionsStr = `${item.dimensions.width}x${item.dimensions.height}`;
  const keywordsStr = item.styleKeywords.join(', ');
  const negativeItems = item.negativePrompt.map(np => `- ${np}`).join('\n');

  return `## ${item.assetName}

**Dimensions:** ${dimensionsStr} pixels
**Category:** ${item.category}
**Style Keywords:** ${keywordsStr}

### Prompt

${item.description}

### Negative Prompt

${negativeItems}`;
}

/**
 * Gera o documento Markdown completo com todos os prompts.
 */
export function generateMarkdown(config) {
  const header = `# Image Prompts — Lucas Magnus Presentation

> Prompts estruturados para geração de imagens por IA (text-to-image diffusion models).
> Estética: "Old Money Tech" — classic, serif, navy/gold, elegant.

---

`;

  const sections = config.map(item => formatPrompt(item));
  return header + sections.join('\n\n---\n\n') + '\n';
}

// --- Main ---

function main() {
  const projectRoot = resolve(__dirname, '..');
  const configPath = resolve(__dirname, 'prompts-config.json');
  const distDir = resolve(projectRoot, 'dist');
  const outputPath = resolve(distDir, 'image-prompts.md');

  log('INFO', 'Iniciando geração de prompts', { configPath });

  // 1. Verificar se config existe
  if (!existsSync(configPath)) {
    log('ERROR', 'Arquivo de configuração não encontrado', { file: configPath });
    process.exit(1);
  }

  // 2. Ler e parsear JSON
  let rawContent;
  let config;

  try {
    rawContent = readFileSync(configPath, 'utf-8');
  } catch (err) {
    log('ERROR', 'Falha ao ler arquivo de configuração', { file: configPath, error: err.message });
    process.exit(1);
  }

  try {
    config = JSON.parse(rawContent);
  } catch (err) {
    log('ERROR', 'JSON inválido no arquivo de configuração', { file: configPath, error: err.message });
    process.exit(1);
  }

  // 3. Validar contra schema
  const validation = validateConfig(config);
  if (!validation.valid) {
    log('ERROR', 'Validação de schema falhou', {
      file: configPath,
      errorCount: validation.errors.length,
      errors: validation.errors
    });
    process.exit(1);
  }

  log('INFO', `Configuração válida: ${config.length} prompts encontrados`);

  // 4. Gerar Markdown
  const markdown = generateMarkdown(config);

  // 5. Garantir que dist/ existe e escrever output
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  try {
    writeFileSync(outputPath, markdown, 'utf-8');
  } catch (err) {
    log('ERROR', 'Falha ao escrever arquivo de output', { file: outputPath, error: err.message });
    process.exit(1);
  }

  log('INFO', 'Prompts gerados com sucesso', { output: outputPath, count: config.length });

  // 6. Output path absoluto no stdout
  process.stdout.write(outputPath + '\n');
}

// Executar apenas quando chamado diretamente (não quando importado como módulo)
const isMainModule = process.argv[1] && resolve(process.argv[1]) === __filename;
if (isMainModule) {
  main();
}

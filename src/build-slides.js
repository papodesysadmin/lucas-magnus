#!/usr/bin/env node

/**
 * build-slides.js — Gera apresentação HTML self-contained com Reveal.js
 *
 * Lê content.md, aplica design system, inline todos os assets (CSS, JS, fonts),
 * e gera dist/presentation.html funcional offline.
 *
 * Uso: node src/build-slides.js
 * Saída: dist/presentation.html (path absoluto no stdout)
 * Erros: JSON estruturado no stderr, exit code 1
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
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
    module: 'build-slides',
    message,
    context
  };
  process.stderr.write(JSON.stringify(entry) + '\n');
}

// ============================================================
// Leitura de arquivos com tratamento de erro
// ============================================================

/**
 * Lê arquivo obrigatório ou encerra com exit code 1
 * @param {string} filePath
 * @param {string} description
 * @returns {string}
 */
function readRequired(filePath, description) {
  const absolutePath = resolve(PROJECT_ROOT, filePath);
  if (!existsSync(absolutePath)) {
    log('ERROR', `${description} não encontrado: ${absolutePath}`, { file: filePath });
    process.stderr.write(`ERROR: ${description} não encontrado: ${absolutePath}\n`);
    process.exit(1);
  }
  return readFileSync(absolutePath, 'utf-8');
}

// ============================================================
// Parser de Markdown → Seções de slides
// ============================================================

/**
 * @typedef {object} SlideSection
 * @property {string} title - Título da seção (## heading)
 * @property {SubSlide[]} slides - Slides verticais dentro da seção
 */

/**
 * @typedef {object} SubSlide
 * @property {string} title - Título do sub-slide (### heading) ou vazio
 * @property {string} body - Conteúdo markdown do slide
 */

/**
 * Parseia content.md em seções horizontais e verticais
 * @param {string} markdown
 * @returns {SlideSection[]}
 */
function parseMarkdown(markdown) {
  const lines = markdown.split('\n');
  /** @type {SlideSection[]} */
  const sections = [];
  /** @type {SlideSection|null} */
  let currentSection = null;
  /** @type {SubSlide|null} */
  let currentSubSlide = null;
  /** @type {string[]} */
  let bodyLines = [];

  function flushSubSlide() {
    if (currentSubSlide) {
      currentSubSlide.body = bodyLines.join('\n').trim();
      if (currentSection) {
        currentSection.slides.push(currentSubSlide);
      }
    }
    bodyLines = [];
    currentSubSlide = null;
  }

  function flushSection() {
    flushSubSlide();
    if (currentSection) {
      sections.push(currentSection);
    }
    currentSection = null;
  }

  for (const line of lines) {
    // Ignorar título H1 (título do documento)
    if (/^# [^#]/.test(line)) {
      continue;
    }

    // Seção horizontal (## Heading)
    if (/^## /.test(line)) {
      flushSection();
      const title = line.replace(/^## /, '').trim();
      currentSection = { title, slides: [] };
      currentSubSlide = { title: '', body: '' };
      bodyLines = [];
      continue;
    }

    // Sub-slide vertical (### Heading)
    if (/^### /.test(line)) {
      flushSubSlide();
      const title = line.replace(/^### /, '').trim();
      currentSubSlide = { title, body: '' };
      bodyLines = [];
      continue;
    }

    // Ignorar separadores horizontais (---)
    if (/^---\s*$/.test(line)) {
      continue;
    }

    bodyLines.push(line);
  }

  // Flush final
  flushSection();

  return sections;
}

// ============================================================
// Conversor Markdown → HTML (simplificado)
// ============================================================

/**
 * Converte markdown básico em HTML
 * @param {string} md
 * @returns {string}
 */
function markdownToHtml(md) {
  if (!md) return '';

  let html = md;

  // Headings H4 (####)
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>\n$1</ul>\n');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  // Tables (basic support)
  html = convertTables(html);

  // Paragraphs: wrap remaining non-tag lines
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return line;
    if (trimmed.startsWith('|')) return line;
    return `<p>${trimmed}</p>`;
  }).join('\n');

  // Clean up empty lines
  html = html.replace(/\n{3,}/g, '\n\n');

  return html.trim();
}

/**
 * Converte tabelas markdown em HTML
 * @param {string} md
 * @returns {string}
 */
function convertTables(md) {
  const lines = md.split('\n');
  const result = [];
  let inTable = false;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      // Ignorar linha separadora (|---|---|)
      if (/^\|[\s\-:|]+\|$/.test(line)) {
        continue;
      }
      const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
      tableRows.push(cells);
    } else {
      if (inTable) {
        result.push(renderTable(tableRows));
        inTable = false;
        tableRows = [];
      }
      result.push(lines[i]);
    }
  }

  if (inTable) {
    result.push(renderTable(tableRows));
  }

  return result.join('\n');
}

/**
 * Renderiza array de rows em tabela HTML
 * @param {string[][]} rows
 * @returns {string}
 */
function renderTable(rows) {
  if (rows.length === 0) return '';

  let html = '<table>\n<thead>\n<tr>';
  const header = rows[0];
  for (const cell of header) {
    html += `<th>${cell}</th>`;
  }
  html += '</tr>\n</thead>\n<tbody>\n';

  for (let i = 1; i < rows.length; i++) {
    html += '<tr>';
    for (const cell of rows[i]) {
      html += `<td>${cell}</td>`;
    }
    html += '</tr>\n';
  }

  html += '</tbody>\n</table>';
  return html;
}

// ============================================================
// Mapeamento de seções para Visual Assets
// ============================================================

/**
 * Mapa de seções para nomes de visual assets esperados
 */
const VISUAL_ASSET_MAP = {
  'Abertura': 'visual-asset-abertura.png',
  'Etimologia e Significado': 'visual-asset-etimologia.png',
  'Internacionalização': 'visual-asset-internacionalizacao.png',
  'Branding Pessoal e Posicionamento': 'visual-asset-branding.png',
  'Simbolismo Sonoro (Bouba-Kiki)': 'visual-asset-simbolismo-sonoro.png',
  'Presença Digital e SEO': 'visual-asset-presenca-digital.png',
  'Visão de Futuro': 'visual-asset-visao-futuro.png',
  'Análise de Riscos': 'visual-asset-riscos.png',
  'Celebração do Nascimento': 'visual-asset-celebracao.png'
};

/**
 * Gera placeholder HTML para visual asset
 * @param {string} sectionTitle
 * @returns {string}
 */
function generateVisualAssetPlaceholder(sectionTitle) {
  const assetFile = VISUAL_ASSET_MAP[sectionTitle] || `visual-asset-${sectionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  const assetPath = `assets/visual-assets/${assetFile}`;

  return `
      <div class="visual-asset">
        <div class="visual-asset-placeholder">
          <p>🎨 Visual Asset</p>
          <p><em>${sectionTitle}</em></p>
          <p><code>${assetPath}</code></p>
        </div>
      </div>`;
}

// ============================================================
// Gerador de slides HTML
// ============================================================

/**
 * Divide conteúdo longo em múltiplos slides verticais
 * @param {string} body - Conteúdo markdown
 * @param {number} maxChars - Máximo de caracteres por slide
 * @returns {string[]} - Array de conteúdos divididos
 */
function splitLongContent(body, maxChars = 1500) {
  if (body.length <= maxChars) return [body];

  const paragraphs = body.split('\n\n');
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Gera HTML dos slides a partir das seções parseadas
 * @param {SlideSection[]} sections
 * @returns {{ html: string, slideCount: number }}
 */
function generateSlidesHtml(sections) {
  let html = '';
  let slideCount = 0;

  for (const section of sections) {
    // Abrir grupo horizontal (seção)
    html += '\n      <!-- Section: ' + section.title + ' -->\n';
    html += '      <section>\n';

    // Slide divisor de seção
    html += '        <section class="section-divider dark-bg">\n';
    html += `          <h2>${section.title}</h2>\n`;
    html += generateVisualAssetPlaceholder(section.title) + '\n';
    html += '        </section>\n';
    slideCount++;

    // Slides verticais (sub-slides)
    for (const slide of section.slides) {
      const bodyHtml = markdownToHtml(slide.body);

      if (!bodyHtml && !slide.title) continue;

      // Dividir conteúdo longo em múltiplos slides
      const chunks = splitLongContent(slide.body);

      for (let i = 0; i < chunks.length; i++) {
        const chunkHtml = markdownToHtml(chunks[i]);
        html += '        <section>\n';
        html += '          <div class="slide-content">\n';

        if (slide.title && i === 0) {
          html += `            <h3>${slide.title}</h3>\n`;
        } else if (slide.title && i > 0) {
          html += `            <h3>${slide.title} <small>(cont.)</small></h3>\n`;
        }

        if (chunkHtml) {
          html += `            ${chunkHtml.replace(/\n/g, '\n            ')}\n`;
        }

        html += '          </div>\n';
        html += '        </section>\n';
        slideCount++;
      }
    }

    // Fechar grupo horizontal
    html += '      </section>\n';
  }

  return { html, slideCount };
}

// ============================================================
// Build principal
// ============================================================

function build() {
  log('INFO', 'Iniciando build de slides', { projectRoot: PROJECT_ROOT });

  // 1. Ler content.md
  const contentMd = readRequired('src/content.md', 'Arquivo de conteúdo (content.md)');
  log('INFO', 'content.md carregado', { size: contentMd.length });

  // 2. Ler template
  const template = readRequired('src/slides-template.html', 'Template de slides (slides-template.html)');
  log('INFO', 'slides-template.html carregado', { size: template.length });

  // 3. Ler design system CSS
  const designSystemCss = readRequired('src/design-system.css', 'Design System CSS (design-system.css)');
  log('INFO', 'design-system.css carregado', { size: designSystemCss.length });

  // 4. Ler LM Crest SVG
  let lmCrestSvg = '';
  const crestPath = resolve(PROJECT_ROOT, 'src/assets/lm-crest.svg');
  if (existsSync(crestPath)) {
    lmCrestSvg = readFileSync(crestPath, 'utf-8');
    log('INFO', 'lm-crest.svg carregado', { size: lmCrestSvg.length });
  } else {
    // Placeholder SVG se o crest não existir
    lmCrestSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><rect width="120" height="120" fill="#1B2A4A" rx="8"/><text x="60" y="70" text-anchor="middle" fill="#C9A96E" font-size="36" font-family="serif">LM</text></svg>';
    log('WARN', 'lm-crest.svg não encontrado, usando placeholder', { path: crestPath });
  }

  // 5. Ler Reveal.js CSS
  const revealCssPath = resolve(PROJECT_ROOT, 'node_modules/reveal.js/dist/reveal.css');
  if (!existsSync(revealCssPath)) {
    log('ERROR', 'Reveal.js CSS não encontrado em node_modules', { path: revealCssPath });
    process.stderr.write(`ERROR: Reveal.js CSS não encontrado: ${revealCssPath}\n`);
    process.exit(1);
  }
  const revealCss = readFileSync(revealCssPath, 'utf-8');
  log('INFO', 'reveal.css carregado', { size: revealCss.length });

  // 6. Ler Reveal.js JS
  const revealJsPath = resolve(PROJECT_ROOT, 'node_modules/reveal.js/dist/reveal.js');
  if (!existsSync(revealJsPath)) {
    log('ERROR', 'Reveal.js JS não encontrado em node_modules', { path: revealJsPath });
    process.stderr.write(`ERROR: Reveal.js JS não encontrado: ${revealJsPath}\n`);
    process.exit(1);
  }
  const revealJs = readFileSync(revealJsPath, 'utf-8');
  log('INFO', 'reveal.js carregado', { size: revealJs.length });

  // 7. Parsear markdown em seções
  const sections = parseMarkdown(contentMd);
  log('INFO', 'Markdown parseado', { sectionCount: sections.length });

  // 8. Gerar HTML dos slides
  const { html: slidesHtml, slideCount } = generateSlidesHtml(sections);
  log('INFO', 'Slides gerados', { slideCount });

  // 9. Montar HTML final a partir do template
  let finalHtml = template;

  // Injetar Design System CSS
  finalHtml = finalHtml.replace('{{DESIGN_SYSTEM_CSS}}', designSystemCss);

  // Injetar Reveal.js CSS
  finalHtml = finalHtml.replace(
    '    /* Placeholder: Reveal.js CSS will be inlined here during build */',
    revealCss
  );

  // Injetar LM Crest SVG
  finalHtml = finalHtml.replace('{{LM_CREST_SVG}}', lmCrestSvg);

  // Injetar slides content
  finalHtml = finalHtml.replace('{{SLIDES_CONTENT}}', slidesHtml);

  // Injetar Reveal.js JS
  finalHtml = finalHtml.replace(
    '    // Placeholder: Reveal.js core will be inlined here during build',
    revealJs
  );

  // 10. Escrever output em dist/presentation.html
  const distDir = resolve(PROJECT_ROOT, 'dist');
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  const outputPath = resolve(distDir, 'presentation.html');
  writeFileSync(outputPath, finalHtml, 'utf-8');

  log('INFO', 'Build concluído com sucesso', {
    output: outputPath,
    slideCount,
    fileSize: finalHtml.length
  });

  // Output path absoluto no stdout
  process.stdout.write(outputPath + '\n');
}

// Executar build
build();

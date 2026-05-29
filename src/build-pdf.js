/**
 * build-pdf.js — PDF Generator
 * Converte content.md em PDF estilizado usando md-to-pdf (Puppeteer).
 * Aplica design system, cover page, TOC, e graceful handling de imagens.
 *
 * Saída: dist/lucas-magnus-analise.pdf
 * Exit codes: 0 = sucesso, 1 = erro de build
 */

import { mdToPdf } from 'md-to-pdf';
import { readFileSync, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// === Configuração ===
const PROJECT_ROOT = resolve(__dirname, '..');
const CONTENT_PATH = resolve(__dirname, 'content.md');
const CSS_PATH = resolve(__dirname, 'design-system.css');
const CREST_PATH = resolve(__dirname, 'assets', 'lm-crest.svg');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'dist');
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'lucas-magnus-analise.pdf');

// === Logging estruturado ===
function log(level, message, context = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    module: 'build-pdf',
    message,
    ...(Object.keys(context).length > 0 && { context })
  };
  process.stderr.write(JSON.stringify(entry) + '\n');
}

// === Cover Page ===
function buildCoverPage() {
  let crestContent = '';
  if (existsSync(CREST_PATH)) {
    crestContent = readFileSync(CREST_PATH, 'utf-8');
  } else {
    crestContent = '[Imagem não disponível: lm-crest.svg]';
    log('WARN', 'Crest SVG not found, using placeholder', { file: CREST_PATH });
  }

  return `<div class="cover-page">
  <div class="lm-crest">${crestContent}</div>
  <h1 class="cover-title">Lucas Magnus Schossland Bachion</h1>
  <p class="cover-subtitle">Análise Estratégica de Nome e Celebração</p>
  <p class="cover-date">Dezembro 2025</p>
</div>
<div class="page-break"></div>

`;
}

// === TOC Generator ===
function generateToc(markdown) {
  const lines = markdown.split('\n');
  const entries = [];

  for (const line of lines) {
    const h1Match = line.match(/^# (.+)$/);
    const h2Match = line.match(/^## (.+)$/);

    if (h1Match) {
      const title = h1Match[1].trim();
      const id = slugify(title);
      entries.push({ level: 1, title, id });
    } else if (h2Match) {
      const title = h2Match[1].trim();
      const id = slugify(title);
      entries.push({ level: 2, title, id });
    }
  }

  if (entries.length === 0) return '';

  let toc = '<div class="toc">\n<h2 class="toc-title">Sumário</h2>\n<ul class="toc-list">\n';
  for (const entry of entries) {
    const indent = entry.level === 2 ? '  ' : '';
    const cssClass = entry.level === 1 ? 'toc-h1' : 'toc-h2';
    toc += `${indent}<li class="${cssClass}"><a href="#${entry.id}">${entry.title}</a></li>\n`;
  }
  toc += '</ul>\n</div>\n<div class="page-break"></div>\n\n';

  return toc;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// === Adicionar IDs aos headings para links do TOC ===
function addHeadingIds(markdown) {
  return markdown.replace(/^(#{1,2}) (.+)$/gm, (match, hashes, title) => {
    const id = slugify(title.trim());
    const level = hashes.length;
    return `<h${level} id="${id}">${title.trim()}</h${level}>`;
  });
}

// === Graceful Image Handling ===
function handleMissingImages(markdown) {
  // Substitui referências a imagens com paths inválidos por placeholder text
  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    // Resolve path relativo ao content.md
    const imagePath = resolve(dirname(CONTENT_PATH), src);
    if (existsSync(imagePath)) {
      return match; // Imagem existe, manter referência
    }
    const filename = basename(src);
    log('WARN', 'Image not found, using placeholder', { file: filename, path: src });
    return `*[Imagem não disponível: ${filename}]*`;
  });
}

// === PDF-specific CSS (complementa design-system.css) ===
function getPdfCss() {
  return `
/* Google Fonts import */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;600&display=swap');

/* PDF-specific styles using design system tokens */
body {
  font-family: var(--font-body);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-body);
  color: var(--color-text);
  line-height: 1.6;
  background: var(--color-neutral);
}

h1, h2, h3, h4 {
  font-family: var(--font-heading);
  font-weight: var(--font-weight-heading);
  color: var(--color-primary);
  margin-top: var(--space-lg);
  margin-bottom: var(--space-md);
}

h1 { font-size: var(--font-size-h1); }
h2 { font-size: var(--font-size-h2); }
h3 { font-size: var(--font-size-h3); }
h4 { font-size: var(--font-size-h4); }

/* Cover page */
.cover-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
  padding: var(--space-xl);
}

.cover-page .lm-crest {
  width: 120px;
  height: 120px;
  margin-bottom: var(--space-xl);
}

.cover-page .lm-crest svg {
  width: 100%;
  height: 100%;
}

.cover-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-h1);
  font-weight: var(--font-weight-heading);
  color: var(--color-primary);
  margin-bottom: var(--space-md);
}

.cover-subtitle {
  font-family: var(--font-body);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  color: var(--color-accent);
  margin-bottom: var(--space-lg);
}

.cover-date {
  font-family: var(--font-body);
  font-size: var(--font-size-body);
  color: var(--color-secondary);
}

/* Page break */
.page-break {
  page-break-after: always;
}

/* TOC */
.toc {
  padding: var(--space-lg);
}

.toc-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-h2);
  color: var(--color-primary);
  margin-bottom: var(--space-lg);
  text-align: center;
}

.toc-list {
  list-style: none;
  padding: 0;
}

.toc-list li {
  margin-bottom: var(--space-sm);
  border-bottom: var(--border-thin);
  padding-bottom: var(--space-xs);
}

.toc-h1 {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-large);
}

.toc-h2 {
  padding-left: var(--space-lg);
  font-size: var(--font-size-body);
}

.toc-list a {
  color: var(--color-primary);
  text-decoration: none;
}

.toc-list a:hover {
  color: var(--color-accent);
}

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--space-md) 0;
  font-size: var(--font-size-small);
}

th {
  background: var(--color-primary);
  color: var(--color-text-light);
  font-weight: var(--font-weight-bold);
  padding: var(--space-sm) var(--space-md);
  text-align: left;
}

td {
  padding: var(--space-sm) var(--space-md);
  border-bottom: var(--border-thin);
}

tr:nth-child(even) {
  background: rgba(201, 169, 110, 0.05);
}

/* Blockquotes */
blockquote {
  border-left: var(--border-accent);
  padding-left: var(--space-md);
  margin: var(--space-md) 0;
  color: var(--color-accent);
  font-style: italic;
}

/* Strong / emphasis */
strong {
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

/* Lists */
ul, ol {
  padding-left: var(--space-lg);
  margin: var(--space-sm) 0;
}

li {
  margin-bottom: var(--space-xs);
}

/* Horizontal rules */
hr {
  border: none;
  border-top: var(--border-thin);
  margin: var(--space-xl) 0;
}

/* Links */
a {
  color: var(--color-accent);
  text-decoration: none;
}

/* Code */
code {
  font-size: var(--font-size-small);
  background: rgba(27, 42, 74, 0.05);
  padding: 2px 6px;
  border-radius: 3px;
}
`;
}

// === Main ===
async function main() {
  try {
    // 1. Verificar content.md existe
    if (!existsSync(CONTENT_PATH)) {
      log('ERROR', 'Content file not found', { file: CONTENT_PATH });
      process.exit(1);
    }

    // 2. Ler conteúdo
    let markdown = readFileSync(CONTENT_PATH, 'utf-8');
    log('INFO', 'Content loaded', { file: 'content.md', length: markdown.length });

    // 3. Handle missing images
    markdown = handleMissingImages(markdown);

    // 4. Gerar TOC
    const toc = generateToc(markdown);

    // 5. Adicionar IDs aos headings
    markdown = addHeadingIds(markdown);

    // 6. Montar documento final: cover + TOC + conteúdo
    const coverPage = buildCoverPage();
    const fullContent = coverPage + toc + markdown;

    // 7. Garantir diretório de saída
    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // 8. Ler CSS do design system
    let designSystemCss = '';
    if (existsSync(CSS_PATH)) {
      designSystemCss = readFileSync(CSS_PATH, 'utf-8');
    } else {
      log('WARN', 'Design system CSS not found', { file: CSS_PATH });
    }

    // 9. Combinar CSS: design system + PDF-specific
    const combinedCss = designSystemCss + '\n' + getPdfCss();
    const tempCssPath = resolve(OUTPUT_DIR, '_temp-pdf-styles.css');
    writeFileSync(tempCssPath, combinedCss, 'utf-8');

    // 10. Converter para PDF com md-to-pdf
    log('INFO', 'Starting PDF conversion');

    const pdf = await mdToPdf(
      { content: fullContent },
      {
        stylesheet: [tempCssPath],
        pdf_options: {
          format: 'A4',
          margin: {
            top: '25mm',
            bottom: '25mm',
            left: '20mm',
            right: '20mm'
          },
          printBackground: true
        },
        launch_options: {
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      }
    );

    // 11. Limpar CSS temporário
    if (existsSync(tempCssPath)) {
      unlinkSync(tempCssPath);
    }

    // 12. Verificar resultado
    if (!pdf || !pdf.content) {
      log('ERROR', 'PDF conversion returned empty result');
      // Garantir nenhum arquivo parcial
      if (existsSync(OUTPUT_PATH)) {
        unlinkSync(OUTPUT_PATH);
      }
      process.exit(1);
    }

    // 13. Escrever PDF
    writeFileSync(OUTPUT_PATH, pdf.content);
    log('INFO', 'PDF generated successfully', { output: OUTPUT_PATH });

    // 14. Output path no stdout
    process.stdout.write(resolve(OUTPUT_PATH) + '\n');
    process.exit(0);

  } catch (error) {
    log('ERROR', 'Conversion failed', {
      error: error.message,
      stack: error.stack
    });

    // Garantir nenhum arquivo parcial
    if (existsSync(OUTPUT_PATH)) {
      unlinkSync(OUTPUT_PATH);
    }

    // Limpar CSS temporário se existir
    const tempCssPath = resolve(OUTPUT_DIR, '_temp-pdf-styles.css');
    if (existsSync(tempCssPath)) {
      unlinkSync(tempCssPath);
    }

    process.exit(1);
  }
}

main();

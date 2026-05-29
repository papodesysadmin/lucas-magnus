# Implementation Plan: Lucas Magnus Presentation

## Overview

Pipeline de build automatizado que produz uma apresentação interativa (Reveal.js), documento PDF companion, prompts para geração de imagens por IA, e faz upload/deploy para Google Drive e GitHub Pages. Implementação em Node.js 18+ com ESM modules, Vitest para testes unitários e fast-check para testes baseados em propriedades.

## Tasks

- [x] 1. Estrutura do projeto e design system
  - [x] 1.1 Inicializar projeto Node.js com package.json e dependências
    - Criar `package.json` com `"type": "module"`, `engines.node >= 18`
    - Instalar dependências: `reveal.js@^4`, `md-to-pdf`, `googleapis`, `gh-pages`, `fast-check`, `vitest`
    - Definir scripts: `build`, `upload`, `deploy`, `all`, `validate`, `test`
    - Criar estrutura de diretórios: `src/`, `dist/`, `tests/unit/`, `tests/property/`, `tests/integration/`
    - _Requirements: 15.1, 15.3, 15.4, 15.6, 15.7_

  - [x] 1.2 Criar design system CSS com tokens
    - Criar `src/design-system.css` com todas as CSS Custom Properties
    - Paleta: primary (deep navy #1B2A4A), secondary (gold #C9A96E), accent (burgundy #722F37), neutral (cream #FAF8F5)
    - Tipografia: Playfair Display (headings 24-48px), Inter (body 14-18px), font weights
    - Espaçamento: xs(4px), sm(8px), md(16px), lg(32px), xl(64px), 2xl(128px)
    - Bordas: thin, accent; Sombras: subtle, elevated; Transições: default 400ms
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [x] 1.3 Criar monograma/brasão LM como SVG
    - Criar `src/assets/lm-crest.svg` com design heráldico combinando "L" e "M"
    - Garantir mínimo 24x24px de renderização
    - Estilo clássico com elementos tech sutis (circuit traces, geometric patterns)
    - _Requirements: 1.6, 7.5_

  - [ ]* 1.4 Escrever testes unitários para design system
    - Verificar que todos os tokens obrigatórios existem no CSS
    - Validar valores hex, font sizes no range, spacing scale
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Conteúdo Markdown e validação
  - [x] 2.1 Criar documento de conteúdo principal em Markdown
    - Criar `src/content.md` com todas as seções na ordem: Abertura, Etimologia, Internacionalização, Branding Pessoal, Simbolismo Sonoro, Presença Digital/SEO, Visão de Futuro, Celebração do Nascimento
    - Incluir etimologia grega/latina de Lucas e Magnus, significado combinado "O Grande Iluminado"
    - Incluir análise Bouba-Kiki, SEO oceano azul, roadmap do palestrante
    - Sempre usar "Lucas Magnus" composto, nunca "Lucas" isolado
    - Seção de celebração com tom emocional, menção a Florianópolis Dezembro 2025
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3, 14.4_

  - [ ]* 2.2 Escrever teste de propriedade para nome composto
    - **Property 4: Compound Name Invariant**
    - Gerar segmentos de texto arbitrários contendo "Lucas" e verificar que "Magnus" sempre segue
    - **Validates: Requirements 2.6**

- [x] 3. Checkpoint — Validar estrutura base
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Presentation Engine (Reveal.js)
  - [x] 4.1 Criar template HTML para Reveal.js
    - Criar `src/slides-template.html` com estrutura Reveal.js 4.x
    - Incluir placeholders para injeção de conteúdo e design system
    - Configurar transições fade/slide (300-800ms), navegação por teclado e touch
    - Suporte a vertical slides para sub-seções
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 4.2 Implementar build-slides.js
    - Criar `src/build-slides.js` que lê `content.md`, aplica design system, gera HTML self-contained
    - Parsear Markdown em seções, mapear para slides horizontais/verticais
    - Inline todos os assets (CSS, JS, fonts) para funcionar offline
    - Title slide com "Lucas Magnus" em serif 48px+ e brasão LM
    - Gerar 20-40 slides cobrindo todas as seções
    - Incluir referências a Visual_Assets com placeholders para imagens ausentes
    - Usar paths relativos para compatibilidade com GitHub Pages subdirectory
    - Responsivo: min 16px body font em viewports ≤768px, sem scroll horizontal
    - Escrever output em `dist/presentation.html`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 6.3_

  - [x] 4.3 Implementar validate-compliance.js
    - Criar `src/validate-compliance.js` que verifica HTML contra design system tokens
    - Detectar valores ad-hoc (cores, fonts, spacing) não definidos nos tokens
    - Reportar: elemento, propriedade, valor encontrado, token esperado
    - Exit code 3 se violações encontradas
    - _Requirements: 1.4, 1.7_

  - [ ]* 4.4 Escrever testes de propriedade para compliance e crest
    - **Property 1: Design System Compliance** — Para conteúdo arbitrário de slides, verificar que output HTML usa exclusivamente tokens do design system
    - **Property 2: LM Crest Presence Invariant** — Para qualquer configuração de slides, verificar presença do crest com dimensões ≥24x24px
    - **Property 3: Compliance Validator Detection** — Para HTML com mix de valores válidos/inválidos, verificar que validator detecta todos os não-compliant
    - **Validates: Requirements 1.4, 1.6, 1.7, 3.3**

  - [ ]* 4.5 Escrever teste de propriedade para paths de assets
    - **Property 9: Asset Path Resolution for Subdirectory Hosting**
    - Para nomes de arquivo e estruturas de diretório arbitrários, verificar que paths são relativos e resolvem corretamente em subdirectory
    - **Validates: Requirements 6.3**

- [x] 5. PDF Generator
  - [x] 5.1 Implementar build-pdf.js
    - Criar `src/build-pdf.js` usando md-to-pdf (Puppeteer)
    - Aplicar design system (tipografia, paleta) via CSS injection
    - Cover page: título "Lucas Magnus Schossland Bachion", subtítulo "Análise Estratégica de Nome e Celebração", data "Dezembro 2026"
    - Gerar TOC com links clicáveis para headings h1 e h2
    - Formato A4 (210×297mm), margens 25mm top/bottom, 20mm left/right
    - Imagens embeddadas a 150 DPI mínimo
    - Graceful handling: imagem ausente → placeholder text com nome do recurso
    - Fail-fast: erro de conversão → nenhum arquivo parcial, exit code 1
    - Output em `dist/lucas-magnus-analise.pdf`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 5.2 Escrever testes de propriedade para PDF generator
    - **Property 5: Missing Image Graceful Handling** — Para Markdown com paths de imagem inválidos arbitrários, verificar que PDF é gerado com placeholder text
    - **Property 6: Failed Conversion Produces No Partial Output** — Para Markdown malformado, verificar que nenhum arquivo é criado e erro é reportado
    - **Validates: Requirements 4.7, 4.8**

- [x] 6. Image Prompt Generator
  - [x] 6.1 Criar configuração de prompts
    - Criar `src/prompts-config.json` com configurações para cada asset: monogram, etymology, branding, celebration, texture (×2)
    - Definir dimensions por categoria: 1024×1024 (monogram/crest), 1920×1080 (textures), square/portrait (demais)
    - Incluir style keywords "Old Money Tech": classic, serif, navy, gold, elegant
    - _Requirements: 7.1, 7.2, 7.5, 7.6_

  - [x] 6.2 Implementar build-prompts.js
    - Criar `src/build-prompts.js` que lê `prompts-config.json` e gera prompts estruturados
    - Cada prompt: asset name, dimensions (WxH), ≥5 style keywords, descrição ≥50 palavras, negative prompt ≥3 items
    - Crest prompt: design heráldico com "L" e "M", elementos tech sutis
    - Validar config contra JSON Schema antes de processar
    - Output em `dist/image-prompts.md` formatado em Markdown
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 6.3 Escrever testes de propriedade para prompts
    - **Property 10: Prompt Structure Completeness** — Para configurações arbitrárias, verificar que output tem todos os campos obrigatórios
    - **Property 11: Prompt Style Consistency** — Para configurações arbitrárias, verificar presença de keywords "Old Money Tech"
    - **Property 12: Prompt Category Coverage with Correct Dimensions** — Para configs válidos, verificar cobertura de categorias e dimensions corretas
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.6**

- [x] 7. Checkpoint — Validar build pipeline
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Drive Uploader
  - [x] 8.1 Implementar drive-uploader.js
    - Criar `src/drive-uploader.js` usando googleapis com Service Account
    - Autenticação via `GOOGLE_APPLICATION_CREDENTIALS` (env var), timeout 30s
    - Criar folder "Lucas Magnus — Apresentação" se não existir
    - Upload de todos os artefatos (HTML, PDF, prompts, visual assets)
    - Deduplicação: se arquivo com mesmo nome existe, update ao invés de create
    - Retry: 3 tentativas por arquivo, skip após falha, continuar com restantes
    - Timeout 120s por arquivo
    - Permissões: "anyone with the link can view"
    - Output: shareable link no stdout
    - Erros: auth failure → stderr + exit code 2; upload failures → summary no stderr
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 8.2 Escrever testes de propriedade para Drive uploader (mocked)
    - **Property 7: Drive Upload Deduplication** — Para listas arbitrárias de arquivos com combinações existing/new, verificar que API update é chamada para existentes
    - **Property 8: Upload Retry and Continuation** — Para sets de arquivos com padrões de falha configuráveis, verificar 3 retries, skip, e summary
    - **Validates: Requirements 5.6, 5.7**

- [x] 9. Deployment Pipeline
  - [x] 9.1 Implementar deploy-pages.js
    - Criar `src/deploy-pages.js` usando pacote `gh-pages`
    - Publicar conteúdo de `dist/` na branch `gh-pages`
    - Incluir todos os assets com paths relativos
    - Verificar deployment: HTTP 200 na URL pública dentro de 60s
    - Output: URL pública no stdout
    - Erros: falha → stderr com step + erro, exit code 2
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 9.2 Escrever testes unitários para deploy pipeline
    - Testar formato de URL output
    - Testar que error messages incluem step name
    - Testar verificação HTTP com mock
    - _Requirements: 6.2, 6.4, 6.6_

- [x] 10. Orquestração e pipeline fail-fast
  - [x] 10.1 Configurar npm scripts e orquestração
    - Garantir que `npm run build` executa slides + pdf + prompts em sequência
    - Garantir que `npm run all` executa build + upload + deploy, parando no primeiro erro
    - Output de paths absolutos dos artefatos no stdout após build
    - Exit codes: 0 sucesso, 1 build error, 2 network/auth error, 3 validation error
    - Logging estruturado JSON no stderr para todos os módulos
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

  - [ ]* 10.2 Escrever teste de propriedade para pipeline fail-fast
    - **Property 13: Build Pipeline Fail-Fast Behavior**
    - Para injeção de falhas em steps arbitrários, verificar exit code não-zero, stderr com step + erro, e nenhum step subsequente executado
    - **Validates: Requirements 15.5, 15.7**

- [x] 11. Final checkpoint — Validação completa
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada task referencia requirements específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Property tests validam propriedades universais de corretude (fast-check, min 100 iterações)
- Unit tests validam exemplos específicos e edge cases (Vitest)
- Credenciais Google Drive via env var `GOOGLE_APPLICATION_CREDENTIALS` — nunca hardcoded
- Todos os módulos usam ESM (`import`/`export`) e logging estruturado JSON no stderr

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "2.1"] },
    { "id": 3, "tasks": ["2.2", "4.1", "6.1"] },
    { "id": 4, "tasks": ["4.2", "5.1", "6.2"] },
    { "id": 5, "tasks": ["4.3", "4.5", "5.2", "6.3"] },
    { "id": 6, "tasks": ["4.4", "8.1", "9.1"] },
    { "id": 7, "tasks": ["8.2", "9.2", "10.1"] },
    { "id": 8, "tasks": ["10.2"] }
  ]
}
```

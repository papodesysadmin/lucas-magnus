#!/usr/bin/env node

/**
 * deploy-pages.js — Publica slides no GitHub Pages via gh-pages branch
 *
 * Usa o pacote gh-pages para publicar o conteúdo de dist/ na branch gh-pages.
 * Detecta owner/repo do git remote origin para construir a URL pública.
 * Verifica deployment com HTTP 200 dentro de 60s.
 *
 * Uso: node src/deploy-pages.js
 * Saída: URL pública no stdout
 * Erros: stderr com step + erro, exit code 2
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve as pathResolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ghpages from 'gh-pages';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = pathResolve(__dirname, '..');

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
    module: 'deploy-pages',
    message,
    context
  };
  process.stderr.write(JSON.stringify(entry) + '\n');
}

// ============================================================
// Funções auxiliares
// ============================================================

/**
 * Obtém a URL do remote origin do git
 * @returns {string} URL do remote
 */
function getGitRemoteUrl() {
  try {
    const url = execSync('git remote get-url origin', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8'
    }).trim();
    return url;
  } catch {
    return null;
  }
}

/**
 * Parseia owner e repo de uma URL git (HTTPS ou SSH)
 * @param {string} remoteUrl
 * @returns {{ owner: string, repo: string } | null}
 */
function parseGitHubRemote(remoteUrl) {
  // HTTPS: https://github.com/owner/repo.git
  const httpsMatch = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // SSH: git@github.com:owner/repo.git
  const sshMatch = remoteUrl.match(/github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return null;
}

/**
 * Constrói a URL pública do GitHub Pages
 * @param {string} owner
 * @param {string} repo
 * @returns {string}
 */
function buildPagesUrl(owner, repo) {
  return `https://${owner}.github.io/${repo}/`;
}

/**
 * Verifica se a URL retorna HTTP 200 dentro do timeout
 * Faz polling a cada 5 segundos por até 60 segundos
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
async function verifyDeployment(url, timeoutMs = 60000) {
  const pollInterval = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000)
      });
      if (response.ok) {
        return true;
      }
    } catch {
      // Ignora erros de rede, continua polling
    }

    // Aguarda antes do próximo poll
    await new Promise(r => setTimeout(r, pollInterval));
  }

  return false;
}

/**
 * Publica dist/ na branch gh-pages usando o pacote gh-pages
 * @returns {Promise<void>}
 */
function publishToGhPages() {
  const distPath = pathResolve(PROJECT_ROOT, 'dist');
  return new Promise((promiseResolve, reject) => {
    ghpages.publish(distPath, {
      branch: 'gh-pages',
      message: 'Deploy Lucas Magnus presentation',
      dotfiles: false
    }, (err) => {
      if (err) {
        reject(err);
      } else {
        promiseResolve();
      }
    });
  });
}

// ============================================================
// Execução principal
// ============================================================

async function main() {
  log('INFO', 'Iniciando deploy para GitHub Pages');

  // Step 1: Verificar que dist/ existe e tem conteúdo
  const distPath = pathResolve(PROJECT_ROOT, 'dist');
  if (!existsSync(distPath)) {
    log('ERROR', 'Diretório dist/ não encontrado. Execute npm run build primeiro.', { distPath });
    process.stderr.write('[deploy-pages] Erro: Diretório dist/ não encontrado. Execute npm run build primeiro.\n');
    process.exit(2);
  }

  // Step 2: Obter remote URL e parsear owner/repo
  const remoteUrl = getGitRemoteUrl();
  if (!remoteUrl) {
    log('ERROR', 'Nenhum git remote origin configurado', { step: 'get-remote' });
    process.stderr.write('[deploy-pages] Erro no step "get-remote": Nenhum git remote origin configurado. Configure com: git remote add origin <url>\n');
    process.exit(2);
  }

  const parsed = parseGitHubRemote(remoteUrl);
  if (!parsed) {
    log('ERROR', 'Não foi possível parsear owner/repo do remote URL', { step: 'parse-remote', remoteUrl });
    process.stderr.write(`[deploy-pages] Erro no step "parse-remote": URL do remote não é um repositório GitHub válido: ${remoteUrl}\n`);
    process.exit(2);
  }

  const { owner, repo } = parsed;
  const publicUrl = buildPagesUrl(owner, repo);

  log('INFO', 'Remote detectado', { owner, repo, publicUrl });

  // Step 3: Publicar dist/ na branch gh-pages
  try {
    log('INFO', 'Publicando dist/ na branch gh-pages...', { step: 'publish' });
    await publishToGhPages();
    log('INFO', 'Publicação concluída com sucesso');
  } catch (err) {
    log('ERROR', 'Falha ao publicar no gh-pages', { step: 'publish', error: err.message });
    process.stderr.write(`[deploy-pages] Erro no step "publish": ${err.message}\n`);
    process.exit(2);
  }

  // Step 4: Verificar deployment (HTTP 200 dentro de 60s)
  log('INFO', 'Verificando deployment...', { url: publicUrl, timeout: '60s' });
  const isLive = await verifyDeployment(publicUrl, 60000);

  if (isLive) {
    log('INFO', 'Deployment verificado com sucesso (HTTP 200)');
  } else {
    log('WARN', 'Verificação HTTP não retornou 200 dentro de 60s. O deployment pode levar mais tempo para propagar.', {
      step: 'verify',
      url: publicUrl
    });
    process.stderr.write(`[deploy-pages] Aviso: Verificação HTTP não retornou 200 dentro de 60s. O site pode levar mais tempo para ficar disponível: ${publicUrl}\n`);
  }

  // Step 5: Output da URL pública no stdout
  process.stdout.write(publicUrl + '\n');

  log('INFO', 'Deploy concluído', { url: publicUrl, verified: isLive });
}

main().catch((err) => {
  log('ERROR', 'Erro inesperado no deploy', { error: err.message, stack: err.stack });
  process.stderr.write(`[deploy-pages] Erro inesperado: ${err.message}\n`);
  process.exit(2);
});

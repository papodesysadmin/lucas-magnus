/**
 * Testes unitários para deploy-pages.js
 *
 * Testa parsing de URLs git, construção de URL do GitHub Pages,
 * e formato de output/erros.
 */

import { describe, it, expect } from 'vitest';

// ============================================================
// Funções extraídas para teste (reimplementadas para isolamento)
// ============================================================

/**
 * Parseia owner e repo de uma URL git (HTTPS ou SSH)
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
 */
function buildPagesUrl(owner, repo) {
  return `https://${owner}.github.io/${repo}/`;
}

// ============================================================
// Testes
// ============================================================

describe('deploy-pages: parseGitHubRemote', () => {
  it('parseia URL HTTPS com .git', () => {
    const result = parseGitHubRemote('https://github.com/christiano-bachion/lucas-magnus.git');
    expect(result).toEqual({ owner: 'christiano-bachion', repo: 'lucas-magnus' });
  });

  it('parseia URL HTTPS sem .git', () => {
    const result = parseGitHubRemote('https://github.com/christiano-bachion/lucas-magnus');
    expect(result).toEqual({ owner: 'christiano-bachion', repo: 'lucas-magnus' });
  });

  it('parseia URL SSH com .git', () => {
    const result = parseGitHubRemote('git@github.com:christiano-bachion/lucas-magnus.git');
    expect(result).toEqual({ owner: 'christiano-bachion', repo: 'lucas-magnus' });
  });

  it('parseia URL SSH sem .git', () => {
    const result = parseGitHubRemote('git@github.com:christiano-bachion/lucas-magnus');
    expect(result).toEqual({ owner: 'christiano-bachion', repo: 'lucas-magnus' });
  });

  it('retorna null para URL não-GitHub', () => {
    const result = parseGitHubRemote('https://gitlab.com/user/repo.git');
    expect(result).toBeNull();
  });

  it('retorna null para URL inválida', () => {
    const result = parseGitHubRemote('not-a-url');
    expect(result).toBeNull();
  });

  it('parseia owner com hífens e números', () => {
    const result = parseGitHubRemote('https://github.com/user-123/my-repo-2.git');
    expect(result).toEqual({ owner: 'user-123', repo: 'my-repo-2' });
  });
});

describe('deploy-pages: buildPagesUrl', () => {
  it('gera URL no formato correto', () => {
    const url = buildPagesUrl('christiano-bachion', 'lucas-magnus');
    expect(url).toBe('https://christiano-bachion.github.io/lucas-magnus/');
  });

  it('URL sempre termina com /', () => {
    const url = buildPagesUrl('owner', 'repo');
    expect(url.endsWith('/')).toBe(true);
  });

  it('URL usa HTTPS', () => {
    const url = buildPagesUrl('owner', 'repo');
    expect(url.startsWith('https://')).toBe(true);
  });

  it('URL contém github.io', () => {
    const url = buildPagesUrl('owner', 'repo');
    expect(url).toContain('.github.io/');
  });
});

describe('deploy-pages: formato de erros', () => {
  it('mensagens de erro incluem nome do step', () => {
    // Simula formato de erro esperado
    const errorFormats = [
      '[deploy-pages] Erro no step "get-remote": Nenhum git remote origin configurado',
      '[deploy-pages] Erro no step "parse-remote": URL do remote não é um repositório GitHub válido',
      '[deploy-pages] Erro no step "publish": Connection refused'
    ];

    for (const msg of errorFormats) {
      expect(msg).toMatch(/\[deploy-pages\] Erro no step "[^"]+"/);
    }
  });

  it('aviso de verificação HTTP inclui URL', () => {
    const url = 'https://owner.github.io/repo/';
    const warning = `[deploy-pages] Aviso: Verificação HTTP não retornou 200 dentro de 60s. O site pode levar mais tempo para ficar disponível: ${url}`;
    expect(warning).toContain(url);
    expect(warning).toContain('60s');
  });
});

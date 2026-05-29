/**
 * Testes de validação da estrutura base do projeto.
 * Checkpoint 3: Verifica que todos os artefatos fundamentais existem e estão corretos.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');

describe('Estrutura base do projeto', () => {
  describe('package.json', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'));

    it('deve ter type: module', () => {
      expect(pkg.type).toBe('module');
    });

    it('deve exigir Node.js >= 18', () => {
      expect(pkg.engines).toBeDefined();
      expect(pkg.engines.node).toMatch(/>=\s*18/);
    });

    it('deve definir todos os scripts obrigatórios', () => {
      const requiredScripts = ['build', 'upload', 'deploy', 'all', 'validate', 'test'];
      for (const script of requiredScripts) {
        expect(pkg.scripts[script], `script "${script}" ausente`).toBeDefined();
      }
    });
  });

  describe('design-system.css', () => {
    const css = readFileSync(resolve(ROOT, 'src/design-system.css'), 'utf-8');

    it('deve definir tokens de cores obrigatórios', () => {
      const colorTokens = [
        '--color-primary',
        '--color-secondary',
        '--color-accent',
        '--color-neutral',
      ];
      for (const token of colorTokens) {
        expect(css, `token "${token}" ausente`).toContain(token);
      }
    });

    it('deve definir tokens de tipografia', () => {
      expect(css).toContain('--font-heading');
      expect(css).toContain('--font-body');
      expect(css).toContain('serif');
      expect(css).toContain('sans-serif');
    });

    it('deve definir pelo menos 4 valores de espaçamento', () => {
      const spacingTokens = ['--space-xs', '--space-sm', '--space-md', '--space-lg'];
      for (const token of spacingTokens) {
        expect(css, `token "${token}" ausente`).toContain(token);
      }
    });

    it('deve definir 2 estilos de borda', () => {
      expect(css).toContain('--border-thin');
      expect(css).toContain('--border-accent');
    });

    it('deve definir 2 níveis de sombra', () => {
      expect(css).toContain('--shadow-subtle');
      expect(css).toContain('--shadow-elevated');
    });

    it('deve definir transição padrão', () => {
      expect(css).toContain('--transition-default');
    });
  });

  describe('lm-crest.svg', () => {
    const svgPath = resolve(ROOT, 'src/assets/lm-crest.svg');

    it('deve existir', () => {
      expect(existsSync(svgPath)).toBe(true);
    });

    it('deve ser SVG válido com namespace', () => {
      const svg = readFileSync(svgPath, 'utf-8');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    it('deve ter dimensões mínimas de 24x24px', () => {
      const svg = readFileSync(svgPath, 'utf-8');
      const widthMatch = svg.match(/width="(\d+)"/);
      const heightMatch = svg.match(/height="(\d+)"/);
      expect(widthMatch).not.toBeNull();
      expect(heightMatch).not.toBeNull();
      expect(Number(widthMatch[1])).toBeGreaterThanOrEqual(24);
      expect(Number(heightMatch[1])).toBeGreaterThanOrEqual(24);
    });
  });

  describe('content.md', () => {
    const contentPath = resolve(ROOT, 'src/content.md');
    const content = readFileSync(contentPath, 'utf-8');

    it('deve existir', () => {
      expect(existsSync(contentPath)).toBe(true);
    });

    it('deve conter todas as seções na ordem correta', () => {
      // Usa marcadores de heading (##) para encontrar seções reais, não menções no texto
      const sections = [
        { marker: '## Abertura', label: 'Abertura' },
        { marker: '## Etimologia', label: 'Etimologia' },
        { marker: '## Internacionalização', label: 'Internacionalização' },
        { marker: '## Branding Pessoal', label: 'Branding Pessoal' },
        { marker: '## Simbolismo Sonoro', label: 'Simbolismo Sonoro' },
        { marker: '## Presença Digital', label: 'Presença Digital' },
        { marker: '## Visão de Futuro', label: 'Visão de Futuro' },
        { marker: '## Celebração do Nascimento', label: 'Celebração do Nascimento' },
      ];

      let lastIndex = -1;
      for (const { marker, label } of sections) {
        const index = content.indexOf(marker);
        expect(index, `seção "${label}" não encontrada`).toBeGreaterThan(-1);
        expect(index, `seção "${label}" fora de ordem`).toBeGreaterThan(lastIndex);
        lastIndex = index;
      }
    });

    it('não deve usar "Lucas" isolado para se referir à criança', () => {
      // Divide o conteúdo em linhas e verifica cada ocorrência de "Lucas"
      // Exceções: análise do nome como componente (entre aspas, negrito, ou em contexto linguístico)
      const lines = content.split('\n');
      const violations = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Pula linhas que analisam o componente "Lucas" linguisticamente
        if (line.includes('"Lucas"') || line.includes('**Lucas**') || line.includes('*Lucas*')) continue;
        if (line.includes('Lucas —') && line.includes('O Luminoso')) continue;
        if (line.includes('Lucas/')) continue; // Lucas/Lukas variantes
        if (line.includes('Lucas (pronúncia')) continue; // guias de pronúncia
        if (line.includes('Lucas =')) continue; // análise Bouba-Kiki
        if (line.includes('lucasmagnus')) continue; // domínios/usernames
        if (line.includes('@lucas')) continue; // handles

        // Busca "Lucas" como palavra isolada que NÃO é seguida por "Magnus"
        const regex = /\bLucas\b(?!\s+Magnus)/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
          // Verifica se está em contexto de análise (entre aspas ou negrito)
          const before = line.substring(Math.max(0, match.index - 3), match.index);
          const after = line.substring(match.index + 5, match.index + 10);
          if (before.includes('"') || before.includes('**') || after.includes('"') || after.includes('**')) continue;
          violations.push(`Linha ${i + 1}: "${line.trim().substring(0, 80)}..."`);
        }
      }

      expect(violations, `"Lucas" isolado encontrado:\n${violations.join('\n')}`).toHaveLength(0);
    });

    it('deve mencionar Florianópolis e Dezembro 2025 na celebração', () => {
      const celebracaoIndex = content.indexOf('Celebração do Nascimento');
      const celebracao = content.substring(celebracaoIndex);
      expect(celebracao).toContain('Florianópolis');
      expect(celebracao).toMatch(/[Dd]ezembro.+2025|2025.+[Dd]ezembro/);
    });
  });

  describe('Estrutura de diretórios', () => {
    const dirs = ['src', 'dist', 'tests/unit', 'tests/property', 'tests/integration'];

    for (const dir of dirs) {
      it(`diretório ${dir}/ deve existir`, () => {
        const dirPath = resolve(ROOT, dir);
        expect(existsSync(dirPath), `${dir}/ não existe`).toBe(true);
        expect(statSync(dirPath).isDirectory(), `${dir}/ não é diretório`).toBe(true);
      });
    }
  });
});

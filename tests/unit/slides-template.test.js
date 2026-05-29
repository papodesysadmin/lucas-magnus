/**
 * Testes unitários para o template HTML Reveal.js.
 * Valida estrutura, placeholders, configurações de transição e responsividade.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const template = readFileSync(resolve(ROOT, 'src/slides-template.html'), 'utf-8');

describe('slides-template.html', () => {
  describe('Estrutura Reveal.js 4.x', () => {
    it('deve ter DOCTYPE html', () => {
      expect(template).toMatch(/^<!DOCTYPE html>/i);
    });

    it('deve ter lang="pt-BR"', () => {
      expect(template).toContain('lang="pt-BR"');
    });

    it('deve ter div.reveal com div.slides', () => {
      expect(template).toContain('<div class="reveal">');
      expect(template).toContain('<div class="slides">');
    });

    it('deve inicializar Reveal.js com Reveal.initialize()', () => {
      expect(template).toContain('Reveal.initialize(');
    });
  });

  describe('Placeholders para injeção de conteúdo', () => {
    it('deve conter placeholder {{SLIDES_CONTENT}}', () => {
      expect(template).toContain('{{SLIDES_CONTENT}}');
    });

    it('deve conter placeholder {{DESIGN_SYSTEM_CSS}}', () => {
      expect(template).toContain('{{DESIGN_SYSTEM_CSS}}');
    });

    it('deve conter placeholder {{LM_CREST_SVG}}', () => {
      expect(template).toContain('{{LM_CREST_SVG}}');
    });
  });

  describe('Transições fade/slide (300-800ms)', () => {
    it('deve configurar transition: slide', () => {
      expect(template).toMatch(/transition:\s*['"]?slide['"]?/);
    });

    it('deve configurar backgroundTransition: fade', () => {
      expect(template).toMatch(/backgroundTransition:\s*['"]?fade['"]?/);
    });

    it('deve definir transition-duration dentro do range 300-800ms', () => {
      const durations = template.match(/transition-duration:\s*(\d+)ms/g);
      expect(durations).not.toBeNull();
      for (const d of durations) {
        const ms = parseInt(d.match(/(\d+)ms/)[1]);
        expect(ms).toBeGreaterThanOrEqual(300);
        expect(ms).toBeLessThanOrEqual(800);
      }
    });
  });

  describe('Navegação por teclado e touch', () => {
    it('deve habilitar keyboard: true', () => {
      expect(template).toMatch(/keyboard:\s*true/);
    });

    it('deve habilitar touch: true', () => {
      expect(template).toMatch(/touch:\s*true/);
    });

    it('deve habilitar controls: true', () => {
      expect(template).toMatch(/controls:\s*true/);
    });
  });

  describe('Suporte a vertical slides', () => {
    it('deve configurar navigationMode para suportar vertical slides', () => {
      expect(template).toMatch(/navigationMode:\s*['"]default['"]/);
    });

    it('deve documentar uso de sections aninhadas para vertical slides', () => {
      expect(template.toLowerCase()).toContain('vertical');
    });
  });

  describe('Google Fonts', () => {
    it('deve incluir link para Playfair Display', () => {
      expect(template).toContain('Playfair+Display');
    });

    it('deve incluir link para Inter', () => {
      expect(template).toContain('family=Inter');
    });
  });

  describe('Responsividade', () => {
    it('deve ter media query para max-width: 768px', () => {
      expect(template).toContain('@media (max-width: 768px)');
    });

    it('deve garantir min 16px font-size em viewports ≤768px', () => {
      // Dentro da media query, font-size deve ser pelo menos 16px (via token ou literal)
      const mediaBlock = template.match(/@media\s*\(max-width:\s*768px\)\s*\{([^}]*(\{[^}]*\}[^}]*)*)}/s);
      expect(mediaBlock).not.toBeNull();
      expect(mediaBlock[0]).toMatch(/font-size:\s*(16px|var\(--font-size-body\))/);
    });

    it('deve prevenir scroll horizontal', () => {
      expect(template).toContain('overflow-x: hidden');
    });

    it('deve ter meta viewport configurado', () => {
      expect(template).toContain('viewport');
      expect(template).toContain('width=device-width');
    });
  });

  describe('Title slide', () => {
    it('deve ter title slide com "Lucas Magnus"', () => {
      expect(template).toContain('title-slide');
      expect(template).toContain('<h1>Lucas Magnus</h1>');
    });

    it('deve usar font-size h1 (48px via token) no título', () => {
      // O title slide h1 usa var(--font-size-h1) que é 48px
      expect(template).toContain('font-size: var(--font-size-h1)');
    });

    it('deve incluir o crest LM no title slide', () => {
      expect(template).toContain('lm-crest');
    });
  });

  describe('Design system integration', () => {
    it('deve usar CSS custom properties para cores', () => {
      expect(template).toContain('var(--color-primary)');
      expect(template).toContain('var(--color-secondary)');
      expect(template).toContain('var(--color-neutral)');
    });

    it('deve usar CSS custom properties para tipografia', () => {
      expect(template).toContain('var(--font-heading)');
      expect(template).toContain('var(--font-body)');
    });

    it('deve usar CSS custom properties para espaçamento', () => {
      expect(template).toContain('var(--space-md)');
      expect(template).toContain('var(--space-lg)');
    });
  });
});

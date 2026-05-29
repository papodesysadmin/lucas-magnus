# Requirements Document

## Introduction

Apresentação rica e interativa sobre o nascimento e naming estratégico de **Lucas Magnus Schossland Bachion**, combinando celebração emocional com análise estratégica de branding pessoal. O projeto entrega slides interativos (Reveal.js) hospedados no GitHub Pages, documento PDF companion, prompts para geração de imagens por IA, e organização no Google Drive — tudo com identidade visual clássica e serifada ("Old Money Tech").

## Glossary

- **Presentation_Engine**: Motor de slides interativos baseado em Reveal.js (HTML/CSS/JS)
- **PDF_Generator**: Pipeline de conversão Markdown → PDF com design system aplicado
- **Drive_Uploader**: Módulo de integração com Google Drive API via service account
- **Design_System**: Conjunto de regras visuais (paleta, tipografia, espaçamentos) que define a identidade "Old Money Tech"
- **Slide_Deck**: Conjunto completo de slides HTML navegáveis gerados pelo Presentation_Engine
- **Content_Document**: Documento Markdown com toda a análise de naming, convertido em PDF
- **Service_Account**: Conta de serviço Google usada para autenticação na API do Drive
- **Image_Prompt_Generator**: Módulo que produz prompts descritivos para ferramentas de geração de imagens por IA (Nano/Banana ou similares)
- **Deployment_Pipeline**: Pipeline de publicação dos slides no GitHub Pages
- **Visual_Asset**: Imagem gerada por IA (brasões, tipografia estilizada, elementos visuais) usada nos slides e PDF

## Requirements

### Requirement 1: Design System e Identidade Visual

**User Story:** As a viewer, I want a cohesive and elegant visual identity across all materials, so that the presentation conveys the "Old Money Tech" aesthetic aligned with the Lucas Magnus brand.

#### Acceptance Criteria

1. THE Design_System SHALL define a color palette with at least 1 primary color (deep navy or dark green, specified as a hex value), 1 secondary color (gold/champagne, specified as a hex value), 1 accent color (burgundy, specified as a hex value), and 1 neutral color (cream/off-white, specified as a hex value)
2. THE Design_System SHALL specify serif fonts for headings (e.g., Playfair Display, Cormorant Garamond) with sizes between 24px and 48px, and sans-serif fonts for body text (e.g., Inter, Source Sans Pro) with sizes between 14px and 18px, including defined font weights for each usage
3. THE Design_System SHALL define a minimum of 4 spacing scale values, 2 border styles, and 2 shadow levels as named tokens, and all component styling across outputs SHALL use exclusively these defined tokens
4. WHEN the Design_System is applied to any material, THE Presentation_Engine SHALL render all elements using exclusively Design_System tokens for colors, fonts, spacing, borders, and shadows, with zero ad-hoc style values
5. THE Design_System SHALL export its tokens as CSS custom properties for reuse across HTML and PDF outputs
6. THE Design_System SHALL include a monogram or crest-style element combining the initials "LM" as a brand mark, displayed on every output page or slide at a minimum size of 24x24 pixels
7. IF a material contains any color, font, spacing, border, or shadow value not defined in the Design_System tokens, THEN THE Presentation_Engine SHALL flag the element as non-compliant before final rendering

### Requirement 2: Estrutura de Conteúdo da Apresentação

**User Story:** As a viewer, I want the presentation to tell a compelling story from etymology through strategy to birth celebration, so that I understand both the emotional and analytical dimensions of the name.

#### Acceptance Criteria

1. THE Content_Document SHALL contain the following sections in order: Abertura, Etimologia, Internacionalização, Branding Pessoal, Simbolismo Sonoro, Presença Digital/SEO, Visão de Futuro, and Celebração do Nascimento
2. WHEN the content is structured, THE Content_Document SHALL present each section with a clear narrative arc connecting meaning to strategy
3. THE Content_Document SHALL be written entirely in Portuguese (Brazil) with technical terms defined in the glossary
4. WHEN presenting the etymology section, THE Content_Document SHALL explain the Greek/Latin origins of "Lucas" and the Latin origin of "Magnus" with their combined meaning
5. WHEN presenting the branding section, THE Content_Document SHALL reference the Bouba-Kiki effect, SEO analysis, and domain availability strategy
6. THE Content_Document SHALL always use the compound name "Lucas Magnus" and never refer to the child as only "Lucas"

### Requirement 3: Apresentação Interativa (Reveal.js)

**User Story:** As a presenter, I want an interactive HTML slide deck that can be navigated and hosted online, so that I can share the presentation at events and on the web.

#### Acceptance Criteria

1. THE Presentation_Engine SHALL generate a self-contained HTML file using Reveal.js framework version 4.x or later, with all CSS, JS, and font assets inlined or bundled so the presentation renders without an internet connection
2. WHEN a user opens the HTML file in a browser, THE Presentation_Engine SHALL display navigable slides with keyboard arrow-key navigation and touch swipe gestures
3. THE Presentation_Engine SHALL apply the Design_System tokens to all slide elements
4. WHEN rendering slides, THE Presentation_Engine SHALL support vertical slide stacking for sub-sections within each main topic
5. THE Presentation_Engine SHALL include transitions between slides using fade or slide animations with a duration between 300ms and 800ms
6. WHEN the presentation loads, THE Presentation_Engine SHALL display a title slide with "Lucas Magnus" rendered in the serif heading font at a minimum size of 48px (or 3rem), centered, accompanied by the LM crest element
7. THE Slide_Deck SHALL contain between 20 and 40 slides covering all content sections defined in Requirement 2 (Abertura, Etimologia, Internacionalização, Branding Pessoal, Simbolismo Sonoro, Presença Digital/SEO, Visão de Futuro, and Celebração do Nascimento)
8. WHEN rendering on viewports of 768px width or less, THE Presentation_Engine SHALL adapt layout responsively ensuring a minimum body font size of 16px and no horizontal scrolling
9. THE Presentation_Engine SHALL embed or reference AI-generated Visual_Assets in at least one slide per content section, including the etymology crest, branding visuals, and celebration imagery
10. IF a referenced Visual_Asset fails to load or is unavailable, THEN THE Presentation_Engine SHALL display a styled placeholder element maintaining the slide layout without breaking navigation

### Requirement 4: Geração de Documento PDF

**User Story:** As a reader, I want a beautifully formatted PDF document with the complete analysis, so that I can read, print, and share the material offline.

#### Acceptance Criteria

1. THE PDF_Generator SHALL convert the Content_Document from Markdown to a PDF styled according to the Design_System
2. WHEN generating the PDF, THE PDF_Generator SHALL apply the Design_System typography and color palette
3. THE PDF_Generator SHALL include a cover page with title "Lucas Magnus Schossland Bachion", subtitle "Análise Estratégica de Nome e Celebração", and date (Dezembro 2025)
4. WHEN the PDF is generated, THE PDF_Generator SHALL produce a table of contents with clickable links to each heading of level 1 and level 2
5. THE PDF_Generator SHALL render the document in A4 format (210 × 297 mm) with margins of 25 mm on top and bottom and 20 mm on left and right
6. IF the Markdown source contains images or diagrams with valid paths, THEN THE PDF_Generator SHALL embed them at a minimum resolution of 150 DPI
7. IF the Markdown source references an image that cannot be loaded, THEN THE PDF_Generator SHALL omit the image and insert a placeholder text indicating the missing resource name
8. IF the Markdown-to-PDF conversion fails, THEN THE PDF_Generator SHALL report an error message indicating the failure reason and produce no partial output file

### Requirement 5: Integração com Google Drive

**User Story:** As a project owner, I want all generated materials uploaded to a dedicated Google Drive folder (separate from Papo de Sysadmin), so that they are accessible and shareable from the cloud.

#### Acceptance Criteria

1. THE Drive_Uploader SHALL authenticate using the Service_Account credentials within 30 seconds of invocation
2. WHEN the folder named "Lucas Magnus — Apresentação" does not exist in Google Drive, THE Drive_Uploader SHALL create it as a new folder separate from any existing Papo de Sysadmin folders
3. WHEN the target folder is confirmed to exist, THE Drive_Uploader SHALL upload the HTML slide deck, the PDF document, the AI image prompts file, and all generated Visual_Assets to that folder, with a maximum timeout of 120 seconds per file
4. WHEN all file uploads complete successfully, THE Drive_Uploader SHALL print to stdout the shareable link for the folder with "anyone with the link can view" permission
5. IF authentication fails, THEN THE Drive_Uploader SHALL report an error message to stderr indicating the type of credential failure and terminate execution without uploading
6. IF a file already exists in the target folder with the same name, THEN THE Drive_Uploader SHALL update the existing file content instead of creating a duplicate
7. IF any individual file upload fails after 3 retry attempts, THEN THE Drive_Uploader SHALL skip that file, continue uploading remaining files, and print to stderr a summary listing all files that failed to upload

### Requirement 6: Hospedagem no GitHub Pages

**User Story:** As a presenter, I want the slide deck published on GitHub Pages, so that anyone with the link can view the presentation without downloading files.

#### Acceptance Criteria

1. THE Deployment_Pipeline SHALL publish the Slide_Deck to GitHub Pages using the gh-pages branch of the repository
2. WHEN deployment completes, THE Deployment_Pipeline SHALL output the public URL where the presentation is accessible, following the GitHub Pages URL pattern for the repository
3. THE Deployment_Pipeline SHALL include all required assets (CSS, JS, fonts, images, and Visual_Assets) in the deployed bundle with relative paths resolved correctly for GitHub Pages subdirectory hosting
4. IF the deployment fails, THEN THE Deployment_Pipeline SHALL report the failure reason in the command output, including which step failed and the error returned by the GitHub Pages publishing process
5. WHEN a new version is built, THE Deployment_Pipeline SHALL update the published site with the latest content by overwriting the gh-pages branch
6. WHEN the deployment completes, THE Deployment_Pipeline SHALL verify that the published URL returns an HTTP 200 response within 60 seconds of deployment completion

### Requirement 7: Geração de Prompts para Imagens por IA

**User Story:** As a content creator, I want detailed prompts for AI image generation tools, so that I can produce visual assets (crests, stylized typography, visual elements) that reinforce the "Classic Innovator" concept.

#### Acceptance Criteria

1. THE Image_Prompt_Generator SHALL produce at least one prompt for each of the following visual assets: LM monogram/crest, etymology visual (Greek/Latin inspired), branding visual (young CEO archetype), celebration visual (birth announcement style), and background textures (at least 2 texture variants)
2. WHEN generating prompts, THE Image_Prompt_Generator SHALL include style directives referencing the "Old Money Tech" aesthetic: classic, serif-inspired, navy/gold palette, elegant, and these style keywords SHALL appear consistently across all generated prompts
3. THE Image_Prompt_Generator SHALL format each prompt with: asset name, target dimensions in pixels (width x height), at least 5 style keywords, a natural-language description of at least 50 words, and a negative prompt listing at least 3 elements to avoid that conflict with the brand aesthetic
4. THE Image_Prompt_Generator SHALL produce prompts compatible with text-to-image diffusion models that accept natural-language prompts with a negative prompt field (such as Nano or Banana)
5. WHEN generating the crest prompt, THE Image_Prompt_Generator SHALL describe a heraldic-inspired design combining the letters "L" and "M" with tech-subtle elements (circuit traces, geometric patterns)
6. THE Image_Prompt_Generator SHALL specify target dimensions appropriate to each asset's intended use: square format (1024x1024) for monogram/crest, landscape format (1920x1080) for background textures, and portrait or square format for remaining assets

### Requirement 8: Conteúdo — Etimologia e Significado

**User Story:** As a viewer, I want to understand the deep meaning behind each name component, so that I appreciate the intentionality of the naming choice.

#### Acceptance Criteria

1. WHEN presenting etymology, THE Content_Document SHALL state that "Lucas" derives from Greek "Loukas" / Latin "Lucanus", include the Portuguese meaning "o luminoso" or "o iluminado", and identify the origin language for each term
2. WHEN presenting etymology, THE Content_Document SHALL state that "Magnus" is Latin for "o grande" and include at least 2 historical examples of its usage (e.g., Alexander Magnus, Carolus Magnus)
3. WHEN individual etymologies for "Lucas" and "Magnus" have been presented, THE Content_Document SHALL present the combined interpretation "O Grande Iluminado" as the unified meaning of the two components together
4. WHEN presenting the full name, THE Content_Document SHALL state that "Schossland" (paterno) and "Bachion" (materno) complete the registro civil, and shall indicate that these sobrenomes are not part of the nome artístico "Lucas Magnus"
5. THE Content_Document SHALL present the etymology section following the order: individual component meanings first, then combined interpretation, then registro civil context

### Requirement 9: Conteúdo — Internacionalização

**User Story:** As a viewer, I want to see how the name performs across languages and cultures, so that I understand its global viability.

#### Acceptance Criteria

1. THE Content_Document SHALL list the languages where "Lucas" is used as a common given name without adaptation or transliteration: English, Spanish, French, German, Italian, Portuguese
2. THE Content_Document SHALL explain that "Magnus" is recognized as a common name in Scandinavian and Germanic languages and can be read and spoken in English without requiring pronunciation guidance
3. THE Content_Document SHALL describe the "s→M" phonetic transition between "Lucas" and "Magnus" as not requiring a pause or glottal stop and not producing adjacent harsh consonant clusters
4. THE Content_Document SHALL mention practical applications demonstrating international usability: conference badges, GitHub profiles, LinkedIn, international business cards
5. THE Content_Document SHALL note whether "Lucas Magnus" carries negative connotations or unintended meanings in any of the listed languages

### Requirement 10: Conteúdo — Branding Pessoal e Posicionamento

**User Story:** As a viewer, I want to understand the strategic positioning of "Lucas Magnus" as a personal brand for a future tech speaker, so that I see the long-term vision.

#### Acceptance Criteria

1. THE Content_Document SHALL describe the "Efeito Prodígio": "Lucas" conveys youth and approachability (first-name familiarity, informal tone) while "Magnus" adds authority and stage presence (formal weight, intellectual connotation)
2. THE Content_Document SHALL reference the association with Magnus Carlsen as a parallel of strategy, logic, and intellectual dominance
3. WHEN presenting brand strategy, THE Content_Document SHALL recommend lucasmagnus.dev as the primary domain with .com and .io as secondary registrations
4. THE Content_Document SHALL define the brand archetype as "Inovador Clássico" / "Old Money Tech", characterized by at least 3 observable attributes combining technological innovation with traditional credibility markers (e.g., minimalist aesthetics, authoritative communication style, premium positioning)
5. WHEN presenting market positioning, THE Content_Document SHALL compare the two-syllable + two-syllable name structure to Peter Thiel and Lex Fridman as references of phonetic memorability and intellectual association in tech
6. THE Content_Document SHALL present the target profile as a CEO or startup founder aged 25 to 40 who operates in the technology or innovation sector
7. THE Content_Document SHALL describe a speaker trajectory roadmap containing at least 3 progressive stages (e.g., digital content, local events, international stages) connecting the brand positioning to long-term visibility in the tech industry

### Requirement 11: Conteúdo — Simbolismo Sonoro (Bouba-Kiki)

**User Story:** As a viewer, I want to understand the psycholinguistic impact of the name's sounds, so that I appreciate how it affects perception.

#### Acceptance Criteria

1. THE Content_Document SHALL explain the Bouba-Kiki effect covering its definition, its experimental basis in sound-shape association, and its application to how audiences perceive brand names
2. WHEN analyzing "Lucas", THE Content_Document SHALL identify its constituent phonemes (vowels and consonants), classify its overall sound profile as "Bouba" (rounded vowels, liquid consonants), and state the associated perceptual attributes (empathy, accessibility, charisma)
3. WHEN analyzing "Magnus", THE Content_Document SHALL identify its constituent phonemes (vowels and consonants), classify its overall sound profile as "Kiki" (nasal + plosive consonants), and state the associated perceptual attributes (force, precision, authority)
4. THE Content_Document SHALL explain the combined sequential effect of "Lucas Magnus" by describing how the audience processes the Bouba qualities (empathy) first and the Kiki qualities (authority) second, and stating the resulting branding perception of the full name as a unified identity

### Requirement 12: Conteúdo — Presença Digital e SEO

**User Story:** As a viewer, I want to see the digital landscape analysis for the name, so that I understand the competitive advantage.

#### Acceptance Criteria

1. THE Content_Document SHALL present the "oceano azul" (blue ocean) analysis for "Lucas Magnus" in the tech/business niche, including at least the number of competing profiles found in the first 30 Google results and the absence of established tech/business figures using this exact compound name
2. THE Content_Document SHALL state that no globally recognized CEOs or tech conference speakers with more than 10,000 followers on any major platform currently use the exact compound name "Lucas Magnus"
3. WHEN presenting recommendations, THE Content_Document SHALL list domains to register: lucasmagnus.com, lucasmagnus.dev, lucasmagnus.io
4. THE Content_Document SHALL mention the email lucasmagnusbr@proton.me as the established contact point
5. THE Content_Document SHALL describe a strategy to occupy at least 5 of the top 10 Google results for the query "Lucas Magnus" in the tech niche, including at least 3 specific tactics (e.g., domain registration, content publishing, profile creation on relevant platforms)
6. WHEN describing the SEO strategy, THE Content_Document SHALL specify at least 3 platforms or channels where profiles or content should be established to build search result presence

### Requirement 13: Conteúdo — Análise de Riscos

**User Story:** As a viewer, I want to understand potential risks and mitigations of the naming choice, so that I see the decision was made with full awareness.

#### Acceptance Criteria

1. THE Content_Document SHALL acknowledge that "Magnus" alone can sound presumptuous, and explain that the addition of "Lucas" reduces this perception by grounding the name in a personal identity rather than a grandiose title
2. THE Content_Document SHALL mention at least 2 pop culture associations (including Magnus Archives and X-Men) and classify each as having no negative impact on brand positioning in the tech niche
3. THE Content_Document SHALL note that in English contexts, "Magnus" may be interpreted as a surname, and classify this risk as low-impact given that the primary audience operates in Portuguese-language contexts
4. THE Content_Document SHALL present the compound usage "Lucas Magnus" as the primary mitigation strategy, explicitly linking it to each of the identified risks: presumptuous perception, pop culture associations, and surname interpretation
5. THE Content_Document SHALL classify each identified risk using a 3-level severity scale (low, medium, high) with a one-sentence justification for the assigned level

### Requirement 14: Conteúdo — Celebração do Nascimento

**User Story:** As a family member or friend, I want an emotional closing section celebrating the birth of Lucas Magnus, so that the presentation ends on a heartfelt note.

#### Acceptance Criteria

1. THE Content_Document SHALL include a closing section, positioned as the final section of the document, celebrating the birth of Lucas Magnus in Florianópolis, December 2025, mentioning his full name at least once
2. WHEN presenting the celebration, THE Content_Document SHALL transition from analytical tone to emotional and personal tone, using direct address to Lucas Magnus, first-person expressions from the family perspective, and language conveying wishes or hopes
3. THE Content_Document SHALL explicitly mention both family surnames (Schossland and Bachion) in the celebration section, acknowledging the union of both lineages
4. THE Content_Document SHALL close with a final message expressing hopes or expectations for the future of Lucas Magnus, referencing at least one forward-looking aspiration

### Requirement 15: Pipeline de Build e Automação

**User Story:** As a developer, I want a single command to build all deliverables and upload them, so that the workflow is reproducible and automated.

#### Acceptance Criteria

1. THE build pipeline SHALL provide a single entry-point command (npm run build) that generates both the HTML slides and the PDF
2. WHEN the build completes successfully, THE pipeline SHALL output to stdout the absolute file paths of all generated artifacts
3. THE build pipeline SHALL provide a separate upload command (npm run upload) that sends artifacts to Google Drive using the Drive_Uploader module
4. THE build pipeline SHALL provide a deploy command (npm run deploy) that publishes the slides to GitHub Pages using the Deployment_Pipeline module
5. IF any build step fails, THEN THE pipeline SHALL exit with a non-zero exit code and report to stderr which step failed and the error message returned by that step
6. THE build pipeline SHALL use Node.js (version 18 or later) as the runtime environment for all automation scripts
7. THE build pipeline SHALL provide a combined command (npm run all) that executes build, upload, and deploy in sequence, stopping at the first failure

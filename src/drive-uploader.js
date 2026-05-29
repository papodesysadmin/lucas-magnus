/**
 * Drive Uploader — Upload de artefatos para Google Drive
 *
 * Autenticação via Service Account (GOOGLE_APPLICATION_CREDENTIALS).
 * Cria folder "Lucas Magnus — Apresentação" se não existir.
 * Deduplicação: update se arquivo já existe, create se não.
 * Retry: 3 tentativas por arquivo, skip após falha.
 * Permissões: "anyone with the link can view".
 * Output: shareable link no stdout.
 * Erros: auth failure → stderr + exit code 2.
 */

import { google } from 'googleapis';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

// Configuração
const FOLDER_NAME = 'Lucas Magnus — Apresentação';
const MAX_RETRIES = 3;
const TIMEOUT_PER_FILE_MS = 120_000;
const AUTH_TIMEOUT_MS = 30_000;
const DIST_DIR = resolve('dist');

/**
 * Log estruturado no stderr
 */
function log(level, message, context = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    module: 'drive-uploader',
    message,
    context,
  };
  process.stderr.write(JSON.stringify(entry) + '\n');
}

/**
 * Autentica com Google Drive API usando Service Account
 */
async function authenticate() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!credentialsPath) {
    log('ERROR', 'GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
    process.exit(2);
  }

  if (!existsSync(credentialsPath)) {
    log('ERROR', 'Credentials file not found at specified path', { path: credentialsPath });
    process.exit(2);
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    // Timeout para autenticação
    const authClient = await Promise.race([
      auth.getClient(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Authentication timeout (30s exceeded)')), AUTH_TIMEOUT_MS)
      ),
    ]);

    const drive = google.drive({ version: 'v3', auth: authClient });

    // Testar conexão com uma chamada simples
    await Promise.race([
      drive.about.get({ fields: 'user' }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Authentication verification timeout')), AUTH_TIMEOUT_MS)
      ),
    ]);

    log('INFO', 'Authentication successful');
    return drive;
  } catch (error) {
    log('ERROR', 'Authentication failed', {
      type: error.code || error.name || 'UNKNOWN',
      detail: error.message,
    });
    process.exit(2);
  }
}

/**
 * Busca ou cria a folder no Google Drive
 */
async function ensureFolder(drive) {
  try {
    // Buscar folder existente
    const searchResponse = await drive.files.list({
      q: `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      const folderId = searchResponse.data.files[0].id;
      log('INFO', 'Folder found', { folderId, name: FOLDER_NAME });
      return folderId;
    }

    // Criar folder
    const createResponse = await drive.files.create({
      requestBody: {
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    const folderId = createResponse.data.id;
    log('INFO', 'Folder created', { folderId, name: FOLDER_NAME });
    return folderId;
  } catch (error) {
    log('ERROR', 'Failed to ensure folder exists', { detail: error.message });
    process.exit(2);
  }
}

/**
 * Define permissões "anyone with the link can view" na folder
 */
async function setFolderPermissions(drive, folderId) {
  try {
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        type: 'anyone',
        role: 'reader',
      },
    });
    log('INFO', 'Folder permissions set to "anyone with the link can view"', { folderId });
  } catch (error) {
    // Permissão pode já existir — não é fatal
    if (error.code === 409) {
      log('INFO', 'Folder permissions already set', { folderId });
    } else {
      log('WARN', 'Failed to set folder permissions', { detail: error.message });
    }
  }
}

/**
 * Verifica se arquivo com mesmo nome já existe na folder
 */
async function findExistingFile(drive, fileName, folderId) {
  const response = await drive.files.list({
    q: `name = '${fileName}' and '${folderId}' in parents and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }
  return null;
}

/**
 * Determina o MIME type baseado na extensão do arquivo
 */
function getMimeType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    html: 'text/html',
    pdf: 'application/pdf',
    md: 'text/markdown',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    json: 'application/json',
    css: 'text/css',
    js: 'application/javascript',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Upload de um único arquivo com timeout
 */
async function uploadSingleFile(drive, filePath, folderId) {
  const fileName = basename(filePath);
  const mimeType = getMimeType(fileName);

  const existingFileId = await findExistingFile(drive, fileName, folderId);

  const media = {
    mimeType,
    body: createReadStream(filePath),
  };

  const uploadPromise = existingFileId
    ? drive.files.update({
        fileId: existingFileId,
        media,
        fields: 'id, name',
      })
    : drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media,
        fields: 'id, name',
      });

  // Aplicar timeout por arquivo
  const result = await Promise.race([
    uploadPromise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Upload timeout (${TIMEOUT_PER_FILE_MS / 1000}s exceeded)`)),
        TIMEOUT_PER_FILE_MS
      )
    ),
  ]);

  const action = existingFileId ? 'updated' : 'created';
  log('INFO', `File ${action}`, { fileName, fileId: result.data.id });
  return result.data.id;
}

/**
 * Upload de um arquivo com retry (3 tentativas)
 */
async function uploadFileWithRetry(drive, filePath, folderId) {
  const fileName = basename(filePath);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const fileId = await uploadSingleFile(drive, filePath, folderId);
      return { success: true, fileName, fileId };
    } catch (error) {
      log('WARN', `Upload attempt ${attempt}/${MAX_RETRIES} failed`, {
        fileName,
        attempt,
        detail: error.message,
      });

      if (attempt === MAX_RETRIES) {
        log('ERROR', `File upload failed after ${MAX_RETRIES} retries`, {
          fileName,
          lastError: error.message,
        });
        return { success: false, fileName, error: error.message };
      }

      // Esperar antes de retry (backoff exponencial simples)
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

/**
 * Coleta todos os arquivos do dist/ para upload
 */
async function collectFiles() {
  const files = [];

  if (!existsSync(DIST_DIR)) {
    log('ERROR', 'dist/ directory not found', { path: DIST_DIR });
    process.exit(1);
  }

  const entries = await readdir(DIST_DIR, { withFileTypes: true, recursive: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name !== '.gitkeep') {
      const fullPath = join(entry.parentPath || entry.path, entry.name);
      files.push(fullPath);
    }
  }

  if (files.length === 0) {
    log('WARN', 'No files found in dist/ to upload');
  }

  return files;
}

/**
 * Gera o shareable link da folder
 */
function getShareableLink(folderId) {
  return `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;
}

/**
 * Ponto de entrada principal
 */
async function main() {
  log('INFO', 'Starting Drive upload');

  // 1. Autenticar
  const drive = await authenticate();

  // 2. Garantir que a folder existe
  const folderId = await ensureFolder(drive);

  // 3. Definir permissões
  await setFolderPermissions(drive, folderId);

  // 4. Coletar arquivos
  const files = await collectFiles();

  if (files.length === 0) {
    const link = getShareableLink(folderId);
    process.stdout.write(link + '\n');
    log('INFO', 'No files to upload, folder link generated', { link });
    process.exit(0);
  }

  // 5. Upload com retry
  const results = [];
  for (const filePath of files) {
    const result = await uploadFileWithRetry(drive, filePath, folderId);
    results.push(result);
  }

  // 6. Avaliar resultados
  const failures = results.filter((r) => !r.success);
  const successes = results.filter((r) => r.success);

  // 7. Output shareable link
  const link = getShareableLink(folderId);
  process.stdout.write(link + '\n');

  // 8. Summary de falhas no stderr
  if (failures.length > 0) {
    log('ERROR', 'Upload summary: some files failed', {
      total: results.length,
      succeeded: successes.length,
      failed: failures.length,
      failedFiles: failures.map((f) => ({ name: f.fileName, error: f.error })),
    });

    // Se TODOS falharam, exit code 2
    if (successes.length === 0) {
      process.exit(2);
    }
  } else {
    log('INFO', 'All files uploaded successfully', {
      total: results.length,
      link,
    });
  }
}

// Executar
main().catch((error) => {
  log('ERROR', 'Unexpected error', { detail: error.message });
  process.exit(2);
});

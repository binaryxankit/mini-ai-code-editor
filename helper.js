// helper.js
import fs from 'fs';
import path from 'path';

export function createFile(relativePath, content = '') {
  const baseDir = process.cwd();
  const targetPath = path.resolve(baseDir, relativePath);

  // 🔒 Sandbox protection
  if (!targetPath.startsWith(baseDir)) {
    throw new Error('Access denied: invalid path');
  }

  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

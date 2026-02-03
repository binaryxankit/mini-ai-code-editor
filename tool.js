// tools.js
import fs from 'fs';
import path from 'path';
import { createFile } from './helper.js';

const tools = [
  // =====================================================
  // READ FILE
  // =====================================================
  {
    name: 'read_file',
    description:
      "Read the contents of a given relative file path. Use this when you want to see what's inside a file. Do not use this with directory names.",
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path of the file to read.',
        },
      },
      required: ['path'],
    },

    execute: async ({ path: relativePath }) => {
      const baseDir = process.cwd();
      const targetPath = path.resolve(baseDir, relativePath);

      // 🔒 Sandbox protection
      if (!targetPath.startsWith(baseDir)) {
        return 'Access denied: invalid path';
      }

      try {
        if (!fs.existsSync(targetPath)) {
          return 'Error: file does not exist';
        }

        if (fs.lstatSync(targetPath).isDirectory()) {
          return 'Error: path is a directory, not a file';
        }

        // File size limit (10MB)
        const stats = fs.lstatSync(targetPath);
        const maxSize = 10 * 1024 * 1024;
        if (stats.size > maxSize) {
          return `Error: file too large (${stats.size} bytes).`;
        }

        // Block sensitive files
        const fileName = path.basename(targetPath).toLowerCase();
        const blockedFiles = ['.env', '.env.local', '.env.production', 'id_rsa', 'id_ed25519'];
        if (blockedFiles.includes(fileName) || fileName.startsWith('.env')) {
          return 'Error: access to sensitive files is not allowed';
        }

        return fs.readFileSync(targetPath, 'utf-8');
      } catch (error) {
        return `Error reading file: ${error.message}`;
      }
    },
  },

  // =====================================================
  // LIST FILES
  // =====================================================
  {
    name: 'list_files',
    description:
      'List files and directories at a given relative path. Use this to explore the project structure.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative directory path to list files from. Use "." for current directory.',
        },
      },
      required: [],
    },

    execute: async (input) => {
      const baseDir = process.cwd();
      const relativePath = input?.path || '.';
      const targetPath = path.resolve(baseDir, relativePath);

      // 🔒 Sandbox protection
      if (!targetPath.startsWith(baseDir)) {
        return 'Access denied: invalid path';
      }

      try {
        if (!fs.existsSync(targetPath)) {
          return 'Error: directory does not exist';
        }

        if (!fs.lstatSync(targetPath).isDirectory()) {
          return 'Error: path is not a directory';
        }

        const items = fs.readdirSync(targetPath, { withFileTypes: true });

        return items.map((item) => ({
          name: item.name,
          type: item.isDirectory() ? 'directory' : 'file',
        }));
      } catch (error) {
        return `Error listing files: ${error.message}`;
      }
    },
  },

  // =====================================================
  // EDIT FILE (DELTA-BASED, SAFE)
  // =====================================================
  {
    name: 'edit_file',
    description: `
Edit a file by replacing an existing string with a new string.

Use this for small, targeted edits only.
The old_str must match exactly ONE location in the file.

If the file does not exist and old_str is empty, the file will be created
with new_str as its contents.

Do NOT use this to rewrite entire files.
`,
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path of the file to edit.',
        },
        old_str: {
          type: 'string',
          description:
            'Exact text to replace. Must match exactly once. Use empty string only when creating a new file.',
        },
        new_str: {
          type: 'string',
          description: 'Replacement text.',
        },
      },
      required: ['path', 'old_str', 'new_str'],
    },

    execute: async ({ path: relativePath, old_str, new_str }) => {
      const baseDir = process.cwd();
      const targetPath = path.resolve(baseDir, relativePath);

      // 🔒 Sandbox protection
      if (!targetPath.startsWith(baseDir)) {
        return 'Access denied: invalid path';
      }

      // ---- File does not exist → create ONLY if old_str is empty
      if (!fs.existsSync(targetPath)) {
        if (old_str !== '') {
          return 'Error: file does not exist and old_str is not empty';
        }

        createFile(relativePath, new_str);
        return `Created file ${relativePath} successfully`;
      }

      if (fs.lstatSync(targetPath).isDirectory()) {
        return 'Error: path is a directory, not a file';
      }

      const content = fs.readFileSync(targetPath, 'utf-8');

      if (old_str === new_str) {
        return 'Error: old_str and new_str are identical';
      }

      const occurrences = content.split(old_str).length - 1;

      if (occurrences === 0) {
        return 'Error: old_str not found in file';
      }

      if (occurrences > 1) {
        return 'Error: old_str matches multiple locations; edit aborted';
      }

      const updated = content.replace(old_str, new_str);
      fs.writeFileSync(targetPath, updated, 'utf-8');

      return `Edited ${relativePath} successfully`;
    },
  },

  // =====================================================
  // SEARCH CODE (NEW TOOL)
  // =====================================================
  {
    name: 'search_code',
    description:
      'Recursively search the codebase for a given string. Returns file paths and line numbers of matches. Use this to find code in the project.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The string or code fragment to search for.',
        },
        path: {
          type: 'string',
          description: 'Relative directory path to search in. Defaults to current directory.',
        },
        max_results: {
          type: 'integer',
          description: 'Maximum number of results to return (default 100).',
        },
      },
      required: ['query'],
    },
    execute: async ({ query, path: searchPath, max_results }) => {
      const baseDir = process.cwd();
      const startDir = path.resolve(baseDir, searchPath || '.');
      const results = [];
      const maxResults = typeof max_results === 'number' ? max_results : 100;
      // Restrict attention to common code file extensions to reduce noise
      const includeExtensions = [
        '.js', '.ts', '.json', '.jsx', '.tsx', '.md', '.py', '.java', '.c', '.cpp', '.cs', '.rb', '.go'
      ];

      // 🔒 Sandbox protection
      if (!startDir.startsWith(baseDir)) {
        return 'Access denied: invalid search path';
      }

      function searchInFile(filePath) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes(query)) {
              results.push({
                file: path.relative(baseDir, filePath),
                line: idx + 1,
                preview: line.trim().slice(0, 200),
              });
            }
          });
        } catch {
          // Ignore unreadable files
        }
      }

      function walk(dir) {
        if (results.length >= maxResults) return;
        let entries;
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          if (results.length >= maxResults) return;
          const fullPath = path.join(dir, entry.name);

          // Skip node_modules and hidden folders/files for safety and speed
          if (
            entry.name === 'node_modules' ||
            entry.name.startsWith('.') ||
            entry.name === 'dist' ||
            entry.name === 'build'
          ) {
            continue;
          }

          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (includeExtensions.includes(ext)) {
              searchInFile(fullPath);
            }
          }
        }
      }

      walk(startDir);

      return results.slice(0, maxResults);
    },
  },
];

export default tools;

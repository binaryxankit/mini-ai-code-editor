// tools.js
import fs from 'fs';
import path from 'path';

/**
 * All tools are:
 * - Sandboxed to project root
 * - Deterministic
 * - Claude-facing schema + local execution separated
 */

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
          description:
            'Relative directory path to list files from. Use "." for current directory.',
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
  // WRITE FILE (DANGEROUS — HEAVILY GUARDED)
  // =====================================================
  {
    name: 'write_file',
    description:
      'Create or write a file at a given relative path. Use this to create new files or overwrite existing ones ONLY when explicitly intended.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path of the file to write.',
        },
        content: {
          type: 'string',
          description: 'Full content to write into the file.',
        },
        overwrite: {
          type: 'boolean',
          description:
            'Must be true to overwrite an existing file. Prevents accidental destruction.',
        },
      },
      required: ['path', 'content', 'overwrite'],
    },

    execute: async ({ path: relativePath, content, overwrite }) => {
      const baseDir = process.cwd();
      const targetPath = path.resolve(baseDir, relativePath);

      // Sandbox protection to prevent the agent from writing to files outside the current directory.
      if (!targetPath.startsWith(baseDir)) {
        return 'Access denied: invalid path';
      }

      try {
        // Existing path checks
        if (fs.existsSync(targetPath)) {
          if (fs.lstatSync(targetPath).isDirectory()) {
            return 'Error: cannot write to a directory';
          }

          if (!overwrite) {
            return 'File already exists. Set overwrite=true to replace it.';
          }
        }

        // Ensure parent directories exist
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });

        fs.writeFileSync(targetPath, content, 'utf-8');

        return `File written successfully at ${relativePath}`;
      } catch (error) {
        return `Error writing file: ${error.message}`;
      }
    },
  },
];

export default tools;
import fs from 'fs';
import path from 'path';

const tools = [
    {
        name: 'read_file',
        description:
            "Read the contents of a given relative file path. Use this when you want to see what's inside a file. Do not use this with directory names.", // When to use the tool
        input_schema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'The relative path to the file you want to read.', // how to use the tool
                },
            },
            required: ['path'],
        },
        execute: async ({ path }) => {
            try {
                return fs.readFileSync(path, 'utf-8');
            } catch (error) {
                return `Error reading file: ${error.message}`;
            }
        },
    },
    {
        name: "list_files",
        description: "List files and directories at a given path. If no path is provided, lists files in the current directory.",
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
            const dirPath = input?.path || '.';

            try {
                const items = fs.readdirSync(dirPath, { withFileTypes: true });

                const results = items.map((item) => ({
                    name: item.name,
                    type: item.isDirectory() ? 'directory' : 'file',
                }));

                return results;
            } catch (error) {
                return `Error listing files: ${error.message}`;
            }
        },
    },
];

export default tools;
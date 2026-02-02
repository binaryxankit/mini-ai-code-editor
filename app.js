// app.js
import dotenv from 'dotenv';
import readline from 'readline';
import tools from './tool.js';
import OpenAI from 'openai';

dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY?.trim();
if (!apiKey) {
  console.error('Missing OPENROUTER_API_KEY');
  process.exit(1);
}

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * System prompt defines EDITOR behavior, not chat behavior
 */
const SYSTEM_PROMPT = `
You are an AI code editor agent.
You operate on a local codebase using tools.
Prefer actions over explanations.
Use tools to inspect or modify files when appropriate.
After completing actions, briefly summarize what changed.
`;

const ConversationContext = [
  { role: 'system', content: SYSTEM_PROMPT },
];

async function runAgent() {
  process.on('SIGINT', () => {
    rl.close();
    process.exit(0);
  });

  while (true) {
    const userInput = await new Promise((resolve) =>
      rl.question('\n› ', resolve)
    );

    if (!userInput.trim()) continue;

    ConversationContext.push({
      role: 'user',
      content: userInput,
    });

    await runEditorLoop();
  }
}

async function runEditorLoop() {
  while (true) {
    const response = await openai.chat.completions.create({
      model: 'openai/gpt-4o',
      messages: ConversationContext,
      tools: tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        },
      })),
      max_tokens: 2500,
    });

    const message = response.choices[0].message;

    /**
     * CASE 1: Assistant requests tools
     * Tool messages MUST immediately follow this assistant message
     */
    if (message.tool_calls && message.tool_calls.length > 0) {
      // Push assistant WITH tool_calls (CRITICAL)
      ConversationContext.push({
        role: 'assistant',
        content: message.content ?? '',
        tool_calls: message.tool_calls,
      });

      for (const call of message.tool_calls) {
        const tool = tools.find((t) => t.name === call.function.name);
        if (!tool) continue;

        console.log(`→ ${tool.name}`);

        const args = JSON.parse(call.function.arguments);
        const result = await tool.execute(args);

        // Tool result must immediately follow its tool_call
        ConversationContext.push({
          role: 'tool',
          tool_call_id: call.id,
          content:
            typeof result === 'string'
              ? result
              : JSON.stringify(result),
        });
      }

      // Continue loop so model can see tool results
      continue;
    }

    /**
     * CASE 2: No tool calls → final assistant response
     */
    if (message.content) {
      console.log(`\n✓ ${message.content}`);
      ConversationContext.push({
        role: 'assistant',
        content: message.content,
      });
    }

    // Exit editor loop for this user command
    return;
  }
}

runAgent();

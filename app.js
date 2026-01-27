// AI Code Editor: Now in this file your creation of agent, running agent and conditions for the tools.

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const ClaudeClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// So claude is stateless and zero-shot then we have to store all conversation context right now here itself
const ConversationContext = [];

async function runAgent() {

    process.on('SIGINT', () => {
        rl.close();
        process.exit(0);
    });

    while (true) {
        const userInput = await new Promise((resolve) => {
            rl.question('\nYou: ', (input) => {
                resolve(input);
            });
        });

        if(!userInput.trim()) continue;

        ConversationContext.push({
            role: 'user',
            content: userInput,
        });

        const agent = await ClaudeClient.messages.create({
            model: 'claude-3-5-sonnet-20240620',
            messages: ConversationContext,
            max_tokens: 1000,
        });

        for (const content of agent.content) {
            if (content.type === 'text') {
                console.log(content.text);
                ConversationContext.push({
                    role: 'assistant',
                    content: content.text,
                });
            }
            else if(content.type === 'tool_use'){
                console.log('Tool Use:', content.tool_use);
            }
        }
    }
}

runAgent();
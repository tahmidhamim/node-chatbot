import readline from 'readline';
import dotenv from 'dotenv';
import DatabaseService from './database.js';
import OpenRouterService from './openrouter.js';
import { tools, executeTool } from './tools.js';

// Load environment variables
dotenv.config();

class Chatbot {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.db = null;
    this.api = null;
    this.rl = null;
    this.isProcessing = false;
  }

  generateSessionId() {
    // Simple session ID generator
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async initialize() {
    console.log('🤖 Node Chatbot Initializing...\n');

    // Validate environment variables
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('✗ OPENROUTER_API_KEY not found in .env file');
      process.exit(1);
    }

    if (!process.env.MONGODB_URI) {
      console.error('✗ MONGODB_URI not found in .env file');
      process.exit(1);
    }

    try {
      // Initialize database
      this.db = new DatabaseService(process.env.MONGODB_URI);
      await this.db.connect();

      // Initialize API service (OpenRouter via OpenAI SDK)
      const model = process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo';
      
      this.api = new OpenRouterService(
        process.env.OPENROUTER_API_KEY,
        model
      );

      console.log(`✓ Using model: ${model}`);
      console.log(`✓ Session ID: ${this.sessionId}\n`);

      // Setup readline interface
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '\nYou: ',
      });

      this.setupReadlineHandlers();
      this.showHelp();
      this.rl.prompt();

    } catch (error) {
      console.error('✗ Initialization failed:', error.message);
      process.exit(1);
    }
  }

  setupReadlineHandlers() {
    this.rl.on('line', async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        this.rl.prompt();
        return;
      }

      // Handle commands
      if (trimmed.startsWith('/')) {
        await this.handleCommand(trimmed);
        this.rl.prompt();
        return;
      }

      // Prevent overlapping requests
      if (this.isProcessing) {
        console.log('⏳ Please wait for the current response to complete...');
        this.rl.prompt();
        return;
      }

      await this.processMessage(trimmed);
      this.rl.prompt();
    });

    this.rl.on('close', async () => {
      await this.shutdown();
    });
  }

  async handleCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case '/help':
        this.showHelp();
        break;

      case '/clear':
        await this.db.clearConversation(this.sessionId);
        console.log('✓ Conversation cleared');
        break;

      case '/new':
        this.sessionId = this.generateSessionId();
        console.log(`✓ New session started: ${this.sessionId}`);
        break;

      case '/sessions':
        const sessions = await this.db.listSessions(10);
        console.log('\n📋 Recent Sessions:');
        sessions.forEach((s, i) => {
          console.log(`   ${i + 1}. ${s._id} (${s.messageCount} messages)`);
        });
        break;

      case '/load':
        if (parts[1]) {
          this.sessionId = parts.slice(1).join(' ');
          const history = await this.db.getConversationHistory(this.sessionId);
          console.log(`✓ Loaded session with ${history.length} messages`);
        } else {
          console.log('Usage: /load <session_id>');
        }
        break;

      case '/exit':
      case '/quit':
        this.rl.close();
        break;

      default:
        console.log(`Unknown command: ${cmd}. Type /help for available commands.`);
    }
  }

  showHelp() {
    console.log('📚 Available Commands:');
    console.log('   /help      - Show this help message');
    console.log('   /clear     - Clear current conversation');
    console.log('   /new       - Start a new session');
    console.log('   /sessions  - List recent sessions');
    console.log('   /load <id> - Load a specific session');
    console.log('   /exit      - Exit the chatbot');
    console.log('\n💡 Features:');
    console.log('   - Conversation memory (stored in MongoDB)');
    console.log('   - Function calling (time, calculator, weather, search)');
    console.log('   - Automatic retry on errors');
  }

  async processMessage(userMessage) {
    this.isProcessing = true;

    try {
      // Save user message
      await this.db.saveMessage(this.sessionId, 'user', userMessage);

      // Get conversation history
      const history = await this.db.getConversationHistory(this.sessionId);

      // Make API request
      console.log('\n🤔 Thinking...');
      const response = await this.api.chat(history, tools);

      if (!response.success) {
        console.log(`\n❌ Error: ${response.error}`);
        return;
      }

      const message = response.data.choices[0].message;

      // Handle tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        await this.handleToolCalls(message, history);
      } else {
        // Regular response
        console.log(`\nAssistant: ${message.content}`);
        await this.db.saveMessage(this.sessionId, 'assistant', message.content);
      }

    } catch (error) {
      console.log(`\n❌ Unexpected error: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  async handleToolCalls(message, history) {
    // Save assistant message with tool calls
    await this.db.saveMessage(
      this.sessionId,
      'assistant',
      message.content || '',
      message.tool_calls
    );

    console.log(`\n🔧 Using tools...`);

    // Execute each tool call
    for (const toolCall of message.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      console.log(`   → ${functionName}(${JSON.stringify(functionArgs)})`);

      const result = executeTool(functionName, functionArgs);

      // Save tool result
      await this.db.saveMessage(
        this.sessionId,
        'tool',
        result,
        null,
        {
          tool_call_id: toolCall.id,
          name: functionName,
        }
      );
    }

    // Get updated history and make another API call for final response
    const updatedHistory = await this.db.getConversationHistory(this.sessionId);
    const finalResponse = await this.api.chat(updatedHistory, tools);

    if (finalResponse.success) {
      const finalMessage = finalResponse.data.choices[0].message;
      console.log(`\nAssistant: ${finalMessage.content}`);
      await this.db.saveMessage(this.sessionId, 'assistant', finalMessage.content);
    }
  }

  async shutdown() {
    console.log('\n\n👋 Shutting down...');
    if (this.db) {
      await this.db.disconnect();
    }
    console.log('Goodbye!\n');
    process.exit(0);
  }
}

// Main execution
const chatbot = new Chatbot();
chatbot.initialize().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', async () => {
  await chatbot.shutdown();
});

process.on('SIGTERM', async () => {
  await chatbot.shutdown();
});
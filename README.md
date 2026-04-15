# 🤖 Node.js AI Chatbot

A production-ready command-line chatbot with persistent conversation history in MongoDB Atlas, powered by OpenAI models through OpenRouter using the OpenAI SDK.

## ✨ Features

- 💾 Persistent conversation history in MongoDB
- 🛠️ Function calling (calculator, time, weather, search)
- 🔄 Automatic retries with exponential backoff
- 📊 Session management
- ⚡ Graceful error handling
- 🎯 Uses OpenAI SDK through OpenRouter

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and edit .env
cp .env.example .env
# Add your OPENROUTER_API_KEY and MONGODB_URI

# 3. Test setup
npm test

# 4. Start chatting
npm start
```

## 📝 Requirements

- Node.js 18+
- MongoDB Atlas account (free tier OK)
- OpenRouter API key with credits

## 📖 Commands

- `/help` - Show commands
- `/clear` - Clear conversation
- `/new` - New session
- `/sessions` - List sessions
- `/load <id>` - Load a session
- `/exit` - Quit

## 🛠️ Available Tools

The chatbot can use these built-in functions:

- **get_current_time** - Get time in any timezone
- **calculate** - Perform math calculations
- **get_weather** - Get weather info (simulated)
- **search_web** - Search the web (simulated)

## 📊 Project Structure

```
chatbot/
├── index.js          # Main application
├── database.js       # MongoDB operations
├── openrouter.js     # OpenAI SDK with OpenRouter
├── tools.js          # Function definitions
├── test.js           # Setup tests
└── .env              # Your configuration
```

## 🔧 Configuration

Edit `.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-xxx
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/chatbot
OPENROUTER_MODEL=openai/gpt-3.5-turbo
```

## 🚨 Troubleshooting

**MongoDB connection failed:**
- Check connection string format
- Whitelist your IP in MongoDB Atlas
- Verify username/password

**API errors:**
- Verify API key is correct
- Check account has credits
- Check your usage limit

**Module not found:**
```bash
rm -rf node_modules package-lock.json
npm install
```

## 💡 Tips

1. Manage your usage limit through OpenRouter dashboard
2. Use `/new` for different conversation topics
3. Extend tools in `tools.js` for custom functions

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
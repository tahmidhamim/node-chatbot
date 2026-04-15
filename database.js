import { MongoClient } from 'mongodb';

class DatabaseService {
  constructor(uri) {
    this.uri = uri;
    this.client = null;
    this.db = null;
    this.conversations = null;
  }

  async connect() {
    try {
      this.client = new MongoClient(this.uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      await this.client.db('admin').command({ ping: 1 });
      
      this.db = this.client.db('chatbot');
      this.conversations = this.db.collection('conversations');

      // Create indexes
      await this.conversations.createIndex({ sessionId: 1, timestamp: 1 });

      console.log('✓ Connected to MongoDB Atlas');
      return true;
    } catch (error) {
      console.error('✗ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('✓ Disconnected from MongoDB');
    }
  }

  async saveMessage(sessionId, role, content, toolCalls = null, toolResults = null) {
    try {
      const message = {
        sessionId,
        role,
        content,
        toolCalls,
        toolResults,
        timestamp: new Date(),
      };

      await this.conversations.insertOne(message);
      return message;
    } catch (error) {
      console.error('Error saving message:', error.message);
      throw error;
    }
  }

  async getConversationHistory(sessionId, limit = 20) {
    try {
      const messages = await this.conversations
        .find({ sessionId })
        .sort({ timestamp: 1 })
        .limit(limit)
        .toArray();

      return messages.map(msg => {
        const formatted = {
          role: msg.role,
          content: msg.content,
        };

        if (msg.toolCalls) {
          formatted.tool_calls = msg.toolCalls;
        }

        if (msg.toolResults) {
          formatted.tool_call_id = msg.toolResults.tool_call_id;
          formatted.name = msg.toolResults.name;
        }

        return formatted;
      });
    } catch (error) {
      console.error('Error retrieving conversation history:', error.message);
      throw error;
    }
  }

  async clearConversation(sessionId) {
    try {
      const result = await this.conversations.deleteMany({ sessionId });
      console.log(`✓ Cleared ${result.deletedCount} messages from session`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error clearing conversation:', error.message);
      throw error;
    }
  }

  async listSessions(limit = 10) {
    try {
      const sessions = await this.conversations.aggregate([
        {
          $group: {
            _id: '$sessionId',
            lastMessage: { $max: '$timestamp' },
            messageCount: { $sum: 1 }
          }
        },
        { $sort: { lastMessage: -1 } },
        { $limit: limit }
      ]).toArray();

      return sessions;
    } catch (error) {
      console.error('Error listing sessions:', error.message);
      return [];
    }
  }
}

export default DatabaseService;
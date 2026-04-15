import dotenv from 'dotenv';
import DatabaseService from './database.js';
import OpenRouterService from './openrouter.js';

dotenv.config();

async function testSetup() {
  console.log('🧪 Testing chatbot setup...\n');

  // Test 1: Environment variables
  console.log('1. Checking environment variables...');
  const hasApiKey = !!process.env.OPENROUTER_API_KEY;
  const hasMongoUri = !!process.env.MONGODB_URI;
  
  console.log(`   ✓ OPENROUTER_API_KEY: ${hasApiKey ? 'Found' : '❌ Missing'}`);
  console.log(`   ✓ MONGODB_URI: ${hasMongoUri ? 'Found' : '❌ Missing'}`);
  
  if (!hasApiKey || !hasMongoUri) {
    console.log('\n❌ Missing required environment variables');
    console.log('   Please create a .env file with OPENROUTER_API_KEY and MONGODB_URI');
    process.exit(1);
  }

  // Test 2: MongoDB connection
  console.log('\n2. Testing MongoDB connection...');
  const db = new DatabaseService(process.env.MONGODB_URI);
  
  try {
    await db.connect();
    console.log('   ✓ MongoDB connection successful');
    
    // Test write
    const testSession = 'test_' + Date.now();
    await db.saveMessage(testSession, 'user', 'Test message');
    console.log('   ✓ Can write to database');
    
    // Test read
    const messages = await db.getConversationHistory(testSession);
    console.log(`   ✓ Can read from database (${messages.length} message)`);
    
    // Test delete
    await db.clearConversation(testSession);
    console.log('   ✓ Can delete from database');
    
    await db.disconnect();
  } catch (error) {
    console.log(`   ❌ MongoDB test failed: ${error.message}`);
    process.exit(1);
  }

  // Test 3: OpenRouter API (via OpenAI SDK)
  console.log('\n3. Testing OpenRouter API...');
  const api = new OpenRouterService(
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo'
  );

  try {
    const response = await api.chat([
      { role: 'user', content: 'Say "test successful" if you can read this.' }
    ]);
    
    if (response.success) {
      console.log('   ✓ OpenRouter API connection successful');
      console.log(`   ✓ Response: ${response.data.choices[0].message.content.substring(0, 50)}...`);
    } else {
      console.log(`   ❌ API returned error: ${response.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`   ❌ OpenRouter test failed: ${error.message}`);
    process.exit(1);
  }

  console.log('\n✅ All tests passed! Your chatbot is ready to use.');
  console.log('\nRun "npm start" to start chatting!');
  process.exit(0);
}

testSetup().catch((error) => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
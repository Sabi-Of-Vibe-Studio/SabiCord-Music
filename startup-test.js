/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

async function testBotStartup() {
  console.log('🚀 Testing SabiCord Music Bot Startup...\n');
  
  try {
    console.log('📦 Setting up test environment...');
    process.env.DISCORD_TOKEN = 'test-token-for-startup-test';
    process.env.MONGODB_URL = 'mongodb://localhost:27017/test';
    process.env.MONGODB_NAME = 'sabicord-test';
    process.env.BOT_PREFIX = '!';
    process.env.EMBED_COLOR = '0x00ff00';
    
    console.log('📋 Importing SabiCord client...');
    const { SabiCordMusicClient } = require('./src/core/RefactoredMusicClient');
    
    console.log('🔧 Creating client instance...');
    const client = new SabiCordMusicClient();
    
    console.log('⚙️  Initializing services...');
    await client.initializeServices();
    console.log('✅ Services initialized successfully');
    
    console.log('📊 Checking client status...');
    const isReady = client.isReady();
    console.log(`   Client ready status: ${isReady}`);
    
    console.log('🔍 Verifying service registration...');
    client.registerServices();
    console.log('✅ Services registered successfully');
    
    console.log('🛑 Testing graceful shutdown...');
    await client.shutdown();
    console.log('✅ Graceful shutdown completed');
    
    console.log('\n🎉 STARTUP TEST PASSED!');
    console.log('✨ SabiCord Music Bot can start and shutdown successfully');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ STARTUP TEST FAILED!');
    console.error('🐛 Error details:', error.message);
    console.error('📝 Stack trace:', error.stack);
    
    return false;
  }
}

if (require.main === module) {
  testBotStartup()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testBotStartup };

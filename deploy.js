/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ProductionDeployer {
  constructor() {
    this.projectRoot = __dirname;
    this.distDir = path.join(this.projectRoot, 'dist');
    this.logsDir = path.join(this.projectRoot, 'logs');
  }

  async deploy() {
    console.log('🚀 SabiCord Music Bot - Production Deployment\n');
    
    try {
      await this.validateEnvironment();
      await this.buildProject();
      await this.setupProductionEnvironment();
      await this.runTests();
      await this.startProduction();
      
      console.log('\n🎉 DEPLOYMENT SUCCESSFUL!');
      console.log('✨ SabiCord Music Bot is now running in production mode');
      
    } catch (error) {
      console.error('\n❌ DEPLOYMENT FAILED:', error.message);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating environment...');
    
    if (!fs.existsSync('.env')) {
      console.log('   ⚠️  .env file not found, creating from template...');
      if (fs.existsSync('.env.example')) {
        fs.copyFileSync('.env.example', '.env');
        console.log('   📝 Please edit .env file with your actual configuration');
        console.log('   ⚠️  Deployment paused - configure .env and run again');
        process.exit(0);
      } else {
        throw new Error('.env.example file not found');
      }
    }
    
    const envContent = fs.readFileSync('.env', 'utf8');
    const requiredVars = [
      'DISCORD_TOKEN',
      'MONGODB_URL',
      'MONGODB_NAME'
    ];
    
    const missingVars = requiredVars.filter(varName => {
      const regex = new RegExp(`^${varName}=.+`, 'm');
      return !regex.test(envContent) || envContent.includes(`${varName}=your_`);
    });
    
    if (missingVars.length > 0) {
      throw new Error(`Missing or incomplete environment variables: ${missingVars.join(', ')}`);
    }
    
    console.log('   ✅ Environment validation passed');
  }

  async buildProject() {
    console.log('🔨 Building project...');
    
    console.log('   📦 Installing dependencies...');
    await this.runCommand('npm ci --production=false');
    
    console.log('   🔧 Compiling TypeScript...');
    await this.runCommand('npx tsc -p tsconfig.build.json');
    
    console.log('   📁 Setting up production structure...');
    this.setupProductionStructure();
    
    console.log('   ✅ Build completed successfully');
  }

  setupProductionStructure() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    const dataDir = path.join(this.projectRoot, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.copyFileSync('.env', path.join(this.distDir, '.env'));
    
    if (fs.existsSync('ecosystem.config.js')) {
      fs.copyFileSync('ecosystem.config.js', path.join(this.distDir, 'ecosystem.config.js'));
    }
  }

  async setupProductionEnvironment() {
    console.log('⚙️  Setting up production environment...');
    
    console.log('   🔧 Installing production dependencies...');
    process.chdir(this.distDir);
    await this.runCommand('npm ci --production');
    process.chdir(this.projectRoot);
    
    console.log('   📝 Creating startup scripts...');
    this.createStartupScripts();
    
    console.log('   ✅ Production environment ready');
  }

  createStartupScripts() {
    const startScript = `#!/bin/bash
# SabiCord Music Bot - Production Startup Script

echo "🚀 Starting SabiCord Music Bot..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Start the bot with PM2
cd "${this.distDir}"
pm2 start ecosystem.config.js --env production

echo "✅ SabiCord Music Bot started successfully!"
echo "📊 Use 'pm2 status' to check status"
echo "📋 Use 'pm2 logs sabicord-music-bot' to view logs"
`;

    const stopScript = `#!/bin/bash
# SabiCord Music Bot - Production Stop Script

echo "🛑 Stopping SabiCord Music Bot..."

pm2 stop sabicord-music-bot
pm2 delete sabicord-music-bot

echo "✅ SabiCord Music Bot stopped successfully!"
`;

    fs.writeFileSync('start-production.sh', startScript);
    fs.writeFileSync('stop-production.sh', stopScript);
    
    if (process.platform !== 'win32') {
      fs.chmodSync('start-production.sh', '755');
      fs.chmodSync('stop-production.sh', '755');
    }
  }

  async runTests() {
    console.log('🧪 Running production tests...');
    
    try {
      console.log('   🔍 Running startup test...');
      await this.runCommand('node startup-test.js');
      
      console.log('   📊 Running verification...');
      await this.runCommand('node verify-refactoring.js');
      
      console.log('   ✅ All tests passed');
      
    } catch (error) {
      console.log('   ⚠️  Some tests failed, but continuing deployment...');
      console.log(`   📝 Test error: ${error.message}`);
    }
  }

  async startProduction() {
    console.log('🚀 Starting production deployment...');
    
    const deploymentMethod = process.env.DEPLOYMENT_METHOD || 'pm2';
    
    switch (deploymentMethod) {
      case 'docker':
        await this.deployWithDocker();
        break;
      case 'pm2':
        await this.deployWithPM2();
        break;
      case 'systemd':
        await this.deployWithSystemd();
        break;
      default:
        await this.deployDirect();
    }
  }

  async deployWithDocker() {
    console.log('   🐳 Deploying with Docker...');
    
    await this.runCommand('docker-compose up -d --build');
    
    console.log('   ✅ Docker deployment completed');
    console.log('   📊 Use "docker-compose logs -f" to view logs');
  }

  async deployWithPM2() {
    console.log('   ⚡ Deploying with PM2...');
    
    process.chdir(this.distDir);
    
    try {
      await this.runCommand('pm2 stop sabicord-music-bot');
      await this.runCommand('pm2 delete sabicord-music-bot');
    } catch (error) {
      console.log('   📝 No existing PM2 process found (this is normal for first deployment)');
    }
    
    await this.runCommand('pm2 start ecosystem.config.js --env production');
    await this.runCommand('pm2 save');
    
    process.chdir(this.projectRoot);
    
    console.log('   ✅ PM2 deployment completed');
    console.log('   📊 Use "pm2 status" to check status');
    console.log('   📋 Use "pm2 logs sabicord-music-bot" to view logs');
  }

  async deployWithSystemd() {
    console.log('   🔧 Deploying with systemd...');
    
    const serviceFile = `[Unit]
Description=SabiCord Music Bot
After=network.target

[Service]
Type=simple
User=sabicord
WorkingDirectory=${this.distDir}
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
`;

    fs.writeFileSync('/tmp/sabicord-music-bot.service', serviceFile);
    
    console.log('   📝 Systemd service file created at /tmp/sabicord-music-bot.service');
    console.log('   ⚠️  Manual steps required:');
    console.log('      1. sudo cp /tmp/sabicord-music-bot.service /etc/systemd/system/');
    console.log('      2. sudo systemctl daemon-reload');
    console.log('      3. sudo systemctl enable sabicord-music-bot');
    console.log('      4. sudo systemctl start sabicord-music-bot');
  }

  async deployDirect() {
    console.log('   🔄 Starting direct deployment...');
    
    process.chdir(this.distDir);
    
    console.log('   🚀 Starting SabiCord Music Bot...');
    console.log('   📝 Bot is running in foreground mode');
    console.log('   ⚠️  Press Ctrl+C to stop the bot');
    
    const child = spawn('node', ['index.js'], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    child.on('exit', (code) => {
      console.log(`\n🛑 Bot exited with code ${code}`);
      process.exit(code);
    });
  }

  runCommand(command) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { shell: true, stdio: 'pipe' });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || stdout));
        }
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }
}

if (require.main === module) {
  const deployer = new ProductionDeployer();
  deployer.deploy().catch(console.error);
}

module.exports = { ProductionDeployer };

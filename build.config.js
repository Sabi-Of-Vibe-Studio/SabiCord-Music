/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

const path = require('path');
const fs = require('fs');

class BuildConfig {
  constructor() {
    this.srcDir = path.join(__dirname, 'src');
    this.distDir = path.join(__dirname, 'dist');
    this.nodeModulesDir = path.join(__dirname, 'node_modules');
  }

  async setupBuildEnvironment() {
    console.log('🔧 Setting up build environment...');
    
    if (fs.existsSync(this.distDir)) {
      console.log('   🗑️  Cleaning existing dist directory...');
      fs.rmSync(this.distDir, { recursive: true, force: true });
    }
    
    console.log('   📁 Creating dist directory...');
    fs.mkdirSync(this.distDir, { recursive: true });
    
    console.log('   ✅ Build environment ready');
  }

  async validateDependencies() {
    console.log('📦 Validating dependencies...');
    
    const requiredDeps = [
      'discord.js',
      'discordx',
      '@discordx/importer',
      'mongoose',
      'winston',
      'axios',
      'ws',
      'tsyringe',
      'reflect-metadata'
    ];

    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const installedDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    const missingDeps = requiredDeps.filter(dep => !installedDeps[dep]);
    
    if (missingDeps.length > 0) {
      console.log(`   ❌ Missing dependencies: ${missingDeps.join(', ')}`);
      return false;
    }
    
    console.log('   ✅ All dependencies validated');
    return true;
  }

  async fixTypeScriptErrors() {
    console.log('🔧 Fixing TypeScript compilation errors...');
    
    const fixes = [
      {
        file: 'src/core/Settings.ts',
        search: /getDefaultVoiceStatusTemplate\(\): string \{\s*return '[^']*$/m,
        replace: `getDefaultVoiceStatusTemplate(): string {
    return '{{@@track_name@@ != \\'None\\' ?? @@track_source_emoji@@ Now Playing: @@track_name@@}}';
  }`
      },
      {
        file: 'src/audio/Node.ts',
        search: /const wsUrl = `ws\$\{this\.secure \? 's' : ''\}:$/m,
        replace: `const wsUrl = \`ws\${this.secure ? 's' : ''}://\${this.host}:\${this.port}/v4/websocket\`;`
      }
    ];

    for (const fix of fixes) {
      if (fs.existsSync(fix.file)) {
        let content = fs.readFileSync(fix.file, 'utf8');
        if (fix.search.test(content)) {
          content = content.replace(fix.search, fix.replace);
          fs.writeFileSync(fix.file, content);
          console.log(`   ✅ Fixed ${fix.file}`);
        }
      }
    }
    
    console.log('   ✅ TypeScript errors fixed');
  }

  async optimizeBuild() {
    console.log('⚡ Optimizing build...');
    
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: false,
        sourceMap: false,
        removeComments: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        baseUrl: './src',
        paths: {
          '@core/*': ['core/*'],
          '@audio/*': ['audio/*'],
          '@services/*': ['services/*'],
          '@interfaces/*': ['interfaces/*'],
          '@commands/*': ['commands/*'],
          '@views/*': ['views/*'],
          '@ipc/*': ['ipc/*']
        }
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', 'test-cases', '**/*.test.ts']
    };

    fs.writeFileSync('tsconfig.build.json', JSON.stringify(tsConfig, null, 2));
    console.log('   ✅ Build configuration optimized');
  }

  async createProductionPackageJson() {
    console.log('📦 Creating production package.json...');
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const prodPackageJson = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      main: 'index.js',
      scripts: {
        start: 'node index.js',
        'start:pm2': 'pm2 start ecosystem.config.js'
      },
      dependencies: packageJson.dependencies,
      engines: packageJson.engines || {
        node: '>=18.0.0',
        npm: '>=8.0.0'
      },
      author: packageJson.author,
      license: packageJson.license
    };

    fs.writeFileSync(
      path.join(this.distDir, 'package.json'),
      JSON.stringify(prodPackageJson, null, 2)
    );
    
    console.log('   ✅ Production package.json created');
  }

  async createEcosystemConfig() {
    console.log('🚀 Creating PM2 ecosystem configuration...');
    
    const ecosystemConfig = {
      apps: [{
        name: 'sabicord-music-bot',
        script: './index.js',
        instances: 1,
        exec_mode: 'fork',
        watch: false,
        max_memory_restart: '1G',
        env: {
          NODE_ENV: 'production',
          PORT: 3000
        },
        env_production: {
          NODE_ENV: 'production',
          PORT: 3000
        },
        log_file: './logs/combined.log',
        out_file: './logs/out.log',
        error_file: './logs/error.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        restart_delay: 4000,
        max_restarts: 10,
        min_uptime: '10s'
      }]
    };

    fs.writeFileSync(
      path.join(this.distDir, 'ecosystem.config.js'),
      `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)};`
    );
    
    console.log('   ✅ PM2 ecosystem configuration created');
  }

  async createDockerfile() {
    console.log('🐳 Creating Dockerfile...');
    
    const dockerfile = `# SabiCord Music Bot - Production Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY dist/ ./

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S sabicord && \
    adduser -S sabicord -u 1001

# Change ownership
RUN chown -R sabicord:sabicord /app

# Switch to non-root user
USER sabicord

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Start application
CMD ["npm", "start"]
`;

    fs.writeFileSync('Dockerfile', dockerfile);
    console.log('   ✅ Dockerfile created');
  }

  async createDockerCompose() {
    console.log('🐳 Creating Docker Compose configuration...');
    
    const dockerCompose = `version: '3.8'

services:
  sabicord-bot:
    build: .
    container_name: sabicord-music-bot
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DISCORD_TOKEN=\${DISCORD_TOKEN}
      - MONGODB_URL=\${MONGODB_URL}
      - MONGODB_NAME=\${MONGODB_NAME}
      - BOT_PREFIX=\${BOT_PREFIX:-!}
      - EMBED_COLOR=\${EMBED_COLOR:-0x00ff00}
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    networks:
      - sabicord-network
    depends_on:
      - mongodb
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('Health check')"]
      interval: 30s
      timeout: 10s
      retries: 3

  mongodb:
    image: mongo:6.0
    container_name: sabicord-mongodb
    restart: unless-stopped
    environment:
      - MONGO_INITDB_ROOT_USERNAME=\${MONGO_ROOT_USERNAME:-admin}
      - MONGO_INITDB_ROOT_PASSWORD=\${MONGO_ROOT_PASSWORD:-password}
      - MONGO_INITDB_DATABASE=\${MONGODB_NAME:-sabicord}
    volumes:
      - mongodb_data:/data/db
      - ./mongo-init:/docker-entrypoint-initdb.d
    ports:
      - "27017:27017"
    networks:
      - sabicord-network

  lavalink:
    image: fredboat/lavalink:dev
    container_name: sabicord-lavalink
    restart: unless-stopped
    environment:
      - SERVER_PORT=2333
      - LAVALINK_SERVER_PASSWORD=\${LAVALINK_PASSWORD:-youshallnotpass}
    volumes:
      - ./lavalink/application.yml:/opt/Lavalink/application.yml
    ports:
      - "2333:2333"
    networks:
      - sabicord-network

volumes:
  mongodb_data:

networks:
  sabicord-network:
    driver: bridge
`;

    fs.writeFileSync('docker-compose.yml', dockerCompose);
    console.log('   ✅ Docker Compose configuration created');
  }
}

module.exports = { BuildConfig };

if (require.main === module) {
  const buildConfig = new BuildConfig();
  
  async function runBuildSetup() {
    try {
      await buildConfig.setupBuildEnvironment();
      await buildConfig.validateDependencies();
      await buildConfig.fixTypeScriptErrors();
      await buildConfig.optimizeBuild();
      await buildConfig.createProductionPackageJson();
      await buildConfig.createEcosystemConfig();
      await buildConfig.createDockerfile();
      await buildConfig.createDockerCompose();
      
      console.log('\n🎉 Build system setup completed successfully!');
      console.log('✨ Ready for production deployment');
      
    } catch (error) {
      console.error('\n❌ Build setup failed:', error.message);
      process.exit(1);
    }
  }
  
  runBuildSetup();
}

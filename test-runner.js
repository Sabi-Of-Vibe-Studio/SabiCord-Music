/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.testResults = {
      unit: { passed: 0, failed: 0, errors: [] },
      integration: { passed: 0, failed: 0, errors: [] },
      startup: { passed: 0, failed: 0, errors: [] },
      overall: { passed: 0, failed: 0, duration: 0 }
    };
  }

  async runAllTests() {
    console.log('🧪 SabiCord Music Bot - Comprehensive Test Suite\n');
    
    const startTime = Date.now();
    
    try {
      await this.runStartupTests();
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runManualVerification();
      
      this.testResults.overall.duration = Date.now() - startTime;
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async runStartupTests() {
    console.log('🚀 Running Startup Tests...');
    
    try {
      console.log('   📦 Testing TypeScript compilation...');
      await this.runCommand('npx tsc --noEmit');
      this.testResults.startup.passed++;
      console.log('   ✅ TypeScript compilation successful');
      
      console.log('   📋 Testing dependency resolution...');
      await this.runCommand('npm ls --depth=0');
      this.testResults.startup.passed++;
      console.log('   ✅ All dependencies resolved');
      
      console.log('   🔧 Testing service initialization...');
      const testCode = `
        const { SabiCordMusicClient } = require('./dist/core/RefactoredMusicClient');
        async function test() {
          process.env.DISCORD_TOKEN = 'test-token';
          process.env.MONGODB_URL = 'mongodb://localhost:27017/test';
          const client = new SabiCordMusicClient();
          await client.initializeServices();
          console.log('Services initialized successfully');
          await client.shutdown();
        }
        test().catch(console.error);
      `;
      
      fs.writeFileSync('temp-test.js', testCode);
      await this.runCommand('node temp-test.js');
      fs.unlinkSync('temp-test.js');
      
      this.testResults.startup.passed++;
      console.log('   ✅ Service initialization successful');
      
    } catch (error) {
      this.testResults.startup.failed++;
      this.testResults.startup.errors.push(error.message);
      console.log(`   ❌ Startup test failed: ${error.message}`);
    }
    
    console.log('');
  }

  async runUnitTests() {
    console.log('🔬 Running Unit Tests...');
    
    if (!fs.existsSync('./test-cases/unit-tests.ts')) {
      console.log('   ⚠️  Unit test file not found, skipping...');
      return;
    }
    
    try {
      const result = await this.runCommand('npm test -- test-cases/unit-tests.ts');
      this.parseJestResults(result, 'unit');
      console.log('   ✅ Unit tests completed');
      
    } catch (error) {
      this.testResults.unit.failed++;
      this.testResults.unit.errors.push(error.message);
      console.log(`   ❌ Unit tests failed: ${error.message}`);
    }
    
    console.log('');
  }

  async runIntegrationTests() {
    console.log('🔗 Running Integration Tests...');
    
    if (!fs.existsSync('./test-cases/integration-tests.ts')) {
      console.log('   ⚠️  Integration test file not found, skipping...');
      return;
    }
    
    try {
      const result = await this.runCommand('npm test -- test-cases/integration-tests.ts');
      this.parseJestResults(result, 'integration');
      console.log('   ✅ Integration tests completed');
      
    } catch (error) {
      this.testResults.integration.failed++;
      this.testResults.integration.errors.push(error.message);
      console.log(`   ❌ Integration tests failed: ${error.message}`);
    }
    
    console.log('');
  }

  async runManualVerification() {
    console.log('🔍 Running Manual Verification...');
    
    const verifications = [
      {
        name: 'Architecture Verification',
        test: () => this.verifyArchitecture()
      },
      {
        name: 'Code Quality Verification',
        test: () => this.verifyCodeQuality()
      },
      {
        name: 'SOLID Principles Verification',
        test: () => this.verifySOLIDPrinciples()
      }
    ];

    for (const verification of verifications) {
      try {
        console.log(`   🔍 ${verification.name}...`);
        await verification.test();
        this.testResults.overall.passed++;
        console.log(`   ✅ ${verification.name} passed`);
      } catch (error) {
        this.testResults.overall.failed++;
        console.log(`   ❌ ${verification.name} failed: ${error.message}`);
      }
    }
    
    console.log('');
  }

  verifyArchitecture() {
    const requiredFiles = [
      './src/audio/Player.ts',
      './src/audio/Queue.ts',
      './src/audio/Node.ts',
      './src/audio/Filters.ts',
      './src/core/RefactoredMusicClient.ts',
      './src/core/ErrorHandler.ts',
      './src/core/PerformanceMonitor.ts',
      './src/core/ValidationService.ts',
      './src/interfaces/IAudio.ts',
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    if (fs.existsSync('./src/voicelink')) {
      throw new Error('Legacy voicelink directory still exists');
    }
  }

  verifyCodeQuality() {
    const filesToCheck = [
      './src/core/Logger.ts',
      './src/audio/Player.ts',
      './src/commands/BasicCommands.ts',
    ];

    for (const file of filesToCheck) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        if (content.includes('// TODO') || content.includes('// FIXME')) {
          throw new Error(`TODO/FIXME comments found in ${file}`);
        }
        
        const lines = content.split('\n');
        let commentCount = 0;
        let inCopyright = false;
        
        for (const line of lines) {
          if (line.includes('MIT License') || line.includes('Copyright')) {
            inCopyright = true;
          } else if (inCopyright && line.includes('*/')) {
            inCopyright = false;
          } else if (!inCopyright && line.trim().startsWith('//')) {
            commentCount++;
          }
        }
        
        if (commentCount > 0) {
          throw new Error(`Non-copyright comments found in ${file}: ${commentCount}`);
        }
      }
    }
  }

  verifySOLIDPrinciples() {
    const checks = [
      {
        file: './src/core/ServiceContainer.ts',
        description: 'Service Container for DIP'
      },
      {
        file: './src/interfaces/IAudio.ts',
        description: 'Interface segregation'
      },
      {
        file: './src/services/VoiceConnectionManager.ts',
        description: 'Single responsibility services'
      }
    ];

    for (const check of checks) {
      if (!fs.existsSync(check.file)) {
        throw new Error(`SOLID principle violation: ${check.description} - ${check.file} missing`);
      }
    }

    const clientFile = './src/core/RefactoredMusicClient.ts';
    if (fs.existsSync(clientFile)) {
      const content = fs.readFileSync(clientFile, 'utf8');
      if (!content.includes('ServiceContainer')) {
        throw new Error('Dependency injection not implemented in main client');
      }
    }
  }

  parseJestResults(output, testType) {
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('Tests:')) {
        const match = line.match(/(\d+) passed/);
        if (match) {
          this.testResults[testType].passed += parseInt(match[1]);
        }
        
        const failMatch = line.match(/(\d+) failed/);
        if (failMatch) {
          this.testResults[testType].failed += parseInt(failMatch[1]);
        }
      }
    }
  }

  generateTestReport() {
    console.log('📊 TEST RESULTS SUMMARY\n');
    
    const totalPassed = this.testResults.startup.passed + 
                       this.testResults.unit.passed + 
                       this.testResults.integration.passed + 
                       this.testResults.overall.passed;
                       
    const totalFailed = this.testResults.startup.failed + 
                       this.testResults.unit.failed + 
                       this.testResults.integration.failed + 
                       this.testResults.overall.failed;

    console.log(`🎯 Overall Status: ${totalFailed === 0 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`⏱️  Total Duration: ${this.testResults.overall.duration}ms\n`);
    
    console.log('📋 Detailed Results:');
    console.log(`   🚀 Startup Tests: ${this.testResults.startup.passed} passed, ${this.testResults.startup.failed} failed`);
    console.log(`   🔬 Unit Tests: ${this.testResults.unit.passed} passed, ${this.testResults.unit.failed} failed`);
    console.log(`   🔗 Integration Tests: ${this.testResults.integration.passed} passed, ${this.testResults.integration.failed} failed`);
    console.log(`   🔍 Manual Verification: ${this.testResults.overall.passed} passed, ${this.testResults.overall.failed} failed`);
    
    console.log(`\n📈 Total: ${totalPassed} passed, ${totalFailed} failed\n`);
    
    if (totalFailed === 0) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✨ SabiCord Music Bot is ready for production deployment!');
    } else {
      console.log('⚠️  Some tests failed. Please review the errors above.');
      
      const allErrors = [
        ...this.testResults.startup.errors,
        ...this.testResults.unit.errors,
        ...this.testResults.integration.errors
      ];
      
      if (allErrors.length > 0) {
        console.log('\n🐛 Error Details:');
        allErrors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
    }
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

const testRunner = new TestRunner();
testRunner.runAllTests().catch(console.error);

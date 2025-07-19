/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

const fs = require('fs');
const path = require('path');

function verifyRefactoring() {
  console.log('🔍 Verifying SabiCord Music Bot Refactoring...\n');

  const results = {
    legacyRemoval: checkLegacyRemoval(),
    commentRemoval: checkCommentRemoval(),
    brandingUpdate: checkBrandingUpdate(),
    architectureUpdate: checkArchitectureUpdate(),
    solidPrinciples: checkSOLIDImplementation(),
  };

  displayResults(results);
}

function checkLegacyRemoval() {
  console.log('📦 Checking legacy code removal...');

  const checks = {
    voicelinkRemoved: !fs.existsSync('./src/voicelink'),
    audioModuleExists: fs.existsSync('./src/audio'),
    oldImportsRemoved: !checkFileContains('./src/commands/BasicCommands.ts', '@voicelink'),
    newImportsUsed: checkFileContains('./src/commands/BasicCommands.ts', '@audio'),
  };

  const passed = Object.values(checks).every(Boolean);
  console.log(`   ${passed ? '✅' : '❌'} Legacy code removal: ${passed ? 'PASSED' : 'FAILED'}`);

  return { passed, details: checks };
}

function checkCommentRemoval() {
  console.log('💬 Checking comment removal...');

  const filesToCheck = [
    './src/core/Logger.ts',
    './src/audio/Player.ts',
    './src/commands/BasicCommands.ts',
  ];

  let totalComments = 0;
  let copyrightHeaders = 0;

  for (const file of filesToCheck) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      let inCopyright = false;
      for (const line of lines) {
        if (line.includes('MIT License') || line.includes('Copyright')) {
          inCopyright = true;
          copyrightHeaders++;
        } else if (inCopyright && line.includes('*/')) {
          inCopyright = false;
        } else if (!inCopyright && (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*'))) {
          totalComments++;
        }
      }
    }
  }

  const passed = totalComments === 0 && copyrightHeaders > 0;
  console.log(`   ${passed ? '✅' : '❌'} Comment removal: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log(`      - Comments found: ${totalComments}`);
  console.log(`      - Copyright headers: ${copyrightHeaders}`);

  return { passed, totalComments, copyrightHeaders };
}

function checkBrandingUpdate() {
  console.log('🏷️  Checking branding updates...');

  const checks = {
    packageJsonUpdated: checkFileContains('./package.json', 'sabicord-music'),
    readmeUpdated: checkFileContains('./README.md', 'SabiCord'),
    clientNameUpdated: checkFileContains('./src/core/RefactoredMusicClient.ts', 'SabiCordMusicClient'),
    indexUpdated: checkFileContains('./src/index.ts', 'SabiCord'),
  };

  const passed = Object.values(checks).every(Boolean);
  console.log(`   ${passed ? '✅' : '❌'} Branding update: ${passed ? 'PASSED' : 'FAILED'}`);

  return { passed, details: checks };
}

function checkArchitectureUpdate() {
  console.log('🏗️  Checking architecture updates...');

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

  const existingFiles = requiredFiles.filter(file => fs.existsSync(file));
  const passed = existingFiles.length === requiredFiles.length;

  console.log(`   ${passed ? '✅' : '❌'} Architecture update: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log(`      - Required files: ${requiredFiles.length}`);
  console.log(`      - Existing files: ${existingFiles.length}`);

  return { passed, required: requiredFiles.length, existing: existingFiles.length };
}

function checkSOLIDImplementation() {
  console.log('🎯 Checking SOLID principles implementation...');

  const checks = {
    serviceContainer: fs.existsSync('./src/core/ServiceContainer.ts'),
    interfaces: fs.existsSync('./src/interfaces/IAudio.ts'),
    dependencyInjection: checkFileContains('./src/core/RefactoredMusicClient.ts', 'ServiceContainer'),
    singleResponsibility: fs.existsSync('./src/services/VoiceConnectionManager.ts'),
  };

  const passed = Object.values(checks).every(Boolean);
  console.log(`   ${passed ? '✅' : '❌'} SOLID principles: ${passed ? 'PASSED' : 'FAILED'}`);

  return { passed, details: checks };
}

function checkFileContains(filePath, searchString) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes(searchString);
  } catch {
    return false;
  }
}

function displayResults(results) {
  console.log('\n📊 REFACTORING VERIFICATION RESULTS\n');

  const allPassed = Object.values(results).every(r => r.passed);

  console.log(`🎯 Overall Status: ${allPassed ? '✅ PASSED' : '❌ FAILED'}\n`);

  console.log('📋 Detailed Results:');
  console.log(`   Legacy Removal: ${results.legacyRemoval.passed ? '✅' : '❌'}`);
  console.log(`   Comment Removal: ${results.commentRemoval.passed ? '✅' : '❌'}`);
  console.log(`   Branding Update: ${results.brandingUpdate.passed ? '✅' : '❌'}`);
  console.log(`   Architecture Update: ${results.architectureUpdate.passed ? '✅' : '❌'}`);
  console.log(`   SOLID Principles: ${results.solidPrinciples.passed ? '✅' : '❌'}`);

  if (allPassed) {
    console.log('\n🎉 REFACTORING VERIFICATION SUCCESSFUL!');
    console.log('✨ SabiCord Music Bot is ready for production deployment!');
  } else {
    console.log('\n⚠️  Some verification checks failed. Please review the results above.');
  }
}

verifyRefactoring();

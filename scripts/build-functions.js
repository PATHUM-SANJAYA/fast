import { rm, mkdir, writeFile, cp } from 'fs/promises';
import { execSync } from 'child_process';
import { join } from 'path';

async function buildFunctions() {
  try {
    // Clean up existing functions
    await rm('netlify/functions', { recursive: true, force: true });

    // Compile TypeScript
    execSync('tsc -p tsconfig.functions.json', { stdio: 'inherit' });

    // Create functions directory
    await mkdir('netlify/functions/api', { recursive: true });

    // Copy function files
    await cp('src/functions/api', 'netlify/functions/api', { recursive: true });

    // Create package.json for functions
    const functionPackageJson = {
      name: 'functions',
      version: '1.0.0',
      dependencies: {
        '@netlify/functions': '^1.5.0',
        'ytdl-core': '^4.11.5'
      }
    };

    await writeFile(
      'netlify/functions/package.json',
      JSON.stringify(functionPackageJson, null, 2)
    );

    // Install dependencies
    execSync('npm install --prefix netlify/functions', { stdio: 'inherit' });

    // Copy required node_modules
    const modulesToCopy = ['@netlify', 'ytdl-core', '@types'];
    for (const mod of modulesToCopy) {
      await cp(
        join('node_modules', mod),
        join('netlify/functions/node_modules', mod),
        { recursive: true }
      );
    }

    console.log('Functions build completed successfully!');
  } catch (error) {
    console.error('Error building functions:', error);
    process.exit(1);
  }
}

buildFunctions(); 
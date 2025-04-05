import { execSync } from 'child_process';
import { mkdirSync } from 'fs';
import { join } from 'path';

const sourceDir = 'netlify/functions';
const destDir = 'netlify/functions';

// Create destination directory if it doesn't exist
mkdirSync(destDir, { recursive: true });

// Copy functions using platform-specific commands
if (process.platform === 'win32') {
  // Windows
  execSync(`xcopy /E /I /Y "${sourceDir}" "${destDir}"`);
} else {
  // Linux/Mac
  execSync(`cp -R "${sourceDir}"/* "${destDir}/"`);
} 
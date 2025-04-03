import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
try {
  await fs.access(dataDir);
} catch {
  await fs.mkdir(dataDir);
}

// Copy CSV file from old project
const oldCsvPath = path.join(__dirname, '..', '..', 'youtube-analytics-dashboard OLD', 'data', 'videos.csv');
const newCsvPath = path.join(dataDir, 'videos.csv');

try {
  await fs.copyFile(oldCsvPath, newCsvPath);
  console.log('Successfully copied videos.csv to new project');
} catch (error) {
  console.error('Error copying CSV file:', error);
  process.exit(1);
} 
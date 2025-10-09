#!/usr/bin/env node
import * as fs from 'node:fs/promises';

console.log('\nMigrate folder structure of ./data/delta-files');

const deltaFolder = '/data/app/data/delta-files';
const files = await fs.readdir(deltaFolder);
const jsonFiles = files.filter((file) => file.endsWith('.json'));
if (jsonFiles.length) {
  console.log(`Going to move ${jsonFiles.length} files to subfolders`);
  let i = 0;
  for (const file of jsonFiles) {
    const day = file.substring(0, 'YYYY-mm-dd'.length);
    await fs.mkdir(`${deltaFolder}/${day}`, { recursive: true });
    await fs.rename(`${deltaFolder}/${file}`, `${deltaFolder}/${day}/${file}`)
    i++;
    if (i % 10_000 == 0) {
      console.log(`Moving to subfolders... (${i}/${jsonFiles.length})`);
    }
  }
  console.log('Finished moving delta files to subfolders');
} else {
  console.log('No JSON files found in ./data/delta-files that need to be moved');
}

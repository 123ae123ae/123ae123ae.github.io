import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const source = fileURLToPath(new URL('../pulum/', import.meta.url));
const destination = fileURLToPath(new URL('../dist/pulum/', import.meta.url));
if (!existsSync(source)) throw new Error('Missing Pulum public pages');
mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true });
console.log('Preserved Pulum pages in dist/pulum/');

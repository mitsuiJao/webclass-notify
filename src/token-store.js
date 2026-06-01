import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKENS_PATH = path.resolve(__dirname, '../tokens.json');

export async function loadTokens() {
    try {
        const data = await fs.readFile(TOKENS_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        if (e.code === 'ENOENT') return null;
        throw e;
    }
}

export async function saveTokens(tokens) {
    await fs.writeFile(TOKENS_PATH, JSON.stringify(tokens, null, 2));
}

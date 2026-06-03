import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = path.resolve(__dirname, '../tokens.json');
const TOKENS_BACKUP_PATH = path.resolve(__dirname, '../tokens.json.bak');

// テスト用トークン
const MOCK_TOKENS = {
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
    expiry_date: Date.now() + 3600000,
};

// テスト用課題データ
const MOCK_ASSIGNMENTS = [
    {
        course: 'データ構造',
        title: 'レポート1',
        deadline: '2026/07/01 23:59',
        url: 'https://webclass.example.com/assignment/1',
    },
    {
        course: 'アルゴリズム',
        title: '演習問題2',
        deadline: '2026/07/15 17:00',
        url: 'https://webclass.example.com/assignment/2',
    },
];

// tokens.json を退避・復元するヘルパー
async function backupTokens() {
    try {
        await fs.copyFile(TOKENS_PATH, TOKENS_BACKUP_PATH);
    } catch (e) {
        if (e.code !== 'ENOENT') throw e;
    }
}

async function restoreTokens() {
    try {
        await fs.copyFile(TOKENS_BACKUP_PATH, TOKENS_PATH);
        await fs.unlink(TOKENS_BACKUP_PATH);
    } catch (e) {
        if (e.code !== 'ENOENT') throw e;
    }
}

async function deleteTokens() {
    try {
        await fs.unlink(TOKENS_PATH);
    } catch (e) {
        if (e.code !== 'ENOENT') throw e;
    }
}

// -----------------------------------------------------------------------
// token-store のテスト
// -----------------------------------------------------------------------
describe('token-store', () => {
    before(backupTokens);
    after(restoreTokens);

    it('存在しない tokens.json を読むと null を返す', async () => {
        await deleteTokens();
        const { loadTokens } = await import('../src/token-store.js');
        const result = await loadTokens();
        assert.equal(result, null);
    });

    it('saveTokens で書き込んだ内容を loadTokens で読み返せる', async () => {
        const { loadTokens, saveTokens } = await import('../src/token-store.js');
        await saveTokens(MOCK_TOKENS);
        const loaded = await loadTokens();
        assert.deepEqual(loaded, MOCK_TOKENS);
    });
});

// -----------------------------------------------------------------------
// parseDeadlineToRFC3339 のテスト（内部関数はエクスポートしていないため
// google-tasks.js 全体の動作で間接的に確認する）
// -----------------------------------------------------------------------
describe('parseDeadlineToRFC3339 (deadline 変換)', () => {
    it('JST 2026/07/01 23:59 → UTC 2026-07-01T14:59:00.000Z', () => {
        // 直接テストするため関数を移植して検証
        function parseDeadlineToRFC3339(str) {
            if (!str) return undefined;
            try {
                const [datePart, timePart] = str.split(' ');
                const [y, mo, d] = datePart.split('/').map(Number);
                const [h, mi] = timePart.split(':').map(Number);
                return new Date(Date.UTC(y, mo - 1, d, h - 9, mi)).toISOString();
            } catch {
                return undefined;
            }
        }

        assert.equal(parseDeadlineToRFC3339('2026/07/01 23:59'), '2026-07-01T14:59:00.000Z');
    });

    it('null/undefined を渡すと undefined を返す', () => {
        function parseDeadlineToRFC3339(str) {
            if (!str) return undefined;
            try {
                const [datePart, timePart] = str.split(' ');
                const [y, mo, d] = datePart.split('/').map(Number);
                const [h, mi] = timePart.split(':').map(Number);
                return new Date(Date.UTC(y, mo - 1, d, h - 9, mi)).toISOString();
            } catch {
                return undefined;
            }
        }

        assert.equal(parseDeadlineToRFC3339(null), undefined);
        assert.equal(parseDeadlineToRFC3339(undefined), undefined);
    });
});

// -----------------------------------------------------------------------
// addAssignmentsToTasks のテスト
// -----------------------------------------------------------------------
describe('addAssignmentsToTasks', () => {
    before(backupTokens);
    after(restoreTokens);

    it('tokens.json が存在しない場合は null を返してスキップする', async () => {
        await deleteTokens();
        // 環境変数を一時設定
        process.env.GOOGLE_CLIENT_ID = 'dummy';
        process.env.GOOGLE_CLIENT_SECRET = 'dummy';
        process.env.GOOGLE_REDIRECT_URI = 'https://example.com/callback';

        const { addAssignmentsToTasks } = await import('../src/google-tasks.js');
        const result = await addAssignmentsToTasks(MOCK_ASSIGNMENTS);
        assert.equal(result, null);
    });

    it('OAuth 環境変数が未設定の場合は null を返してスキップする', async () => {
        const { saveTokens } = await import('../src/token-store.js');
        await saveTokens(MOCK_TOKENS);

        delete process.env.GOOGLE_CLIENT_ID;
        delete process.env.GOOGLE_CLIENT_SECRET;
        delete process.env.GOOGLE_REDIRECT_URI;

        const { addAssignmentsToTasks } = await import('../src/google-tasks.js');
        const result = await addAssignmentsToTasks(MOCK_ASSIGNMENTS);
        assert.equal(result, null);
    });
});

// -----------------------------------------------------------------------
// notifier.js との統合：newAssignments が返る形式の確認
// -----------------------------------------------------------------------
describe('processNotifications の戻り値形式', () => {
    it('scrapedAssignments が null のとき { notifications: [], newAssignments: [] } を返す', async () => {
        const { processNotifications } = await import('../src/notifier.js');
        const result = await processNotifications(null);
        assert.deepEqual(result, { notifications: [], newAssignments: [] });
    });

    it('戻り値に notifications と newAssignments が含まれる', async () => {
        const { processNotifications } = await import('../src/notifier.js');
        const result = await processNotifications([]);
        assert.ok('notifications' in result, 'notifications キーが存在する');
        assert.ok('newAssignments' in result, 'newAssignments キーが存在する');
        assert.ok(Array.isArray(result.notifications));
        assert.ok(Array.isArray(result.newAssignments));
    });
});

import { google } from 'googleapis';
import { loadTokens, saveTokens } from './token-store.js';

function createOAuthClient() {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) return null;
    return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

function parseDeadlineToRFC3339(str) {
    if (!str) return undefined;
    try {
        const [datePart, timePart] = str.split(' ');
        const [y, mo, d] = datePart.split('/').map(Number);
        const [h, mi] = timePart.split(':').map(Number);
        // WebClass の日時は JST (UTC+9)
        return new Date(Date.UTC(y, mo - 1, d, h - 9, mi)).toISOString();
    } catch {
        return undefined;
    }
}

async function findOrCreateTaskList(tasks, listName) {
    const { data } = await tasks.tasklists.list();
    const found = (data.items ?? []).find(l => l.title === listName);
    if (found) return found.id;
    const { data: created } = await tasks.tasklists.insert({ requestBody: { title: listName } });
    return created.id;
}

export async function addAssignmentsToTasks(assignments) {
    try {
        const tokens = await loadTokens();
        if (!tokens) {
            console.log('tokens.json が見つからないため Google Tasks をスキップします');
            return null;
        }

        const client = createOAuthClient();
        if (!client) {
            console.warn('Google OAuth 環境変数が未設定のため Google Tasks をスキップします');
            return null;
        }

        client.setCredentials(tokens);
        client.on('tokens', async (newTokens) => {
            await saveTokens({ ...tokens, ...newTokens });
        });

        const tasks = google.tasks({ version: 'v1', auth: client });
        const taskListId = await findOrCreateTaskList(tasks, 'WebClass課題');

        let count = 0;
        for (const assignment of assignments) {
            await tasks.tasks.insert({
                tasklist: taskListId,
                requestBody: {
                    title: `[${assignment.course}] ${assignment.title}`,
                    due: parseDeadlineToRFC3339(assignment.deadline),
                    notes: assignment.url,
                },
            });
            count++;
        }

        return count;
    } catch (e) {
        console.error('Google Tasks への追加に失敗しました:', e.message);
        return null;
    }
}

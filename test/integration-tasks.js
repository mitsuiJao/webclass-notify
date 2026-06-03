import { google } from 'googleapis';
import { loadTokens } from '../src/token-store.js';
import { addAssignmentsToTasks } from '../src/google-tasks.js';

const TEST_ASSIGNMENTS = [
    {
        course: '[テスト]データ構造',
        title: '統合テスト用タスク',
        deadline: '2026/12/31 23:59',
        url: 'https://example.com/test',
    },
];

async function cleanup(taskListId) {
    const tokens = await loadTokens();
    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
    );
    client.setCredentials(tokens);
    const tasks = google.tasks({ version: 'v1', auth: client });

    const { data } = await tasks.tasks.list({ tasklist: taskListId });
    const testTasks = (data.items ?? []).filter(t => t.title?.includes('[テスト]'));
    for (const task of testTasks) {
        await tasks.tasks.delete({ tasklist: taskListId, task: task.id });
    }
    return testTasks.length;
}

async function getTaskListId() {
    const tokens = await loadTokens();
    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
    );
    client.setCredentials(tokens);
    const tasks = google.tasks({ version: 'v1', auth: client });
    const { data } = await tasks.tasklists.list();
    return (data.items ?? []).find(l => l.title === 'WebClass課題')?.id;
}

async function run() {
    console.log('=== Google Tasks 統合テスト ===\n');

    // 前提確認
    const tokens = await loadTokens();
    if (!tokens) {
        console.error('❌ tokens.json が存在しません。先に認証を完了してください。');
        process.exit(1);
    }
    console.log('✔ tokens.json 確認');

    // タスク追加
    console.log(`\nテスト課題を追加中: "${TEST_ASSIGNMENTS[0].title}"`);
    const count = await addAssignmentsToTasks(TEST_ASSIGNMENTS);
    if (count === null) {
        console.error('❌ addAssignmentsToTasks が null を返しました（環境変数または認証を確認）');
        process.exit(1);
    }
    console.log(`✔ ${count} 件追加成功`);

    // 追加されたか確認
    const taskListId = await getTaskListId();
    if (!taskListId) {
        console.error('❌ "WebClass課題" リストが見つかりません');
        process.exit(1);
    }

    const tokens2 = await loadTokens();
    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
    );
    client.setCredentials(tokens2);
    const tasksApi = google.tasks({ version: 'v1', auth: client });
    const { data } = await tasksApi.tasks.list({ tasklist: taskListId });
    const found = (data.items ?? []).find(t => t.title?.includes('[テスト]'));

    if (!found) {
        console.error('❌ 追加したタスクが Tasks API から確認できません');
        process.exit(1);
    }
    console.log(`✔ Tasks API で確認: "${found.title}" (due: ${found.due ?? 'なし'})`);

    // クリーンアップ
    const deleted = await cleanup(taskListId);
    console.log(`✔ テストタスク ${deleted} 件を削除しました`);

    console.log('\n✅ 全テスト通過');
}

run().catch(e => {
    console.error('❌ 予期しないエラー:', e.message);
    process.exit(1);
});

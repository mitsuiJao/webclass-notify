import express from 'express';
import { google } from 'googleapis';
import { saveTokens } from './token-store.js';

const PORT = process.env.PORT || 3000;

function createOAuthClient() {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
        throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI が未設定です');
    }
    return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

const app = express();
const oAuth2Client = createOAuthClient();

app.get('/auth', (req, res) => {
    const url = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/tasks'],
    });
    res.redirect(url);
});

app.get('/callback', async (req, res) => {
    const { code, error } = req.query;
    if (error) {
        console.error('OAuth エラー:', error);
        res.status(400).send(`認証に失敗しました: ${error}`);
        return;
    }
    try {
        const { tokens } = await oAuth2Client.getToken(code);
        await saveTokens(tokens);
        console.log('tokens.json を保存しました');
        res.send('<h2>認証が完了しました。このタブを閉じてください。</h2>');
    } catch (e) {
        console.error('トークン取得に失敗しました:', e.message);
        res.status(500).send('トークン取得に失敗しました');
    }
});

app.listen(PORT, () => {
    console.log(`OAuth サーバーを起動しました: http://localhost:${PORT}`);
    console.log(`認証 URL: ${process.env.GOOGLE_REDIRECT_URI?.replace('/callback', '/auth') ?? `http://localhost:${PORT}/auth`}`);
});

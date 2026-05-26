## overview

**AIと作成**

WebClassから取得した課題を任意のTeamsチャネルで通知します。
主に高専の人向け

1. WebClassスクレイピングで課題を取得 & Microsoftアカウントログイン
2. 整形してTeams Webhookへ送信
3. teamsに通知が行く

簡単にこんな流れです。

## env
- Ubuntu 22.04.5 LTS
- Node v22.15.0
    - pupperteer 24.34.0


## setup
0. ワークフローの作成
1. Webhook URLの取得
2. 環境構築
3. OTP認証
4. 確認

0が結構くせもので、Microsoftは組織が強いのでもしかしたら登録できない可能性は高いです。高専機構ではいけるかも

あと5は必ずMFAコードを用いたログイン形式にしておくこと


### 0.ワークフローの作成
送りたいチャネルの右にある3つの点 > ワークフロー

![alt text](img/image1.png)

\> 自分のメールをチャネルに転送する

![alt text](img/image2.png)

\> 次へ （ここちょっと時間かかる） 

![alt text](img/image3.png)

チームとチャネル適当に選択して ワークフローを追加する

![alt text](img/image4.png)

ここまで来たらオッケー

![alt text](img/image5.png)


組織で制限されてたらここまで来れない、ワークフロー作れなそうなら諦める


### 1.Webhook URLの取得

最初の画像のところにあるWebhook URLを取得し、コピーしておく

Webhookの受信設定は必要に応じて制限してください

![alt text](img/image6.png)

### 2.環境構築

パッケージをインストールします。aptを使ってます。

```
sudo apt-get install -y \
    libatk1.0-0 libatk-bridge2.0-0 libcups2 libxss1 \
    libgtk-3-0 libnss3 libasound2 libgbm1 \
    libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libpango-1.0-0
```


インストールができたら、このリポジトリをクローンします

node環境を整えます

```bash
$ npm install
```

.envの作成
```bash
cat << EOF > .env
USER_ID='{your_ID}'
PASSWORD='{your_password}'
TEAMS_WEBHOOK_URL='{teams_webhook_url}'
APIKEY='{Resend_APIKEY}'
SENDFROM='notification@{your_domain}'
SENDTO='{channel_mailaddress}'
MFA_SECRET='{MFA_SECRET}'
EOF
```

.envに以下を設定します
```
USER_ID='{your_ID}'
PASSWORD='{your_password}'
TEAMS_WEBHOOK_URL='{teams_webhook_url}'
APIKEY='{Resend_APIKEY}'
SENDFROM='notification@{your_domain}'
SENDTO='{channel_mailaddress}'
MFA_SECRET='{MFA_SECRET}'
```

| .env     | 用途                                                       | 
| -------- | ---------------------------------------------------------- | 
| USER_ID  | Microsoftアカウントのメールアドレス                        | 
| PASSWORD | Microsoftアカウントのパスワード                            | 
| TEAMS_WEBHOOK_URL | Teamsで発行したWebhook URL                       | 
| APIKEY   | ResendのAPIKEY（エラー時の管理者メール通知も使う場合）     | 
| SENDFROM | 送信元メールアドレス（エラー時の管理者メール通知も使う場合）| 
| SENDTO   | 管理者通知先メールアドレス（エラー時の管理者メール通知）   | 
| MFA_SECRET   | 後述するシークレット                                   | 


### 3. OTP認証

Microsoft のOTP認証を通します

このリンクにアクセスします：

https://mysignins.microsoft.com/security-info

サインイン方法の追加 > Microsoft Authenticator > **別の認証アプリを設定する** > 次へ

そうするとQRコードが表示されます。

![alt text](img/image8.png)

Google Authenticator などの認証アプリを使用してこのQRコードを読み取ると同時に、下にあるCan't scan the QR code? をクリックし、秘密鍵をコピー、 .envの`MFA_SECRET`に貼り付けます。

次へボタンを押すとOTPの入力を促されるので認証アプリに表示されている認証コードを入力、承認されたら認証アプリの認証情報は消して構いません。

ここで注意するのが、Microsoft Authenticator はこのプログラム内での認証とは違います。必ず**別の認証アプリを設定する**をクリックしてください！

### 4. 確認

`$ node --env-file=.env index.js`

cookieが切れる or `cookies.json`が存在しない(初回実行) の場合のみOTP認証されます。

変なことしない限りおそらくOTP認証は通るはずなので、一応ほったらかしでも認証は切れないようになってます。


### 補足
Teams Webhook経由で通知するため、メール転送の設定は不要です。

#### 追記
- 結局ローカルサーバでcrontabする方法で落ち着きました。半月ほど動かしましたが、正常に機能しています。
  - どうやらHDDが故障し、IOエラーが出るようになりました。そのためgithub actionsでのcronで回す方法を検討しました。

- github actionsで動かせるように`.github/workflows/cron.yml`に置いときました。使うときは`disable`を外してください


- 2026/5/18 github actionsはどうやらcronがとても不安定なようで、10分間隔で設定したものが最低1時間間隔、夜間になると4時間くらい平気で動かないことがあります。（夜間に課題が配信されることはないけど！）
  - oracle cloudの always free プランに移行しました。当分無料である程度のコンピューティングが使える様です。そのため、ライブラリ関係も軽いものに変更しました。


## contact
`22126@yonago.kosen-ac.jp`
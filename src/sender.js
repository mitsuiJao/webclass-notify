import { Resend } from "resend";
import config from "./config.js";

export async function sendNotification(subject, body) {
    const { teamsWebhookUrl, apikey, sendto, sendfrom } = config;
    let sent = false;

    if (teamsWebhookUrl) {
        console.log(`Sending Teams webhook notification with subject: "${subject}"`);
        const response = await fetch(teamsWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: `**${subject}**\n\n${body}`,
            }),
        });

        if (!response.ok) {
            const responseText = await response.text();
            const error = new Error(`Webhook request failed with status ${response.status}: ${responseText}`);
            console.error("Failed to send Teams webhook notification:", error.message);
            throw error;
        }

        console.log("Teams webhook notification sent successfully.");
        sent = true;
    }

    if (apikey && sendto && sendfrom) {
        const resend = new Resend(apikey);
        console.log(`Sending email notification with subject: "${subject}"`);
        const { data, error } = await resend.emails.send({
            from: `WebClass Notifier <${sendfrom}>`,
            to: sendto,
            subject: subject,
            html: body,
        });

        if (error) {
            console.error("Failed to send email notification:", { error });
            throw error;
        }

        console.log("Email notification sent successfully:", { data });
        sent = true;
    }

    if (!sent) {
        console.warn("No notification target configured. Set TEAMS_WEBHOOK_URL or APIKEY/SENDFROM/SENDTO.");
    }
}

export async function sendLoginRequiredNotification() {
    const { teamsWebhookUrl, username, apikey } = config;

    const subject = "WebClass Scraper: Authentication Required";
    const body = `
        <h1>Authentication Required</h1>
        <p>The WebClass scraper requires you to re-authenticate.</p>
        <p>Please run the script manually in your terminal to enter the MFA code:</p>
        <pre>node --env-file=.env src/scraper.js</pre>
        <p>This is a notification for the user: ${username}</p>
    `;

    let sent = false;

    if (teamsWebhookUrl) {
        console.log("Sending authentication required notification to Teams...");
        const response = await fetch(teamsWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: `**${subject}**\n\n${body}`,
            }),
        });

        if (!response.ok) {
            const responseText = await response.text();
            const error = new Error(`Webhook request failed with status ${response.status}: ${responseText}`);
            console.error("Failed to send login required notification to Teams:", error.message);
            throw error;
        }

        console.log("Login required notification sent to Teams successfully.");
        sent = true;
    }

    if (apikey && username) {
        const resend = new Resend(apikey);
        console.log("Sending authentication required email notification...");
        const { data, error } = await resend.emails.send({
            from: "Scraper Alert <notification@mitsuijao.fun>",
            to: username,
            subject: subject,
            html: body,
        });

        if (error) {
            console.error("Failed to send login required email notification:", { error });
            throw error;
        }

        console.log("Login required email notification sent successfully:", { data });
        sent = true;
    }

    if (!sent) {
        console.warn("No login-required notification target configured.");
    }
}

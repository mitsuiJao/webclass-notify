import { Resend } from "resend";
import config from "./config.js";

async function sendTeamsWebhook(subject, body) {
    const { teamsWebhookUrl } = config;
    if (!teamsWebhookUrl) {
        throw new Error("TEAMS_WEBHOOK_URL not set.");
    }

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
        throw new Error(`Webhook request failed with status ${response.status}: ${responseText}`);
    }

    console.log("Teams webhook notification sent successfully.");
}

async function sendAdminEmail(subject, body) {
    const { apikey, sendto, sendfrom } = config;
    if (!apikey || !sendto || !sendfrom) {
        throw new Error("APIKEY/SENDFROM/SENDTO not set.");
    }

    const resend = new Resend(apikey);
    console.log(`Sending admin email notification with subject: "${subject}"`);
    const { data, error } = await resend.emails.send({
        from: `WebClass Notifier <${sendfrom}>`,
        to: sendto,
        subject,
        html: body,
    });

    if (error) {
        throw error;
    }

    console.log("Admin email notification sent successfully:", { data });
}

export async function sendNotification(subject, body) {
    try {
        await sendTeamsWebhook(subject, body);
    } catch (error) {
        console.error("Failed to send Teams webhook notification:", error.message);
        throw error;
    }
}

export async function sendLoginRequiredNotification(errorMessage = "") {
    const { username } = config;

    const subject = "WebClass Scraper: Authentication Required";
    const body = `
        <h1>Authentication Required</h1>
        <p>The WebClass scraper requires you to re-authenticate.</p>
        <p>Please run the script manually in your terminal to enter the MFA code:</p>
        <pre>node --env-file=.env src/scraper.js</pre>
        <p>This is a notification for the user: ${username}</p>
        ${errorMessage ? `<p>Error detail: ${errorMessage}</p>` : ""}
    `;

    let sent = false;
    const errors = [];

    try {
        await sendTeamsWebhook(subject, body);
        sent = true;
    } catch (error) {
        console.error("Failed to send login required notification to Teams:", error.message);
        errors.push(error);
    }

    try {
        await sendAdminEmail(subject, body);
        sent = true;
    } catch (error) {
        console.error("Failed to send login required admin email notification:", error.message);
        errors.push(error);
    }

    if (!sent && errors.length > 0) {
        throw errors[0];
    }
}

export async function sendErrorNotification(error) {
    const errorText = error instanceof Error ? `${error.message}\n\n${error.stack || ""}` : String(error);
    const subject = "WebClass Scraper: Runtime Error";
    const body = `
        <h1>Runtime Error</h1>
        <p>An error occurred in the main process.</p>
        <pre>${errorText}</pre>
    `;

    try {
        await sendAdminEmail(subject, body);
    } catch (sendError) {
        console.error("Failed to send runtime error admin email notification:", sendError.message);
        throw sendError;
    }
}

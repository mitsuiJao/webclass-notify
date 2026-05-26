import config from "./config.js";

export async function sendNotification(subject, body) {
    const { teamsWebhookUrl } = config;
    if (!teamsWebhookUrl) {
        console.warn("TEAMS_WEBHOOK_URL not set. Skipping Teams notification.");
        return;
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
        const error = new Error(`Webhook request failed with status ${response.status}: ${responseText}`);
        console.error("Failed to send Teams webhook notification:", error.message);
        throw error;
    }

    console.log("Teams webhook notification sent successfully.");
}

export async function sendLoginRequiredNotification() {
    const { teamsWebhookUrl, username } = config;

    if (!teamsWebhookUrl || !username) {
        console.warn(
            "TEAMS_WEBHOOK_URL or USER_ID not set. Skipping login required notification."
        );
        return;
    }

    const subject = "WebClass Scraper: Authentication Required";
    const body = `
        <h1>Authentication Required</h1>
        <p>The WebClass scraper requires you to re-authenticate.</p>
        <p>Please run the script manually in your terminal to enter the MFA code:</p>
        <pre>node --env-file=.env src/scraper.js</pre>
        <p>This is a notification for the user: ${username}</p>
    `;

    console.log("Sending authentication required notification...");
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
        console.error("Failed to send login required notification:", error.message);
        throw error;
    }

    console.log("Login required notification sent successfully.");
}

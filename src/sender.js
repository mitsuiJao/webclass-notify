import config from "./config.js";

async function sendTeamsWebhook(subject, body) {
    const { teamsWebhookUrl } = config;
    if (!teamsWebhookUrl) {
        throw new Error("TEAMS_WEBHOOK_URL not set.");
    }

    console.log(`Sending Teams webhook notification with subject: "${subject}"`);

    const adaptiveCard = {
        type: "AdaptiveCard",
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        version: "1.2",
        body: [
            {
                type: "TextBlock",
                text: subject,
                weight: "Bolder",
                size: "ExtraLarge",
                wrap: true,
            },
            {
                type: "TextBlock",
                text: body,
                size: "Large",
                wrap: true,
            },
        ],
    };

    const response = await fetch(teamsWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adaptiveCard),
    });

    if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Webhook request failed with status ${response.status}: ${responseText}`);
    }

    console.log("Teams webhook notification sent successfully.");
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
    const body = [
        "## Authentication Required",
        "",
        "The WebClass scraper requires you to re-authenticate.",
        "Please run the script manually in your terminal to enter the MFA code:",
        "",
        "```",
        "node --env-file=.env src/scraper.js",
        "```",
        "",
        `User: ${username}`,
        errorMessage ? `\nError detail: ${errorMessage}` : "",
    ].join("\n");

    await sendTeamsWebhook(subject, body);
}

export async function sendErrorNotification(error) {
    const errorText = error instanceof Error ? `${error.message}\n\n${error.stack || ""}` : String(error);
    const subject = "WebClass Scraper: Runtime Error";
    const body = `## Runtime Error\n\nAn error occurred in the main process.\n\n\`\`\`\n${errorText}\n\`\`\``;

    await sendTeamsWebhook(subject, body);
}

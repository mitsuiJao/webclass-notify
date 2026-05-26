async function main() {
  const subject = "Test Teams Notification";
  const body = "This is a test Teams webhook notification from the notifier.";
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("TEAMS_WEBHOOK_URL not set. Skipping Teams notification.");
    return;
  }

  const adaptiveCard = {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.2",
    body: [
      {
        type: "TextBlock",
        text: subject,
        weight: "Bolder",
        size: "Large",
        wrap: true,
      },
      {
        type: "TextBlock",
        text: body,
        wrap: true,
      },
    ],
  };

  try {
    console.log(`Sending Teams webhook notification with subject: "${subject}"`);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adaptiveCard),
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`Webhook request failed with status ${response.status}: ${responseText}`);
    }
    console.log("Teams webhook notification sent successfully!");
  } catch (error) {
    console.error("Failed to send test Teams notification:", error);
  }
}
main();

import { scrapeAssignments } from "./src/scraper.js";
import { sendErrorNotification, sendLoginRequiredNotification, sendNotification } from "./src/sender.js";
import { processNotifications } from "./src/notifier.js";
import fs from "fs/promises";
import path from "path";


async function run() {
    console.log("running!");
    try {
        const outputDir = "./output";
        await fs.mkdir(outputDir, { recursive: true });
        const files = await fs.readdir(outputDir);
        for (const file of files) {
            if (file.startsWith("debug_")) {
                await fs.unlink(path.join(outputDir, file));
                console.log(`Deleted ${file}`);
            }
        }

        console.log("Running scraper...");
        const scrapeResult = await scrapeAssignments();

        if (scrapeResult?.loginRequired) {
            console.log("Scraping failed due to authentication/session issue. Sending alert notification.");
            await sendLoginRequiredNotification(scrapeResult?.error || "");
            return;
        }

        const notifications = await processNotifications(scrapeResult);

        if (notifications && notifications.length > 0) {
            console.log(`Found ${notifications.length} notifications to send.`);
            for (const notification of notifications) {
                await sendNotification(notification.subject, notification.body);
            }
        }

    } catch (error) {
        console.error("An error occurred in the main process:", error);
        try {
            await sendErrorNotification(error);
        } catch (notificationError) {
            console.error("Failed to send error notifications:", notificationError);
        }
        process.exit(1);
    }
}

run();

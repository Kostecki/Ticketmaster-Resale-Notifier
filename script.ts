/// <reference types="node" />

import fs from "node:fs";
import { open } from "node:fs/promises";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

type Params = Record<string, string>;

type Offer = {
  id: string;
  quantities: number[];
};

type ResaleResponse = {
  offers: Offer[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const stateFilePath = path.join(__dirname, "notifiedOffers.json");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

// Read full cookie from file
const cookieString = await (async () => {
  const fileHandle = await open(path.join(__dirname, "cookie.txt"), "r");
  try {
    return await fileHandle.readFile({ encoding: "utf8" });
  } finally {
    await fileHandle.close();
  }
})();

// Ensure cookie file exists and is not empty
if (!cookieString || cookieString.trim() === "") {
  console.error(
    "Cookie file is missing or empty. Please create a cookie.txt file with your Ticketmaster session cookie.",
  );

  process.exit(1);
}

if (!fs.existsSync(stateFilePath)) {
  try {
    fs.writeFileSync(stateFilePath, "[]", "utf8");
    console.log("Created empty notifiedOffers.json file");
  } catch (error) {
    console.error("Error creating state file:", error);
  }
}

let notifiedOfferIds = new Set<string>();

try {
  const fileData = fs.readFileSync(stateFilePath, "utf8");
  const ids = JSON.parse(fileData) as string[];
  notifiedOfferIds = new Set(ids);
} catch (error) {
  console.error("Error reading state file:", error);
}

// Command line arguments
const args = process.argv.slice(2);
const params: Params = {};

args.forEach((arg: string) => {
  const [key, value] = arg.split("=");
  if (key && value) {
    params[key.replace(/^--/, "")] = value;
  }
});

const eventId = params.eventId;
const eventName = params.eventName;

if (!eventId || !eventName) {
  console.error("Missing required parameters: --eventId and --eventName");
  process.exit(1);
}

const eventUrl = `https://www.ticketmaster.dk/event/${eventId}`;

let pushoverUserKey: string;
let pushoverApiToken: string;

try {
  pushoverUserKey = requireEnv("PUSHOVER_USER_KEY");
  pushoverApiToken = requireEnv("PUSHOVER_API_TOKEN");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const saveNotifiedIds = (): void => {
  fs.writeFileSync(
    stateFilePath,
    JSON.stringify([...notifiedOfferIds]),
    "utf8",
  );
};

const checkForTickets = async (): Promise<ResaleResponse> => {
  console.log("Notification provider: Pushover");
  console.log(`Fetching data for event: ${eventName} (${eventId})\n`);

  const url = `https://availability.ticketmaster.dk/api/v2/TM_DK/resale/${eventId}`;

  const headers = new Headers({ Cookie: cookieString });

  const response = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = (await response.json()) as ResaleResponse;
  return data;
};

const sendSuccessNotification = (offers: Offer[]): void => {
  console.log("Sending notification...");

  const totalTickets = offers.reduce((sum, offer) => {
    return sum + offer.quantities.reduce((qSum, q) => qSum + q, 0);
  }, 0);
  const title = `DER ER ${totalTickets} BILLET${
    totalTickets === 1 ? "" : "TER"
  } TIL SALG?!`;

  fetch("https://api.pushover.net/1/messages.json", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      token: pushoverApiToken,
      user: pushoverUserKey,
      title,
      message: eventName,
      url: eventUrl,
      url_title: "Køb billet",
    }),
  })
    .then(() => {
      try {
        offers.forEach((offer) => {
          notifiedOfferIds.add(offer.id);
        });
        saveNotifiedIds();
      } catch (error) {
        console.error("Error saving notified offer IDs:", error);
      }
    })
    .catch((error) => {
      console.error("Error sending notification:", error);
    });
};

const sendErrorNotification = (error: unknown): void => {
  console.log("Sending error notification...");

  fetch("https://api.pushover.net/1/messages.json", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      token: pushoverApiToken,
      user: pushoverUserKey,
      title: "Error checking tickets",
      message: `An error occurred while checking tickets for "${eventName}".\n\n${String(error)}`,
    }),
  }).catch((notificationError) => {
    console.error("Error sending error notification:", notificationError);
  });
};

checkForTickets()
  .then((data) => {
    if (data.offers.length > 0) {
      const newOffers = data.offers.filter(
        (offer) => !notifiedOfferIds.has(offer.id),
      );

      if (newOffers.length > 0) {
        console.log("TICKETS AVAILABLE?!");
        console.log();
        sendSuccessNotification(newOffers);
      }
    } else {
      console.log("NO TICKETS AVAILABLE");
    }
  })
  .catch((error) => {
    console.error("Error:", error);
    sendErrorNotification(error);
  });

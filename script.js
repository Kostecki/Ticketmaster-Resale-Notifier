const fs = require("fs");
const path = require("path");

// File handling
const stateFilePath = path.join(__dirname, "notifiedOffers.json");

if (!fs.existsSync(stateFilePath)) {
  try {
    fs.writeFileSync(stateFilePath, "[]", "utf8");
    console.log("Created empty notifiedOffers.json file");
  } catch (error) {
    console.error("Error creating state file:", error);
  }
}

let notifiedOfferIds = new Set();

try {
  const fileData = fs.readFileSync(stateFilePath, "utf8");
  const ids = JSON.parse(fileData);
  notifiedOfferIds = new Set(ids);
} catch (error) {
  console.error("Error reading state file:", error);
}

// Command line arguments
const args = process.argv.slice(2);
const params = {};

args.forEach((arg) => {
  const [key, value] = arg.split("=");
  if (key && value) {
    params[key.replace(/^--/, "")] = value;
  }
});

const eventId = params.eventId;
const eventName = params.eventName;
const eventUrl = `https://www.ticketmaster.dk/event/${eventId}`;
const ntfyUrlFull = params.ntfyUrl;

if (!eventId || !eventName || !ntfyUrlFull) {
  console.error("Missing required parameters: eventId, eventName or ntfyUrl");
  process.exit(1);
}

const ntfyUrl = new URL(ntfyUrlFull).origin;
const ntfyTopic = new URL(ntfyUrlFull).pathname.split("/").filter(Boolean)[0];

if (!ntfyTopic) {
  console.error("Invalid ntfyUrl. Please provide a valid URL with a topic.");
  process.exit(1);
}

const requestCookie =
  "eps_sid=b7527c16a8c40017eb7a59486c71ec364041496d;tmpt=0:00091c47be000000:1750968540:86fb5d02:e634f97a75da87a4e611bd6caaae74ea:490e6359787e7fbcf28ccf30f77386f3db8258bcbe99ec2caaa0387de9414dbd;";

const saveNotifiedIds = () => {
  fs.writeFileSync(
    stateFilePath,
    JSON.stringify([...notifiedOfferIds]),
    "utf8"
  );
};

const checkForTickets = async () => {
  console.log("Ntfy URL:", ntfyUrl);
  console.log("Ntfy Topic:", ntfyTopic);
  console.log(`Fetching data for event: ${eventName} (${eventId})`);
  console.log();

  const url = `https://availability.ticketmaster.dk/api/v2/TM_DK/resale/${eventId}`;

  const headers = new Headers({ Cookie: requestCookie });

  const response = await fetch(url, {
    method: "GET",
    headers: headers,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

const sendSuccessNotification = (offers) => {
  console.log("Sending notification...");

  const totalTickets = offers.reduce((sum, offer) => {
    return sum + offer.quantities.reduce((qSum, q) => qSum + q, 0);
  }, 0);
  const title = `DER ER ${totalTickets} BILLET${
    totalTickets === 1 ? "" : "TER"
  } TIL SALG?!`;

  fetch(ntfyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: ntfyTopic,
      title,
      message: eventName,
      actions: [
        {
          action: "view",
          label: "Køb for helvede!",
          url: eventUrl,
        },
      ],
    }),
  })
    .then(() => {
      try {
        offers.forEach((offer) => notifiedOfferIds.add(offer.id));
        saveNotifiedIds();
      } catch (error) {
        console.error("Error saving notified offer IDs:", error);
      }
    })
    .catch((error) => {
      console.error("Error sending notification:", error);
    });
};

const sendErrorNotification = (error) => {
  console.log("Sending error notification...");

  fetch(ntfyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: ntfyTopic,
      title: "Error checking tickets",
      message: `An error occurred while checking tickets for "${eventName}".\n\n${error}`,
    }),
  }).catch((error) => {
    console.error("Error sending error notification:", error);
  });
};

checkForTickets()
  .then((data) => {
    if (data.offers.length > 0) {
      const newOffers = data.offers.filter(
        (offer) => !notifiedOfferIds.has(offer.id)
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

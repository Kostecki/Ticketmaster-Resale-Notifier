const config = {
  eventId: "555893",
  eventUrl:
    "https://www.ticketmaster.dk/event/roskilde-festival-2025-one-day-ticket-friday-billetter/555893",
  eventName: "Roskilde Festival 2025 - One-Day Ticket, Friday",
};

const requestCookie =
  "eps_sid=b7527c16a8c40017eb7a59486c71ec364041496d;tmpt=0:00091c47be000000:1750968540:86fb5d02:e634f97a75da87a4e611bd6caaae74ea:490e6359787e7fbcf28ccf30f77386f3db8258bcbe99ec2caaa0387de9414dbd;";

const ntfyTopic = "nt-rf";

const checkForTickets = async () => {
  console.log("Fetching data for event:", config.eventName);
  console.log();

  const url = `https://availability.ticketmaster.dk/api/v2/TM_DK/resale/${config.eventId}`;

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

const sendSuccessNotification = () => {
  console.log("Sending notification...");

  fetch("https://ntfy.israndom.win", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: ntfyTopic,
      title: "DER ER BILLETTER?!",
      message: config.eventName,
      actions: [
        {
          action: "view",
          label: "Køb for helvede!",
          url: config.eventUrl,
        },
      ],
    }),
  }).catch((error) => {
    console.error("Error sending notification:", error);
  });
};

const sendErrorNotification = (error) => {
  console.log("Sending error notification...");

  fetch("https://ntfy.israndom.win", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: ntfyTopic,
      title: "Error checking tickets",
      message: `An error occurred while checking tickets for "${config.eventName}".\n\n${error}`,
    }),
  }).catch((error) => {
    console.error("Error sending error notification:", error);
  });
};

checkForTickets()
  .then((data) => {
    if (data.offers.length > 0) {
      console.log(JSON.stringify(data));
      console.log();

      console.log("TICKETS AVAILABLE?!");
      console.log();
      sendSuccessNotification();
    } else {
      console.log("NO TICKETS AVAILABLE");
    }
  })
  .catch((error) => {
    console.error("Error:", error);
    sendErrorNotification(error);
  });

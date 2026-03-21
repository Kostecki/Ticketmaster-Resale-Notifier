const eventSlug = "olivia-dean-the-art-of-loving-billetter";
const eventId = "262231952";

const headers = {
  accept: "*/*",
  "accept-language": "en-GB,en;q=0.9,en-US;q=0.8,da;q=0.7",
  "cache-control": "no-cache",
  origin: "https://www.ticketmaster.dk",
  pragma: "no-cache",
  priority: "u=1, i",
  referer: "https://www.ticketmaster.dk/",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
};

// Request to page to get cookies
fetch(`https://www.ticketmaster.dk/event/${eventSlug}/${eventId}`).then(
  (res) => {
    console.log(res);

    // const ebid = res.headers.get("ebid") || "";
    // const esid = res.headers.get("esid") || "";

    // fetch(
    //   `https://availability.ticketmaster.dk/api/v2/TM_DK/resale/${eventId}`,
    //   {
    //     headers: {
    //       Cookie: `BID=${ebid}; SID=${esid}`,
    //       ...headers,
    //     },
    //     method: "GET",
    //   }
    // ).then((res) => {
    //   console.log(res);
    // });
  }
);

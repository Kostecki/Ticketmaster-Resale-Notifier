# Ticketmaster Resale Notifier
Get those resale ticket before someone else gets them 🚀

### Usage

Create a `.env` file:

```bash
PUSHOVER_USER_KEY="YOUR_USER_KEY"
PUSHOVER_API_TOKEN="YOUR_APP_API_TOKEN"
```

Run with event args:

```bash
pnpm start -- --eventId=555893 --eventName="Roskilde Festival 2025 - One-Day Ticket, Friday"
```
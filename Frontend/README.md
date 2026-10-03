# Cab CRM — calling executive app

React Native (Expo SDK 57) app for the calling desk described in the Cab Service CRM mobile calling flow.

Calling executives sign in, work assigned customers and leads, and tap **Call**. On Android that opens the phone’s native dialer and uses the executive’s normal SIM. After the call, the app records status, duration, and remarks, then syncs them to the CRM API. A development build can also read the Android call log and look for recording files the dialer already saved. The app does not record the conversation itself.

## Run it

```bash
cd mobile
npm install
npm run web
```

The preview listens on port **43123**. Android and iOS:

```bash
npm start
```

Then open the project in Expo Go for the screens, or create a development build when you need the real call log:

```bash
npx expo run:android
```

Expo Go can place a `tel:` call on a phone, but `READ_CALL_LOG` is only available in a build that includes the local `modules/call-sync` module.

## Sign in

Live sign-in uses the executive or admin account from the CRM API. After you save an API address in Profile, sign in again so the session uses that API.

Admins open Profile and choose Team & Users, or tap Add executive on Home. The form matches the web screen: full name, initial password (at least 12 characters), email, phone, role locked to Calling Executive, and Active or Inactive. Each calling executive card has Activate and Deactivate.

```bash
# mobile/.env
EXPO_PUBLIC_API_BASE_URL=https://your-crm-api.example.com
```

## API the app calls

All requests send `Authorization: Bearer <token>` except login and forgot-password.

| Method | Path | Body |
| --- | --- | --- |
| POST | `/api/mobile/auth/login` | `{ identifier, password }` → `{ token, user }` |
| POST | `/api/mobile/auth/forgot-password` | `{ identifier }` → `{ message }` |
| POST | `/api/mobile/auth/logout` | |
| GET | `/api/mobile/auth/me` | |
| GET | `/api/mobile/customers` | |
| POST | `/api/mobile/customers` | customer |
| PATCH | `/api/mobile/customers/:id` | customer |
| GET | `/api/mobile/leads` | |
| POST | `/api/mobile/leads` | lead |
| PATCH | `/api/mobile/leads/:id` | lead |
| GET | `/api/mobile/follow-ups` | |
| POST | `/api/mobile/follow-ups` | follow-up |
| PATCH | `/api/mobile/follow-ups/:id` | follow-up |
| GET | `/api/mobile/notes` | |
| POST | `/api/mobile/notes` | note |
| GET | `/api/mobile/bookings` | |
| POST | `/api/mobile/bookings` | booking |
| PATCH | `/api/mobile/bookings/:id` | booking |
| GET | `/api/mobile/calls` | |
| POST | `/api/mobile/calls` | call |
| POST | `/api/mobile/calls/sync` | `{ calls }` |
| GET | `/api/mobile/recordings` | |
| POST | `/api/mobile/recordings/upload` | multipart file plus `callId`, `mobile`, `fileName` |

If the API is down, changes stay on the phone and are marked “On device”.

## Android calling

- **Call** uses `tel:` so the system dialer opens. The CRM does not place the call.
- Call log sync needs `READ_CALL_LOG` and `READ_PHONE_STATE`. The executive confirms which rows to import. Unknown numbers can become new leads.
- Recording upload uses a file the user picks, or files found in common dialer folders on a development build. Availability depends on the Android version and the phone maker. Missed calls often have no file.

## Added on this desk

These stay on the phone. Nothing new is sent to a backend.

- Notifications bell on Home, plus a Notifications screen. Items come from follow-ups due, new leads, open bookings, and missed calls. Profile toggles still decide which of those appear. The report section from the web admin desk is not included.
- Follow-ups has a Schedule action that opens a new schedule. New schedule on an existing row copies the person, type, channel, priority, assignee, date, time, and note, then marks the previous row Rescheduled.
- Changing Type on the schedule form sets Channel to the matching value (Call → Phone, Message → WhatsApp, Visit → Visit, Booking → Phone). Switching Customer / Lead replaces the person dropdown with that list.
- Saving a schedule for a lead writes the same date and time into that lead’s next follow-up fields.

## Checks

```bash
npm test
npm run typecheck
```

# ⏰ Synk3

**Wake-up synchronization for modern hostels.**

Synk3 is a mobile-first alarm system built to replace the traditional practice of knocking or banging on hostel doors to wake students for morning devotion.

The goal is simple: provide a more reliable, less disruptive, and scalable way to coordinate wake-up schedules across a hostel community. Currently focused on Android, Synk3 is designed for environments where consistency, simplicity, and reliability matter most.

---

## Why Synk3?

Morning wake-up coordination in many hostels still depends on manual door-to-door wake-up rounds. While effective, the process is noisy, time-consuming, and difficult to manage at scale.

Synk3 offers a smarter alternative through synchronized mobile alarms and centralized schedule management.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Mobile Engine | Capacitor, Kotlin / Java |
| Backend / BaaS | Firebase / Supabase |

---

## Getting Started

Clone the repository and navigate into the project directory:

```bash
git clone <repo-url>
cd synk3
```

Install the dependencies:

```bash
npm install
```

### Run Locally

To spin up the local development server:

```bash
npm run dev
```

### Build for Android

To build the project and open it in Android Studio:

```bash
npm run build
npx cap sync android
npx cap open android
```

---

## Status

**Active development.**
Android is the primary target platform. iOS support is planned.

---

## License

Released under the [Apache-2.0](LICENSE) License.

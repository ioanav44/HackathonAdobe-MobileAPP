# Corp-social (Expo + Supabase)

A lightweight social feed and team chat app built with Expo (React Native) and Supabase.

Romanian-friendly UI: photo feed, reactions, team chat (General + Department), daily notes, and a daily summary of activity.

## ✨ Features

- Photo feed with image uploads
   - Converts every image to JPEG on-device (avoids HEIC/PNG issues)
   - Uploads to Supabase Storage (bucket `media`)
   - Emoji reactions per post 
   - Delete your own posts
- Team chat with channels
   - General and Department channel (auto-created)
   - Realtime messages via Supabase Realtime
   - Long-press to delete your own message
- Daily notes (carnetel)
   - Per-user, per-day checklist stored locally (AsyncStorage)
- Daily summary
   - Quick counts for tasks / meetings / calls / others based on message text

## 🧰 Tech stack

- Expo (managed)
- React Native + expo-router
- Supabase (Auth, Database, Storage, Realtime)
- expo-image-manipulator, expo-image
- AsyncStorage

## 🗂 Project structure (short)

- `app/`
   - `feed.jsx` — photo feed, upload to Supabase, reactions, notes FAB
   - `team.jsx` — chat (General/Department), realtime, delete on long-press, daily summary FAB
   - `login.jsx`, `register.jsx`, `profile.jsx`, `_layout.jsx`, `index.jsx`
- `components/` — UI pieces (Button, Input, NavBar, DailyNotesButton, DailySummaryButton)
- `lib/`
   - `supabase.jsx` — Supabase client (env fallbacks, lazy AsyncStorage)
   - `summary.js` — summary extractor for daily counts
- `constants/` — theme/colors
- `hooks/` — color scheme & theme helpers


## ▶️ Run the app

Start Metro/Expo:

```powershell
npx expo start -c
```

Open on Android in one of these ways:

- Press `a` in the Expo terminal to open on a running Android emulator
- Or use your Android phone with Expo Go (scan the QR code)

### Android prerequisites (Windows)

- Install Android Studio (includes SDK, AVD)
- Create an emulator in AVD Manager (e.g., Pixel + API 30+)
- Ensure `adb` is on PATH:

```powershell
where.exe adb
adb devices
```

If `adb` is missing, add `C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk\\platform-tools` to PATH and retry.

## 🔎 Troubleshooting

- Supabase env missing
   - The app will log: `ENV missing for Supabase` — set URL and anon key in `app.json` → `expo.extra`
- Android device/emulator not detected
   - Check `adb devices`; start an emulator from Android Studio or connect a phone with USB debugging
- Images appear black or don’t preview in Supabase
   - We convert to JPEG before upload; ensure the bucket isn’t rewriting content-type
   - Confirm uploads show `image/jpeg` and non-zero file size
- Can’t load images in the app
   - Check console logs (`IMG ERROR`) and verify the `image_url` is reachable

## 📄 Docs

- See `PROJECT_OVERVIEW.md` for a file-by-file description.

## � Credits

- 2025 — Novence & Ascendri

---

## Legacy Expo README

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

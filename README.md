# HealthFull - Gym & Nutrition Tracker

iOS-focused health tracker with barcode-based macro logging and exercise tracking.

## Features

- **Barcode Scanning**: Scan product barcodes to fetch nutrition data from OpenFoodFacts API
- **Macro Tracking**: View daily totals for calories, protein, carbs, and fat
- **Exercise Logging**: Track sets, reps, and weights for workouts
- **Local Storage**: All data stored locally on device using AsyncStorage

## Tech Stack

- React Native / Expo
- TypeScript
- expo-camera for barcode scanning
- OpenFoodFacts API (free, no key required)
- AsyncStorage for local persistence

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

- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Project Structure

- `app/(tabs)/index.tsx` - Nutrition home screen with daily macro totals
- `app/(tabs)/explore.tsx` - Exercise logging interface
- `app/scan.tsx` - Barcode scanner screen
- `app/_layout.tsx` - Root navigation layout

## Usage

1. **Scan Food**: Tap "Scan Barcode" on the Nutrition tab, point camera at a product barcode
2. **View Macros**: Home screen displays daily totals and food log
3. **Log Exercise**: Use Exercise tab to add sets/reps/weight for workouts

## Next Steps

- Add macro goals and progress tracking
- Weekly/monthly summaries
- Exercise history and PR tracking
- Cloud sync with user accounts
- Custom food entry (manual input)

## Camera Permissions

iOS will prompt for camera access on first scan. Grant permission in Settings > HealthFull if needed.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Web publishing

- Build the static web bundle with `npm run export:web`. The output is written to `dist/` and is ready to ship to any static host.
- Preview the generated site locally with `npm run export:web` followed by `npx serve dist` (or another static server).
- This repo already includes Vercel settings (`vercel.json`) so the [Main Website](https://health-full.vercel.app) is built via `npx expo export -p web` and rewrites all routes to `index.html` for SPA navigation.
- Manual deploy option: `vercel --prebuilt --prod` (after `npm install` and `npm run export:web`) publishes the current `dist/` build without rebuilding it online.

### Continuous deploy (GitHub → Vercel)

1. Create a Vercel token (https://vercel.com/account/tokens) and add it as `VERCEL_TOKEN` in this repository’s **Settings → Secrets**.
2. The workflow in `.github/workflows/vercel-deploy.yml` installs dependencies, runs `npm run export:web`, and pushes `dist/` to your Vercel project.
3. Vercel also needs access to the repository so it can read the workflow-generated `dist/` bundle; the project is linked to `icemazters-projects/health-full`.
4. Push to `main` (or trigger the workflow manually) and GitHub Actions will run the export + deploy sequence.

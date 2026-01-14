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

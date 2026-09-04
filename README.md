# Daily Lift PWA

Daily Lift is a local-first workout planner and tracker designed for installation on an iPhone Home Screen.

## Main features

- Create multiple workout plans such as Push, Pull, Legs, Upper, etc.
- Each exercise can be:
  - Sets + reps based, or
  - Timed / rounds based.
- Pre-plan sets with different rep targets for each set, or plan timed rounds.
- Enter weight for each completed rep-based set.
- Optional "Track best effort" for selected exercises, including best weight for the current rep target during a workout.
- Add an optional workout description that appears in its own card during training.
- Workout board lets you select exercises in the exact order you want.
- Selected exercises alternate set-by-set.
- When every set/round in the selected exercise group is finished, the app automatically returns to the exercise board.
- Best Efforts shows the highest weight recorded for each tracked exercise.
- End-of-workout summary shows duration, sets/rounds, and pounds moved.
- Home screen tracks:
  - Number of completed workouts
  - Lifetime pounds moved
  - Tap-to-cycle fun equivalents: tons, cars, elephants, grand pianos, refrigerators
  - Top 3 workouts by total pounds moved
- No streak feature.
- Offline support via service worker.
- Data stays in localStorage on the user's device.

## v3 updates

- Optional same-reps checkbox for each rep-based exercise; default remains different reps per set.
- Optional description for every exercise plus the existing workout description.
- Rep-specific best effort during workouts and highest overall weight on Best Efforts.
- Cleaner in-workout exercise board showing only exercise name and completed sets/rounds.
- Improved workout-selection and weight-entry spacing.
- Settings screen with Dark/Light/System appearance, lb/kg units, and Sync Latest Version.
- Sync Latest Version refreshes app caches without clearing saved workout data.

## Install with GitHub Pages

1. Create a GitHub repository, for example `daily-lift`.
2. Upload the CONTENTS of this folder to the repository root.
3. In GitHub: Settings > Pages.
4. Choose `Deploy from a branch`.
5. Select `main` and `/(root)`, then save.
6. Open the published HTTPS URL in Safari on the iPhone.
7. Tap Share > Add to Home Screen.

## Updating the app

After editing files, commit/upload the changed files to GitHub. When changing cached assets or behavior, bump the cache name in `sw.js` (for example `daily-lift-v1` to `daily-lift-v2`) so installed copies refresh cleanly.


## v4 board updates

- Added an Exercise Board heading and overall completed-set count.
- Exercise icons are shown beside each exercise on the board.
- Viewport sizing and overscroll behavior were refined so the page only needs normal vertical scrolling when content exceeds the screen.

# SpotMe Manual QA Checklist

## PWA Installation (iPhone Safari)
- [ ] Open the app URL in Safari on iPhone
- [ ] Tap the Share button (bottom center)
- [ ] Tap "Add to Home Screen"
- [ ] Verify app name and icon appear correctly on home screen
- [ ] Launch the app from the home screen

## Standalone Mode
- [ ] App opens without Safari browser chrome (no address bar, no tab bar)
- [ ] Status bar style matches the app theme (black-translucent)
- [ ] Safe area insets are respected (content does not overlap notch or home indicator)

## Navigation
- [ ] Bottom tab bar displays all 5 tabs: Home, Routines, Log Workout, Progress, Settings
- [ ] Tapping each tab navigates to the correct page
- [ ] Active tab is visually highlighted
- [ ] Tab bar remains visible on all pages
- [ ] Back navigation works correctly within nested pages (e.g., Routine detail -> Routine list)

## Workout Logging
- [ ] Start a workout from a routine
- [ ] Log a set with reps, weight, and RIR
- [ ] Previous workout numbers displayed as reference ("Last time: 135 lbs x 8 reps")
- [ ] Quick-fill button copies last session's weight/reps
- [ ] Can add extra sets beyond the routine's default
- [ ] Can skip an exercise
- [ ] Complete the workout and verify it appears in recent sessions

## Mid-Workout Persistence
- [ ] Start a workout and log 2-3 sets
- [ ] Close the app entirely (swipe up from app switcher)
- [ ] Reopen the app from home screen
- [ ] Verify the in-progress workout data is preserved

## Offline Mode
- [ ] Enable Airplane Mode on the device
- [ ] Open the app (should load from cache)
- [ ] Start a new workout and log sets
- [ ] Verify data saves locally without errors
- [ ] Disable Airplane Mode
- [ ] Verify data syncs to the server automatically
- [ ] Confirm synced data appears correctly in the app

## Charts and Progress
- [ ] Navigate to Progress tab
- [ ] Verify Weight over Time chart renders with data points
- [ ] Verify Volume over Time chart renders
- [ ] Verify Estimated 1RM chart renders
- [ ] Tap a data point on a chart to see details
- [ ] Trend indicators display correctly (green up / yellow steady / red down)
- [ ] Charts are readable and properly sized on iPhone SE (small screen)
- [ ] Charts are readable and properly sized on iPhone 15 Pro Max (large screen)

## Dark Mode / Light Mode
- [ ] Default theme is dark mode
- [ ] Toggle to light mode in Settings
- [ ] All screens render correctly in light mode (text readable, contrast acceptable)
- [ ] Toggle back to dark mode
- [ ] Theme preference persists across app restarts

## Authentication
- [ ] Sign up with a new email and password
- [ ] Verify confirmation email (if enabled)
- [ ] Sign out via Settings
- [ ] Sign in with existing credentials
- [ ] Close and reopen app - verify user remains signed in (persistent session)
- [ ] Verify one user cannot see another user's data

## Touch Targets and Usability
- [ ] All buttons are at least 44x44px tap targets
- [ ] Buttons are easily tappable with one hand
- [ ] Number inputs are easy to tap and edit
- [ ] No accidental taps on adjacent controls
- [ ] Scrolling is smooth with no jank
- [ ] No horizontal scroll on any page

## RIR Labels
- [ ] RIR 0 displays "Nothing left"
- [ ] RIR 1 displays "Maybe 1 more"
- [ ] RIR 2 displays "Could do 2 more"
- [ ] RIR 3 displays "Comfortable"
- [ ] RIR 4 displays "Easy"
- [ ] RIR 5 displays "Very easy"

## Last Session Reference Data
- [ ] During a workout, "Last time" data shows for exercises with history
- [ ] Shows correct weight and reps from the previous session
- [ ] No "Last time" data shown for exercises performed for the first time
- [ ] Data corresponds to the correct routine (not a different routine's session)

## Dashboard (Home Screen)
- [ ] Weekly summary shows total workouts, sets, and volume for the current week
- [ ] Streak counter shows correct consecutive weeks
- [ ] Recent workouts list shows last 5 sessions with routine name and date
- [ ] Personal records are highlighted with clear labels ("New best! Bench Press: 185 lbs x 5")

## Routines Management
- [ ] Create a new routine with a name
- [ ] Add exercises to the routine from the exercise library
- [ ] Search for exercises by name
- [ ] Reorder exercises within a routine (drag or move up/down)
- [ ] Remove an exercise from a routine
- [ ] Duplicate a routine (verify " (Copy)" suffix and all exercises copied)
- [ ] Rename a routine
- [ ] Delete a routine

## Edge Cases
- [ ] Very long exercise names display without breaking layout
- [ ] Very high weights (e.g., 999 lbs) display correctly
- [ ] App handles no internet on first launch gracefully (shows error or cached data)
- [ ] Empty states display helpful messages (no routines, no workout history, etc.)

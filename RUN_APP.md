# How to Run My AI Friends App

## Quick Start

1. **Open Terminal** and navigate to the project:
   ```bash
   cd /Users/michaelspencer/Developer/MyAIFriends
   ```

2. **Start Expo**:
   ```bash
   npx expo start
   ```

3. **Choose your platform**:
   - Press `i` → Opens iOS Simulator
   - Press `a` → Opens Android Emulator  
   - Press `w` → Opens in web browser

## If iOS Simulator doesn't open:

1. **Open Simulator manually**:
   ```bash
   open -a Simulator
   ```

2. **In Expo terminal**, press `i` again

3. **Or scan the QR code** with Expo Go app on your physical iPhone

## Current Status

✅ App is built and ready
✅ Metro bundler is running on http://localhost:8081
✅ iOS Simulator is installed and ready

## Troubleshooting

If you see a blank screen:
1. Shake the device (Cmd+Ctrl+Z in simulator)
2. Choose "Reload"

If Expo Go isn't installed on simulator:
- It will auto-install when you press `i` in Expo terminal

## App Features Ready to Test

- Welcome screen with animations
- Home screen with AI selection
- Multi-AI chat interface
- @mention system
- Settings with Simple/Expert mode toggle

Note: API calls are mocked until you add real API keys.
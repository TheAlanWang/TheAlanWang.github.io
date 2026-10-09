---
layout: layouts/post.njk
title: Expo Basics
description: What Expo is, how its dev tools fit together, creating a first project, Expo Go vs. development builds, code layers, common commands, and common misconceptions.
excerpt: How Expo, React Native, Metro, and Xcode fit together, and when to move from Expo Go to a development build.
date: 2026-10-08T12:00:00-07:00
category: Knowledge
subcategory: Mobile
topic: React Native
kind: Note
tags:
  - posts
permalink: /posts/expo-basics/index.html
---
## What Is Expo
React Native lets you build mobile apps with React and TypeScript. 
**Expo** wraps React Native with tools that make creating, running, and building apps easier.
Write one codebase that runs on both iOS and Android.

## 1. Tech Stack
| Name         | Type                     | Summary                                                                                              |
| ------------ | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| TypeScript   | Language                 | JavaScript with types; all code is written in it                                                     |
| Node.js      | Runtime                  | Runs JavaScript on your computer; used to run the dev tools below                                    |
| npm          | Package manager          | Downloads dependencies, like Python's pip                                                            |
| React        | UI library               | Builds interfaces out of components                                                                  |
| React Native | Cross-platform framework | Turns React components into native iOS / Android UI                                                  |
| **Expo**     | Development platform     | Adds a **CLI** (Command-Line Interface) and **official modules** (expo-image) on top of React Native |
| Metro        | Bundler                  | Bundles your code into one JS file and serves it to the app during development                       |
| Xcode        | Apple's developer tool   | Builds native iOS apps; includes the simulator                                                       |

How they stack:
```
Your code
   ↓ uses
Expo (CLI, routing, audio, images, and other modules)
   ↓ built on
React Native (native building blocks such as View and Text)
   ↓ built on
React (components, state)
```

## 2. Development Architecture
```
On the computer
  Node.js   ── runs ─────────────────▶ Expo CLI, Metro
  Your code (TypeScript + React + React Native) ──▶ Metro
  Expo CLI  ── expo start: starts ───▶ Metro
  Expo CLI  ── expo run:ios: calls ──▶ Xcode

On the phone / simulator
  Metro ── serves JS during development ──▶ App
  Xcode ── builds and installs locally ───▶ App
```

A mobile app has two halves:

| | Native shell (the TV) | JS code (the show) |
| --- | --- | --- |
| Contents | The iOS / Android program itself and its native features | The UI and logic you write |
| Made by | Xcode | Metro, which bundles and serves it |
| How often | Once; rebuilt only when native features change | Always running; saving a file refreshes the app |

- On the computer: Node.js, Code, Expo CLI, Metro, Xcode
- On the phone or simulator: the app (the simulator runs on the computer, but it imitates a phone)
- A released app has its JS bundled inside, so users' phones don't need Metro

## 3. Creating Your First Project
### Create and Start
```bash
npx create-expo-app@latest my-app --template blank-typescript
cd my-app
npx expo start
```
Scan the QR code with Expo Go on your phone, or press `i` in the terminal to open it in the iOS simulator.

| Part | Meaning |
| --- | --- |
| `npx` | Downloads a package temporarily and runs it once |
| `create-expo-app` | Expo's official project generator |
| `my-app` | Folder name; use `.` to generate into the current folder |
| `--template blank-typescript` | Template: a blank screen with TypeScript |

### Project Structure

| File | Purpose |
| --- | --- |
| `App.tsx` | The whole UI; this is where you write most of your code |
| `index.ts` | Entry point; registers `App` as the app. Rarely touched |
| `package.json` | Dependency list and script shortcuts |
| `app.json` | App settings: name, icon, orientation |
| `tsconfig.json` | TypeScript settings |
| `node_modules/` | Downloaded libraries; leave it alone |
| `assets/` | Icon and splash screen images |

### Startup Flow
```
npx expo start
  → reads package.json; the entry point is index.ts
    → index.ts imports App.tsx
      → Metro bundles it and serves it to Expo Go on the phone
        → the screen shows what App.tsx returns
```

## 4. Running the App: Expo Go vs. Development Build
| | Expo Go | Development Build |
| --- | --- | --- |
| What it is | A ready-made app built by Expo and published on the App Store | An app built from your own project |
| Who builds it with Xcode | Expo | You (`npx expo run:ios`) |
| Native features | Only the ones it ships with | Anything your project needs |
| How to run | `npx expo start`, then scan or press `i` | First time: `npx expo run:ios` to build and install; after that, `npx expo start` and tap the app icon |
| SDK version | The store version supports only one; your project must match | Follows your project |

- **Rule**: start with Expo Go; when you need a native feature it doesn't include (for example, native Google Sign-In), switch to a development build. Development builds are what Expo officially recommends for real projects
- A development build also connects to Metro, so code changes still refresh automatically; only the first build takes time

### What You See on the Simulator

| Icon | What it is | When opened |
| --- | --- | --- |
| Expo Go | Expo's general-purpose app, installed from the store | Runs your project **inside** it; one Expo Go can open many different projects |
| Your own app (e.g. my-app) | The development build of your project | A **standalone app** with its own icon and name |

- Every development build adds another standalone app to the simulator; until you set an icon, it shows Expo's default blue "A"
- The name under the icon comes from `name` in `app.json` (it can be `my-app`). The Xcode project in `ios/` can't contain hyphens, so it becomes `myapp` (`myapp.xcworkspace`)
- To open a development build's project in Xcode: `open ios/myapp.xcworkspace` (open the `.xcworkspace`, not the `.xcodeproj`)

### Experiment: A Successful Build Doesn't Mean It Launches

Running `npx expo run:ios` on an SDK 57 project with Xcode 27:

| Step | Result |
| --- | --- |
| Generate `ios/`, build, install on the simulator | All succeed |
| Open the app | Crashes. Log: `Application failed to launch: UIScene life cycle is required` |
| Open the same project in Expo Go | Works |

- Why: iOS 27 requires apps to adopt the UIScene life cycle. Projects generated by SDK 57 don't (they only have `AppDelegate`); SDK 58 adds it. The check happens **at launch**, so the build itself reports no error
- Expo Go isn't affected because Expo builds it themselves and it already supports UIScene
- Takeaway: when you build yourself, your Expo SDK has to match your Xcode version. A newer Xcode may require a newer SDK
- Cleanup: `rm -rf ios` removes the generated project; long-press the icon on the simulator to delete the app

### When You Need to Rebuild

| What changed | Rebuild? |
| --- | --- |
| `.ts` / `.tsx` files (UI, logic, text, colors) | No, saving is enough |
| Installed a library with native code | Yes |
| Changed `app.json` | Yes |
| Upgraded the Expo SDK | Yes |

## 5. Code Layers
Where an `import` comes from tells you which layer it belongs to:

| Layer | Contents | Example import |
| --- | --- | --- |
| React | Components, JSX, props, `useState`, `useEffect` | `import { useState } from 'react'` |
| React Native | `View` (container), `Text` (text), `StyleSheet` (styles) | `import { View, Text } from 'react-native'` |
| Expo | Official modules for routing, images, audio, and more | `import { Image } from 'expo-image'` |
| Your own files | Components and functions you write | `import { Greeting } from './Greeting'` |

Differences from React on the web:
- No `<div>`; use `<View>`
- All text must be inside `<Text>`
- Styles use `StyleSheet`, not CSS files
- `<View>` stacks its children top to bottom by default

## 6. Common Commands
| Command                  | Purpose                                                       |
| ------------------------ | ------------------------------------------------------------- |
| `npx expo start`         | Start Metro (the one you use every day); `Ctrl + C` to stop   |
| `npx expo start --clear` | Clear the cache and start; use it when you see strange errors |
| `npx expo install xxx`   | Install a package at a version compatible with your SDK       |
| `npx expo-doctor`        | Check dependencies and configuration                          |
| `npx expo run:ios`       | Build a development build and install it on the simulator     |
| `eas build`              | Build in Expo's cloud, without installing Xcode yourself      |

While Metro is running, press in the terminal: `i` iOS simulator, `a` Android emulator, `w` browser, `r` reload.

Run every command in the folder that contains `package.json`.

## 7. Common Misconceptions
- Node.js doesn't run on the phone: it only runs dev tools on your computer. The JS on the phone runs on Hermes, the engine bundled with React Native
- Node.js can't run **React Native**: React Native needs the phone's native UI components, so it only runs on a phone or simulator
- Xcode doesn't process TypeScript: Metro always transforms and bundles your TS; Xcode only builds the native shell
- `expo start` doesn't open a **simulator**: it only starts **Metro**. Open the simulator by pressing `i` or launching it yourself
- Every iOS app is built with Xcode: with Expo Go you don't need Xcode yourself only because Expo already built it
- Metro isn't specific to Expo: it's React Native's bundler, made by Meta; Expo just wraps it
- npm isn't only for Node.js: it's the package manager for the whole JS ecosystem, used for web, mobile, and backend alike

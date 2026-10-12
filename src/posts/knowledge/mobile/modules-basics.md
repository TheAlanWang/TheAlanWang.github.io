---
layout: layouts/post.njk
title: Modules Basics
description: Splitting a React Native app into files with ES Modules, named vs. default exports and when each is used, import paths and the @/ alias, and how to organize folders.
excerpt: How to split an Expo app into files, why only pages use export default, and how import paths and folders are organized.
date: 2026-10-11T12:00:00-07:00
category: Knowledge
subcategory: Mobile
topic: React Native
order: 3
kind: Note
tags:
  - posts
permalink: /posts/modules-basics/index.html
templateEngineOverride: md
---
## Why split files
With all the code in `App.tsx`, the file grows to hundreds of lines once you have a few components, and things get hard to find.
Splitting files means: **one component per file, imported wherever it's used.**

When to split: a component is longer than one screen, or two places need the same piece of UI.

## Overview
| Concept | In one line | Example |
| --- | --- | --- |
| export | Makes something in a file usable by other files | `export function Greeting() {...}` |
| import | Takes something from another file | `import { Greeting } from './components/greeting'` |
| Named export | A file can export several; you take them by name | `import { A, B } from './x'` |
| Default export | A file has at most one; you pick any name when importing | `import App from './App'` |
| Path | Tells import which file to look in | `./`, `../`, `@/` |
| Folders | Group files by purpose | `components/`, `api/`, `theme.ts` |

## 1. The first split: move a component out
Before splitting, `App.tsx`:
```tsx
import { Text, View } from 'react-native';

function Greeting({ name }: { name: string }) {
  return <Text>Hi, {name}!</Text>;
}

export default function App() {
  return (
    <View>
      <Greeting name="Alan" />
    </View>
  );
}
```

After splitting, create `components/greeting.tsx`:
```tsx
import { Text } from 'react-native';

export function Greeting({ name }: { name: string }) {
  return <Text>Hi, {name}!</Text>;
}
```

`App.tsx` becomes:
```tsx
import { View } from 'react-native';
import { Greeting } from './components/greeting';

export default function App() {
  return (
    <View>
      <Greeting name="Alan" />
    </View>
  );
}
```
- Each file stands on its own: `greeting.tsx` uses `Text`, so it imports `Text` at the top of its own file; `App.tsx` no longer uses `Text`, so that import can go
- The function needs `export` in front, or other files can't get it and you get the error "declares 'Greeting' locally, but it is not exported". If the name is misspelled and doesn't exist in the file at all, the error is "has no exported member"

## 2. Named vs. default exports
> **Bottom line**: everything you write and import yourself (components, utility functions, `theme.ts`, `auth-context.tsx`, …) uses `export` (a named export). Only files the framework loads on its own use `export default` (a default export), and in practice the only time you write one yourself is **when you add a new page**.

### When to use which
| File | Who loads it | Which | Who writes it |
| --- | --- | --- | --- |
| `App.tsx` (without Expo Router) | `index.ts` hands it to Expo | `export default` | Already in the template, leave it |
| Pages and `_layout.tsx` in `app/` | Expo Router | `export default` | **You, for every new page** |
| Everything else: `components/`, `api/`, `theme.ts`, `utils.ts`, … | You import it | `export` | You |

With Expo Router, `App.tsx` and `index.ts` go away. The entry point becomes `"main": "expo-router/entry"` in `package.json`, and the outermost file is `app/_layout.tsx` (or `src/app/_layout.tsx` if your code lives in `src/`).

**Adding a page**: create `about.tsx` in `app/`:
```tsx
import { Text, View } from 'react-native';

export default function AboutScreen() {
  return (
    <View>
      <Text>About</Text>
    </View>
  );
}
```
- When Expo Router sees `app/about.tsx`, an `/about` page exists automatically, and it takes this file's `default` to draw it. You don't import it anywhere
- Forget the `default` and you get the warning "Route "./about.tsx" is missing the required default export", and the page won't open
- Buttons and cards used inside the page still go in `components/` with named exports

A real example: in one Expo Router project, `export default` appears only in the 7 files under `src/app/`; the 15 components in `components/` and `auth/auth-context.tsx` (which exports `AuthProvider` and `useAuth`) all use named exports.

### Why pages use `default`: some components aren't called by you
A component is just a function. **Defining it doesn't run it.** Someone has to call it (write `<Xxx />`) before it's drawn on screen. Look at who calls each of these two components in the practice project:

| Component | Who calls it | Where |
| --- | --- | --- |
| `Greeting` | You | The `<Greeting name="Alan" />` you wrote in `App.tsx` |
| `App` | Not you | You can't find `<App` anywhere in your code, yet it's what's on screen |

You call `Greeting`, so you know its name and can import it by name (a named export).

`App` is the outermost component of the whole UI. **No component wraps it or calls it.** When the app opens, Expo and React Native run first. Once the screen is ready, they need to know which component to draw first, and they have to go into your files and get that answer themselves. That's what "the framework loads it" means.

The loading happens in the template-generated `index.ts` (you didn't write it, but you can open it):
1. Expo reads `"main": "index.ts"` in `package.json` and starts running from `index.ts`
2. `index.ts` takes the `default` of `App.tsx` and hands it to Expo:
   ```tsx
   import App from './App';        // take App.tsx's default, whatever it's named
   registerRootComponent(App);     // tell Expo: draw this component on startup
   ```
3. React Native renders `App`, and the `<Greeting />` inside `App` renders layer by layer

```
Expo starts → index.ts → App (loaded by the framework) → Greeting (called by you)
```

**Why the loading uses `default`**: `index.ts` was written by the template's author, who can't know whether your root component is called `App` or `Abc`, so loading it by name would fail. The convention is: you mark the root component `export default`, and they only take the thing named `default`. To check: rename `App` to `Abc` and it still runs with no change to `index.ts`; remove `default` and `index.ts` can't find it and throws an error.

Expo Router pages work the same way: you never call any page. Wherever the user taps, Expo Router goes into `app/` and takes the matching file to draw. It loads dozens of files and doesn't know what each page is called either, so every file in `app/` must use `export default`.

### What `default` is
**Where it comes from**: `export` / `import` / `default` are built-in JavaScript syntax called **ES Modules**.
- **ES** = ECMAScript, JavaScript's official standard name; **Module** = each file is a module. What's inside is only usable within that file by default; to let others use it you `export` it, and to use someone else's you `import` it
- Added to JavaScript in 2015. Before that there was no official way, so Node.js invented its own system, CommonJS: `require('./x')`, `module.exports = ...`
- You'll see both in an Expo project: the `.ts` / `.tsx` files you write are all ES Modules; config files like `eslint.config.js` often still use `require` / `module.exports`
- React Native also uses `require` for local images: `<Image source={require('./logo.png')} />`

**What it is**: everything a file exports has a name, and other files take it by that name.
- `export function Greeting` → the exported name is `Greeting`
- `export default function App` → the exported name is **not `App`, it's `default`**. `App` is only the function's name inside the file

So `import App from './App'` is shorthand. The full form is:
```tsx
import { default as App } from './App';   // take the one named default, and call it App here
```

That's where the two rules for default exports come from:
- **At most one**: a file can't have two things both named `default`. Writing two gives the error "A module cannot have multiple default exports"
- **Any name you like**: `default` is a JavaScript reserved word and can't be used as a variable name, so when importing you **must** give it another name, and any name works. `import App from './App'` and `import Main from './App'` get the same function

You can use both at once: in `import React, { useState } from 'react'`, `React` is react's `default` and `useState` is a named export.

### The two side by side
| | Named export | Default export |
| --- | --- | --- |
| Syntax | `export function Greeting` | `export default function App` |
| How many per file | Any number | At most one |
| Import syntax | `import { Greeting } from '...'`, with braces | `import App from '...'`, no braces |
| Name | Must match the export | Anything you like |

```tsx
// utils.ts: one file with several named exports
export const APP_NAME = 'My App';
export function double(n: number) { return n * 2; }

// where it's used: take them by name; a wrong name gets nothing
import { APP_NAME, double } from './utils';
```
- Not just components: constants, plain functions, and types can all be exported
- To use a named export under a different name, use `as`: `import { Greeting as Hello } from './greeting'`

**With other people's libraries you don't get a choice**: import it however the library exports it, following the examples in its docs.
```tsx
import Ionicons from '@expo/vector-icons/Ionicons';   // this library uses a default export
import { useState } from 'react';                     // this library uses named exports
```

### Common mistakes
- **Wrong braces**: the editor flags it first
  - Named export without `{ }`: `import Greeting from './greeting'` → "has no default export"
  - Default export with `{ }`: `import { App } from './App'` → "has no exported member 'App'. Did you mean to use 'import App from ...'"
  - Run it anyway and you get `undefined`, with the runtime error "Element type is invalid"
- **Two `export default`s**: the error "A module cannot have multiple default exports"
- **Default exports for your own components**: it runs, but every file can give it a different name, so you can't search for it. Don't do this

**Exercise**: create `utils.ts` that exports `APP_NAME` and `double`, import both in `App.tsx` with one import line, and display `{APP_NAME}` and `{double(21)}`.

## 3. Writing paths
| Form | Meaning | Example |
| --- | --- | --- |
| `./` | The folder the current file is in | `./components/greeting` in `App.tsx` |
| `../` | One level up | `../utils` in `components/card.tsx` |
| `@/` | An alias you define that points to a fixed folder (set in `tsconfig.json`) | `@/components/greeting`, the same in any file |
| No dot | A package in `node_modules` | `react-native`, `expo-router` |

- You don't write the `.ts` / `.tsx` extension
- With many files, `../../../components/x` is hard to count, so large projects use `@/`

### `@/` vs. `./`
- `./` and `../` count levels **from the current file**, so the same target is written differently in different files
- `@/` starts **from one fixed folder**, so it's the same in every file, and imports don't change when a file moves

Both importing `src/theme.ts`:

| Written in | With `./` `../` | With `@/` |
| --- | --- | --- |
| `src/components/player-controls.tsx` | `'../theme'` | `'@/theme'` |
| `src/app/video/[youtubeId].tsx` | `'../../theme'` | `'@/theme'` |

### Setting it up
`@` isn't a special symbol, just the nickname people usually pick. It's defined under `paths` in `tsconfig.json`:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
- Meaning: anything starting with `@/` is replaced with `./src/`. `@/auth/auth-context` is `src/auth/auth-context.tsx`
- If your code sits in the project root instead of `src/`, write `"@/*": ["./*"]`
- TypeScript and Expo both read this config, so the editor doesn't complain and the app runs
- Restart `npx expo start` after changing `tsconfig.json`
- The default `npx create-expo-app` template includes this config; projects made from an empty template like `blank` don't, so `@/` fails with "not found" until you add it

A real example: one project sets it up this way, plus a separate entry for `assets/`, because images and fonts live outside `src/`:
```json
"paths": {
  "@/*": ["./src/*"],
  "@/assets/*": ["./assets/*"]
}
```
Every import uses `@/`:
```tsx
import { usePalette } from '@/theme';
import { AuthProvider } from '@/auth/auth-context';
```

## 4. Organizing folders
A common layout:

| Folder | What goes in it |
| --- | --- |
| `app/` | Pages (with Expo Router) |
| `components/` | Reusable components, like buttons and cards |
| `hooks/` | Your own `use...` functions |
| `api/` | All code that calls the backend |
| `constants/` or `theme.ts` | Constants like colors and font sizes |

- One component per file, with file names in **lowercase + hyphens**: the `VideoCard` component goes in `video-card.tsx`
  - The component name still starts with a capital letter, because JSX uses the capital letter to tell components from plain tags; only the file name is lowercase
  - macOS file names aren't case-sensitive; Linux's are. With a file named `Greeting.tsx` imported as `./greeting`, the editor usually flags it, but it still runs on a Mac, then breaks in CI or on someone else's Linux machine. All-lowercase avoids this trap
  - The practice project's `App.tsx` is the template's built-in entry point; leave it as is

### A real example
```
src/
├── app/          pages
├── components/   button.tsx, video-card.tsx, player-controls.tsx ...
├── api/          backend calls
├── auth/         sign-in
├── player/       player logic
├── __tests__/    tests
├── format.ts     small helpers like time formatting
└── theme.ts      colors, spacing, corner radius, font sizes
```
- No `constants/`: the constants are just colors, spacing, and font sizes, which fit in one `theme.ts`. Add a folder once there are more
- No `hooks/` either: each hook lives next to the code that uses it. `usePalette` is in `theme.ts`, and the player's `useADPlayer` is in `src/player/` with the playback logic

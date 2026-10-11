---
layout: layouts/post.njk
title: React Basics
description: Components, JSX, props, arrow functions, hooks, state, events, effects, lists, and styles in React Native, each with a runnable example and exercise.
excerpt: The core React ideas behind a React Native app, from components and props to state, effects, and lists.
date: 2026-10-11T12:00:00-07:00
category: Knowledge
subcategory: Mobile
topic: React Native
kind: Note
tags:
  - posts
permalink: /posts/react-basics/index.html
templateEngineOverride: md
---
## What React is
React is a library for building interfaces out of **components**. You describe what the screen should look like for the current data. When the data changes, React updates the screen.

The web (React) and mobile (React Native) use the same idea. For the environment and tools, see [Expo Basics](/posts/expo-basics/).

## Overview
| Concept               | In one sentence                                                                                                                                                                       | Example                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Component             | A **function** that returns UI. Its name starts with a capital letter.                                                                                                                | `function Greeting() { return <Text>Hi</Text>; }` |
| JSX                   | Syntax written in JavaScript that looks like HTML                                                                                                                                     | `<View><Text>Hi</Text></View>`                    |
| Props<br>(Properties) | Data passed in from outside the component                                                                                                                                             | `<Greeting name="Alan" />`                        |
| Arrow function        | A way to write a function without the `function` keyword, often handed to something else to call later                                                                               | `() => setCount(count + 1)`                       |
| Hook                  | A React function whose name starts with `use`. It lets a component remember data and do work after drawing.<br>Call it at the top level of the component, not inside `if` or loops.   | `useState` / `useEffect`                          |
| State                 | Data the component keeps itself and can change; changing it updates the screen.<br>`useState(initialValue)`: one parameter. Returns `[value, setter]`.                                | `const [count, setCount] = useState(0)`           |
| Event                 | A function that runs when the user does something.<br>`onPress={function}`: pass the function itself, without `()`.                                                                   | `<Pressable onPress={...}>`                       |
| Effect                | Work that runs after the screen is drawn, such as fetching data.<br>`useEffect(function, array)`: the function is required; the array is optional and decides when it runs again.     | `useEffect(() => { ... }, [])`                    |
| List                  | Turns an array of data into a list of components                                                                                                                                      | `items.map(...)` / `<FlatList>`                   |
| Style                 | Define style objects with `StyleSheet.create` and pass them to a component through the `style` prop                                                                                   | `<View style={styles.container}>`                 |

## 1. Components and JSX
A component is a function: its name starts with a capital letter, and it returns JSX.
```tsx
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View>
      <Text>Hello</Text>
    </View>
  );
}
```
- JSX looks like HTML, but it is JavaScript. In JSX, `{ }` means "run some JavaScript here": `<Text>{1 + 1}</Text>` shows `2`
- A component returns a single outermost element. To return several sibling elements, wrap them in `<View>` (or `<>...</>`)
- Using a component is like using a tag: `<Greeting />` (written in the next section)

## 2. Props: passing data in from outside
Props let the same component show different content. They are the component's **input**, like a function's parameters.
```tsx
function Greeting({ name }: { name: string }) {
  return <Text>Hi, {name}!</Text>;
}

export default function App() {
  return (
    <View>
      <Greeting name="Alan" />
      <Greeting name="Serina" />
    </View>
  );
}
```
- `name="Alan"` is written like an HTML attribute. Strings use quotes; other types use curly braces: `count={3}`
- `{ name }: { name: string }` takes `name` out of the props object. TypeScript requires it to be a string.
- Props are **read-only**: a component cannot change the props it receives.
- You have already used props: `style={styles.container}` on `View` is one (see section 9).

**Function templates**
```ts
function name(parameter: type, parameter: type): returnType {
  return value;
}
```

```tsx
function Name({ prop, prop }: { prop: type; prop: type }) {
  return <JSX />;
}
```
A component has one parameter, the props object, so its type goes after the whole `{ prop, prop }`.

```tsx
function Greeting({ name, age }: { name: string; age: number }) {
  return <Text>Hi, {name} ({age})!</Text>;
}

<Greeting name="Alan" age={25} />
```
Numbers go in curly braces: `age={25}`. `age="25"` is a string, which does not match `number`.

## 3. Arrow functions
Another way to write a function, without the `function` keyword. Similar to Python's `lambda`.
```ts
const name = (parameter: type, parameter: type) => {
  return value;
};
```

Three shapes:
```ts
() => oneExpression
(x) => oneExpression
() => {
  statement;
  statement;
}
```
- With one expression and no `{ }`, its value is returned automatically: `(a, b) => a + b`
- With `{ }`, write `return` yourself. `(a, b) => { a + b; }` returns nothing.

In React, arrow functions are usually handed to something else, which calls them later:
```tsx
onPress={() => setCount(count + 1)}   // runs on tap
useEffect(() => { ... }, [])           // runs after drawing
.then((res) => res.json())             // runs when the data arrives
```
- `onPress={() => setCount(0)}` hands the function over as a **callback** for the tap. React does not run it when it reaches this line. `setCount` is called only when the tap happens.
- Without the arrow function, `onPress={setCount(0)}` runs `setCount(0)` as soon as React reaches this line. `setCount` triggers a redraw, the redraw reaches this line again, and so on. React stops with the error "Too many re-renders".

## 4. Hook
A hook is a React function whose name starts with `use`, such as `useState` and `useEffect`. A component is a plain function that runs again from the top on every draw (React calls this a *render*), so its ordinary variables start over each time. Hooks let it remember data (`useState`) and do work after drawing (`useEffect`).

Call hooks at the top level of the component, before `return`, not inside `if` or loops, so they run every time the component runs.

```tsx
export default function App() {
  const [count, setCount] = useState(0);    // 1st call
  const [name, setName] = useState('Alan');  // 2nd call
  return <Text>{count}, {name}</Text>;
}
```

`count` and `name` are names you choose. React does not use those names. It stores the data in its own list, in the order the hooks are called.

The first time the screen is drawn, React records slot 1 as `0` and slot 2 as `'Alan'`. When the component draws again, the function runs from the top. The 1st `useState` reads slot 1 again (the number may now be `1`), and the 2nd reads slot 2.

Inside an `if` or a loop, a hook sometimes runs and sometimes does not, so the slots no longer match. `onPress` can call `setCount`. It cannot call `useState`.

## 5. State: data that can change
State is data the component remembers itself. When it changes, React draws this component again.
```tsx
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <View>
      <Text>Pressed {count} times</Text>
      <Pressable onPress={() => setCount(count + 1)}>
        <Text>Press me</Text>
      </Pressable>
    </View>
  );
}
```
- `useState(0)` returns two things: the current value (`count`) and the function that changes it (`setCount`). `0` is the initial value.
	- `count` is a number. `setCount` is a function. `setCount(4)` calls it, and `4` is the argument: set this data to `4`.
- Change it through `setCount`. `count` is a `const`, which cannot be reassigned, so `count = count + 1` is an error.
- `() => setCount(count + 1)` is an arrow function (see section 3). The outer `{}` belongs to JSX.

|                             | Props                               | State                                   |
| --------------------------- | ----------------------------------- | --------------------------------------- |
| Where it comes from         | Passed in from outside (the parent) | The component's own                     |
| Can the component change it | No                                  | Yes, with its setter                    |
| Example                     | `<Greeting name="Alan" />`          | `const [count, setCount] = useState(0)` |

Exercise: Add a Reset button that sets `count` back to 0.

```tsx
<Pressable onPress={() => setCount(0)}>
  <Text>Reset</Text>
</Pressable>
```
`setCount` wants the new number. After a reset, that number is `0`, so pass it in directly. Press me is written `setCount(count + 1)` because the new number is the current value plus 1. `count = 0` does not work: `count` is a `const`, and only `setCount` updates the screen.

## 6. Events: responding to the user
On a phone, the user taps. There is no mouse click. `Pressable` can make any content tappable.
```tsx
import { Pressable, Text } from 'react-native';

<Pressable onPress={() => alert('Tapped')}>
  <Text>Press me</Text>
</Pressable>
```
- Pass **a function** to `onPress`. Write `onPress={handleTap}`. `onPress={handleTap()}` runs at once, instead of waiting for the tap.
- `TextInput` is how the user types text: `<TextInput value={text} onChangeText={setText} />`

Exercise: Store what the user types in a `name` state with a `TextInput`. Show it live in `Greeting` below.

```tsx
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

function Greeting({ name }: { name: string }) {
  return <Text>Hi, {name}!</Text>;
}

export default function App() {
  const [name, setName] = useState('');

  return (
    <View>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        style={{ borderWidth: 1, width: 150, padding: 8 }}
      />
      <Greeting name={name} />
    </View>
  );
}
```
- `value={name}` is the text shown in the box. Each change calls `setName` with the new string.
- `setName` is already a function, so pass it directly, like `onPress={handleTap}`. No `() =>` needed.
- When `name` changes, the component draws again and `Greeting` shows the new text.
- `TextInput` has no border by default. Without a `style`, it is almost invisible.

## 7. Effect: work after the screen is drawn
Effect comes from **side effect**. A component's job is to turn data into JSX. Anything else that reaches outside, such as fetching data, starting a timer, or reading phone storage, is a side effect. Put it in `useEffect`, which runs after the screen is drawn.
- A component runs from the top on every redraw. A `fetch` written directly in the function would send a request on every redraw.
- Drawing first (for example, showing "Loading...") and fetching after means the user does not stare at a blank screen.
```tsx
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

export default function App() {
  const [title, setTitle] = useState('Loading...');

  useEffect(() => {
    fetch('https://jsonplaceholder.typicode.com/todos/1')
      .then((res) => res.json())
      .then((data) => setTitle(data.title));
  }, []);

  return (
    <View>
      <Text>{title}</Text>
    </View>
  );
}
```
The first draw shows "Loading...". After drawing, the effect fetches the data. `setTitle` changes the state, and the screen draws again with the title. This is the common pattern: show "Loading...", fetch in the effect, store the result in state, and the screen redraws with the data.

**Two parameters**
```tsx
useEffect(function, array);
useEffect(() => {
  ...
}, []);
```
The function is required. The array is optional. With an arrow function, everything up to and including `}` is the first parameter, `, []` is the second, and the final `)` closes `useEffect(`.

**The array decides when it runs again**
The array does not call the function. It lists values to watch; when one of them changes, the effect runs again:
- `[]`: nothing to watch. Runs once, when the component first appears.
- `[id]`: runs once at first, then again every time `id` changes.
- No array: runs after every redraw. Here that means a new request every time anything changes, such as each letter typed in a `TextInput`. If the effect also changes state, that change causes a redraw, the redraw runs the effect again, and it can turn into endless requests.

**A named function works too**
After drawing, React calls the function you handed it. An arrow function is just the shortest way to write it:
```tsx
function loadTitle() {
  fetch('https://jsonplaceholder.typicode.com/todos/1')
    .then((res) => res.json())
    .then((data) => setTitle(data.title));
}
useEffect(loadTitle, []);
```
`useEffect(loadTitle, [])` has no `()` after `loadTitle`: you pass the function itself, like `onPress={handleTap}`. Write `loadTitle` inside the component, so it can use `setTitle`.

**Why `res` is never assigned**
`res` is a parameter of the arrow function. `fetch` has to wait for the network, so you do not write `res = ...` yourself. You hand a function to `.then`. When the result arrives, `.then` calls that function with the result, and that is when `res` gets its value. `data` works the same way.
```python
def handle(res):      # Python version: res is a parameter
    return res.json()
```

Exercise: Add a Next button. Each tap shows the title of the next todo.

```tsx
const [id, setId] = useState(1);
const [title, setTitle] = useState('Loading...');

useEffect(() => {
  fetch(`https://jsonplaceholder.typicode.com/todos/${id}`)
    .then((res) => res.json())
    .then((data) => setTitle(data.title));
}, [id]);

return (
  <View>
    <Text>#{id}: {title}</Text>
    <Pressable onPress={() => setId(id + 1)}>
      <Text>Next</Text>
    </Pressable>
  </View>
);
```
Tapping Next calls `setId`, which changes `id`. The component draws again, React sees that `id` in `[id]` changed, and the effect runs again to fetch the next todo. `` `...${id}` `` is a template string: `${id}` is replaced with the current value of `id`.

## 8. Lists: showing many items
Use `map` to turn an array into a list of components. Each item needs a unique `key`.
```tsx
import { Text, View } from 'react-native';

function Greeting({ name }: { name: string }) {
  return <Text>Hi, {name}!</Text>;
}

export default function App() {
  const names = ['Alan', 'Serina', 'Kien'];

  return (
    <View>
      {names.map((n) => (
        <Greeting key={n} name={n} />
      ))}
    </View>
  );
}
```
`names.map((n) => ...)` calls the arrow function once for each item. `n` is `'Alan'`, then `'Serina'`, then `'Kien'`, so it returns three `<Greeting />`.

**How `map` works**
```ts
array.map((item) => newValue)
```
It calls the function once for each item and collects the return values into a **new array**. The new array has the same length. The original array does not change.
```ts
const nums = [1, 2, 3];
nums.map((x) => x * 2);                          // [2, 4, 6]
names.map((n) => <Greeting key={n} name={n} />);  // three <Greeting />
```
- `(n) => (` uses parentheses, not `{`. Wrapping multi-line JSX in `( )` returns it directly. With `{ }`, write `return` yourself.
- `key` lets React tell items apart when the list changes. Use an id, not the array index.
- For a long, scrolling list, use `FlatList`. It draws only the items visible on screen:
```tsx
<FlatList data={names} keyExtractor={(n) => n} renderItem={({ item }) => <Greeting name={item} />} />
```

**Exercise**: Fetch the list from `https://jsonplaceholder.typicode.com/todos` and show all the titles with `FlatList`.

## 9. Styles and layout
```tsx
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(255, 255, 255)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```
`<View style={styles.container}>` uses this `container`. The name after `styles` is yours to choose. One file can have several.

- `flex: 1`: fill the space the parent has left. As the outermost view of the screen, that fills the screen.
- `backgroundColor: 'rgb(255, 255, 255)'`: a white background. `255, 255, 255` means red, green, and blue are all at full.
- `alignItems: 'center'`: center on the cross axis. Children stack from top to bottom by default, so this centers them horizontally.
- `justifyContent: 'center'`: center along the stacking direction. Children stack from top to bottom by default, so this centers them vertically.

Putting `const styles` below the component is the template's habit, so the UI comes first when you open the file. Putting it above works the same.

When the file loads, it runs from top to bottom:
1. Compiling (Metro) only translates `.tsx` into JavaScript. `StyleSheet.create` has not run yet.
2. At `function App() { ... styles.container ... }`, the function is only stored. The code inside does not run yet.
3. Execution continues downward. At `const styles = ...`, the object is created.
4. After the whole file has finished running, React calls `App()`. Only then is `styles.container` read, and the object is already there.

## 10. How it all fits together
```
Data (props passed in by the parent + the component's own state)
   ↓
The component function runs and returns JSX
   ↓
React Native draws it as native UI
   ↓
The user taps / data arrives → state changes
   ↓
The component function runs again with the new data → the screen updates
```
The core idea: you never change the screen directly. You change the data, and React redraws.

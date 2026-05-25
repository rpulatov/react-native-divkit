# DivKit React Native API Reference

Complete API documentation for `react-native-divkit`.

## Table of Contents

- [DivKit Component](#divkit-component)
- [Props](#props)
- [Callbacks](#callbacks)
- [Types](#types)
- [Hooks](#hooks)
- [Variables](#variables)
- [Context](#context)
- [Utilities](#utilities)
- [Components (MVP)](#components-mvp)
- [Action Animation](#action-animation)
- [Transitions](#transitions)
- [Expression Syntax](#expression-syntax)
- [Local Variables](#local-variables)

---

## DivKit Component

The main entry point for rendering DivKit layouts.

```tsx
import { DivKit } from 'react-native-divkit';

<DivKit
    data={divKitJson}
    onStat={handleStat}
    onCustomAction={handleCustomAction}
    onError={handleError}
    direction="ltr"
    platform="touch"
    style={{ flex: 1 }}
    id="my-divkit"
/>;
```

---

## Props

### `DivKitProps`

| Prop             | Type                   | Required | Default   | Description                       |
| ---------------- | ---------------------- | -------- | --------- | --------------------------------- |
| `data`           | `Partial<DivJson>`     | Yes      | -         | DivKit JSON data to render        |
| `onStat`         | `StatCallback`         | No       | -         | Callback for statistics/analytics |
| `onCustomAction` | `CustomActionCallback` | No       | -         | Callback for custom URL actions   |
| `onError`        | `ErrorCallback`        | No       | -         | Callback for error handling       |
| `direction`      | `'ltr' \| 'rtl'`       | No       | `'ltr'`   | Text direction                    |
| `platform`       | `'desktop' \| 'touch'` | No       | `'touch'` | Platform type                     |
| `style`          | `ViewStyle`            | No       | -         | Custom style for root container   |
| `id`             | `string`               | No       | `'root'`  | Component ID for debugging        |
| `typefaceProvider` | `TypefaceProvider`   | No       | system    | Maps `font_family` → platform font |
| `imageAdapter`   | `DivImageAdapter`      | No       | `rnImageAdapter` | Pluggable image renderer ([details](#image-adapter)) |

### `data` - DivJson Structure

```typescript
interface DivJson {
    card: {
        log_id: string;
        states: Array<{
            state_id: number | string;
            div: DivBaseData;
        }>;
        variables?: DivVariable[];
    };
    templates?: Record<string, any>;
}
```

> **Note.** Beyond `card.variables`, any inner div-node (or template body) can
> declare its own `variables: DivVariable[]` array — it creates a local scope
> visible to that node's descendants in `@{...}` expressions and inside
> action `url` / `typed.value` fields. See [Local Variables](#local-variables).

**Example:**

```json
{
    "card": {
        "log_id": "my_card",
        "states": [
            {
                "state_id": 0,
                "div": {
                    "type": "text",
                    "text": "Hello, @{name}!"
                }
            }
        ],
        "variables": [
            {
                "type": "string",
                "name": "name",
                "value": "World"
            }
        ]
    }
}
```

---

## Callbacks

### `StatCallback`

Called when actions are executed (for analytics/logging).

```typescript
type StatCallback = (stat: { type: string; action: Action }) => void;
```

**Example:**

```tsx
const handleStat = stat => {
    analytics.track(stat.type, {
        action_id: stat.action.log_id,
        url: stat.action.url
    });
};
```

### `CustomActionCallback`

Called for actions with custom URLs (e.g., `divkit://...`).

```typescript
type CustomActionCallback = (action: Action & { url: string }) => void;
```

**Example:**

```tsx
const handleCustomAction = action => {
    const url = new URL(action.url);

    switch (url.protocol) {
        case 'divkit:':
            // Handle DivKit-specific actions
            break;
        case 'deeplink:':
            // Navigate using deep linking
            navigation.navigate(url.pathname);
            break;
    }
};
```

### `ErrorCallback`

Called when errors occur during rendering or action execution.

```typescript
type ErrorCallback = (error: WrappedError) => void;

interface WrappedError {
    message: string;
    stack?: string;
    additional?: Record<string, unknown>;
}
```

**Example:**

```tsx
const handleError = error => {
    console.error('[DivKit]', error.message);
    Sentry.captureException(error);
};
```

---

## Types

### `Action`

```typescript
interface Action {
    log_id: string;
    url?: string;
    typed?: TypedAction;
    log_url?: string;
    payload?: Record<string, unknown>;
}
```

### `TypedAction`

```typescript
type TypedAction =
    | { type: 'set_variable'; variable_name: string; value: TypedValue }
    | { type: 'set_state'; state_id: string; temporary_state_id: string }
    | { type: 'array_insert_value'; variable_name: string; index: number; value: unknown }
    | { type: 'array_remove_value'; variable_name: string; index: number }
    | { type: 'array_set_value'; variable_name: string; index: number; value: unknown }
    | { type: 'dict_set_value'; variable_name: string; key: string; value: unknown }
    | { type: 'copy_to_clipboard'; text: string };
```

### `DivVariable`

```typescript
interface DivVariable {
    type: 'string' | 'integer' | 'number' | 'boolean' | 'color' | 'url' | 'dict' | 'array';
    name: string;
    value: unknown;
}
```

### `DivBaseData`

Base interface for all div components.

```typescript
interface DivBaseData {
    type: string;
    id?: string;
    visibility?: 'visible' | 'invisible' | 'gone';
    alpha?: number;
    background?: Background[];
    border?: Border;
    paddings?: EdgeInsets;
    margins?: EdgeInsets;
    width?: Size;
    height?: Size;
    actions?: Action[];
    action_animation?: Animation;
    transition_in?: AppearanceTransition;
    transition_out?: AppearanceTransition;
    transition_change?: TransitionChange;
    transition_triggers?: TransitionTrigger[];
    // ... component-specific properties
}
```

### `Animation`

Animation applied on tap (action_animation).

```typescript
type AnimationType = 'fade' | 'scale' | 'native' | 'no_animation' | 'translate';

interface AnyAnimation {
    name: AnimationType;
    duration?: number;        // ms, default: 300
    start_delay?: number;     // ms, default: 0
    start_value?: number;     // default: 1
    end_value?: number;       // default: 1
    interpolator?: Interpolation;  // default: 'ease_in_out'
}

interface AnimationSet {
    name: 'set';
    items: Animation[];
}

type Animation = AnyAnimation | AnimationSet;

type Interpolation = 'linear' | 'ease' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'spring';
```

### `AppearanceTransition` (transition_in / transition_out)

```typescript
interface TransitionBase {
    duration?: number;       // ms, default: 300
    start_delay?: number;    // ms, default: 0
    interpolator?: Interpolation;
}

interface FadeTransition extends TransitionBase {
    type: 'fade';
    alpha?: number;          // start (for in) / end (for out) alpha, default: 0
}

interface ScaleTransition extends TransitionBase {
    type: 'scale';
    scale?: number;          // start / end scale, default: 0
    pivot_x?: number;        // 0..1, default: 0.5
    pivot_y?: number;        // 0..1, default: 0.5
}

interface SlideTransition extends TransitionBase {
    type: 'slide';
    edge?: 'left' | 'top' | 'right' | 'bottom'; // default: 'bottom'
    distance?: Dimension;    // if absent — window size is used
}

type AnyTransition = FadeTransition | ScaleTransition | SlideTransition;

interface TransitionSet {
    type: 'set';
    items: AppearanceTransition[];
}

type AppearanceTransition = AnyTransition | TransitionSet;

type TransitionTrigger = 'state_change' | 'visibility_change';
```

### `TransitionChange` (transition_change)

```typescript
interface ChangeBoundsTransition extends TransitionBase {
    type: 'change_bounds';
}

type TransitionChange =
    | ChangeBoundsTransition
    | { type: 'set'; items: TransitionChange[] };
```

---

## Hooks

### `useDivKitContext`

Access the DivKit context from within a component.

```typescript
import { useDivKitContext } from 'react-native-divkit';

function MyComponent() {
  const { variables, setVariable, getVariable } = useDivKitContext();

  const updateName = () => {
    setVariable('userName', 'Alice');
  };

  return <Button onPress={updateName} title="Update Name" />;
}
```

**Context Value:**

```typescript
interface DivKitContextValue {
    // Variable management
    variables: Map<string, Variable>;
    getVariable: (name: string) => Variable | undefined;
    setVariable: (name: string, value: unknown) => void;

    // Action execution
    execAnyActions: (actions: Action[]) => Promise<void>;

    // Callbacks
    logStat: (type: string, action: Action) => void;
    execCustomAction: (action: Action & { url: string }) => void;

    // Configuration
    direction: 'ltr' | 'rtl';
    platform: 'desktop' | 'touch';

    // Component registration
    registerComponent: (id: string, context: ComponentContext) => void;
    unregisterComponent: (id: string) => void;

    // ID generation
    genId: (key: string) => string;
}
```

### `useVariable`

Subscribe to a variable by name.

```typescript
import { useVariable } from 'react-native-divkit';

function Counter() {
  const count = useVariable('counter');
  return <Text>Count: {count}</Text>;
}
```

### `useVariableState`

Get both value and setter for a variable.

```typescript
import { useVariableState } from 'react-native-divkit';

function Counter() {
  const [count, setCount] = useVariableState('counter');

  return (
    <View>
      <Text>Count: {count}</Text>
      <Button onPress={() => setCount(count + 1)} title="+" />
    </View>
  );
}
```

### `useDerivedFromVars`

Evaluate expressions with variable substitution.

```typescript
import { useDerivedFromVars } from 'react-native-divkit';

function Greeting() {
  const text = useDerivedFromVars('Hello, @{userName}!', variables);
  return <Text>{text}</Text>;
}
```

### `useAction`

Create action handlers.

```typescript
import { useAction } from 'react-native-divkit';

function ActionButton() {
  const handlePress = useAction({
    action: {
      log_id: 'button_tap',
      typed: { type: 'set_variable', variable_name: 'count', value: 0 }
    }
  });

  return <Button onPress={handlePress} title="Reset" />;
}
```

### `useActionHandler`

Create a press handler from an array of actions.

```typescript
import { useActionHandler, useHasActions } from 'react-native-divkit';

function ActionableComponent({ actions }) {
  const handlePress = useActionHandler(actions);
  const hasActions = useHasActions(actions);

  if (!hasActions) {
    return <View>{/* non-interactive content */}</View>;
  }

  return <Pressable onPress={handlePress}>{/* content */}</Pressable>;
}
```

---

## Variables

### Variable Types

| Type      | TypeScript Type           | Example Value      |
| --------- | ------------------------- | ------------------ |
| `string`  | `string`                  | `"Hello"`          |
| `integer` | `number`                  | `42`               |
| `number`  | `number`                  | `3.14`             |
| `boolean` | `boolean`                 | `true`             |
| `color`   | `string`                  | `"#FF5500"`        |
| `url`     | `string`                  | `"https://..."`    |
| `dict`    | `Record<string, unknown>` | `{ key: "value" }` |
| `array`   | `unknown[]`               | `[1, 2, 3]`        |

### `createVariable`

Create a variable instance programmatically.

```typescript
import { createVariable } from 'react-native-divkit';

const myVar = createVariable('counter', 'integer', 0);

// Subscribe to changes
myVar.subscribe(value => {
    console.log('Counter changed:', value);
});

// Update value
myVar.setValue(10);

// Get current value
const current = myVar.getValue();
```

### Variable Class

```typescript
class Variable<T> {
    readonly name: string;
    readonly type: VariableType;

    getValue(): T;
    setValue(value: T): void;
    subscribe(callback: (value: T) => void): () => void;
}
```

---

## Context

### `DivKitContext`

React context for DivKit state. Used internally by components.

```typescript
import { DivKitContext } from 'react-native-divkit';

// Access in class components
static contextType = DivKitContext;
```

### `useDivKitContext`

Hook to access the context (recommended).

```typescript
const ctx = useDivKitContext();
```

---

## Utilities

### `correctColor`

Convert DivKit color format to React Native format.

```typescript
import { correctColor } from 'react-native-divkit';

const color = correctColor('#FF5500'); // "#FF5500"
const rgba = correctColor('#80FF5500'); // "rgba(255, 85, 0, 0.5)"
```

### `wrapError`

Wrap errors with additional context.

```typescript
import { wrapError } from 'react-native-divkit';

try {
    // ...
} catch (err) {
    const wrapped = wrapError(err, {
        additional: { component: 'DivText', prop: 'text' }
    });
    onError(wrapped);
}
```

---

## Components (MVP)

### DivText

Text rendering component.

```json
{
    "type": "text",
    "text": "Hello World",
    "font_size": 16,
    "font_weight": "bold",
    "text_color": "#000000",
    "text_alignment_horizontal": "center",
    "max_lines": 2
}
```

### DivContainer

Flex layout container.

```json
{
    "type": "container",
    "orientation": "vertical",
    "items": [
        /* child divs */
    ],
    "content_alignment_horizontal": "center",
    "content_alignment_vertical": "top"
}
```

### DivImage

Image component. The actual `<Image>` rendering is delegated to a swappable
[image adapter](#image-adapter) — by default RN `Image`, but you can plug in
`expo-image` or `react-native-fast-image` without forking the library.

```json
{
    "type": "image",
    "image_url": "https://example.com/image.png",
    "scale": "fill",
    "width": { "type": "fixed", "value": 200 },
    "height": { "type": "fixed", "value": 150 }
}
```

---

## Image adapter

DivKit ships with a small `DivImageAdapter` contract so the host app can pick
the image-loading library that fits its needs (disk cache, blurhash, GIF, …)
without forking `react-native-divkit`.

### Contract

```ts
import type { DivImageAdapter } from 'react-native-divkit';

interface DivImageAdapter {
    render(props: {
        uri: string;
        scale: 'fill' | 'fit' | 'stretch' | 'no_scale';
        style: ImageStyle;            // width / height / aspectRatio precomputed
        onLoadEnd: () => void;
        onError: () => void;
    }): ReactElement;

    getSize(uri: string): Promise<{ width: number; height: number }>;
}
```

`DivImage` does all DivKit-side layout (alignment, aspect, wrap_content sizing,
placeholder color, error fallback). The adapter only renders the actual image
and resolves natural dimensions. `scale` is passed through as-is; each adapter
maps it to its library's prop (`resizeMode`, `contentFit`, …).

### Built-in presets

Adapters live behind subpath imports — `expo-image` and `react-native-fast-image`
are **optional** peer dependencies, so they're only resolved if you import the
matching preset.

```tsx
// Default — react-native Image (used automatically when `imageAdapter` is omitted)
import { rnImageAdapter } from 'react-native-divkit';
<DivKit data={json} />
<DivKit data={json} imageAdapter={rnImageAdapter} />

// expo-image — disk cache, blurhash, transitions, GIF/WebP/AVIF
import { expoImageAdapter } from 'react-native-divkit/adapters/expo-image';
<DivKit data={json} imageAdapter={expoImageAdapter} />

// react-native-fast-image — disk cache + concurrent decode (needs native rebuild)
import { fastImageAdapter } from 'react-native-divkit/adapters/fast-image';
<DivKit data={json} imageAdapter={fastImageAdapter} />
```

### Scale mapping

| DivKit `scale` | rn-image (`resizeMode`) | expo-image (`contentFit`) | fast-image (`resizeMode`) |
|----------------|-------------------------|---------------------------|---------------------------|
| `fill`         | `cover`                 | `cover`                   | `cover`                   |
| `fit`          | `contain`               | `contain`                 | `contain`                 |
| `stretch`      | `stretch`               | `fill`                    | `stretch`                 |
| `no_scale`     | `center`                | `none`                    | `center`                  |

### Custom adapter

```tsx
import { Image as ExpoImage } from 'expo-image';
import type { DivImageAdapter } from 'react-native-divkit';

const cdnAdapter: DivImageAdapter = {
    render: ({ uri, scale, style, onLoadEnd, onError }) => (
        <ExpoImage
            source={{ uri: `https://cdn.example/?u=${encodeURIComponent(uri)}&w=400` }}
            style={style}
            contentFit={scale === 'fit' ? 'contain' : 'cover'}
            onLoad={onLoadEnd}
            onError={() => { onLoadEnd(); onError(); }}
        />
    ),
    getSize: (uri) => ExpoImage.getSize(uri),
};

<DivKit data={json} imageAdapter={cdnAdapter} />
```

### DivState

Conditional rendering with states.

```json
{
    "type": "state",
    "id": "my_state",
    "default_state_id": "state1",
    "states": [
        {
            "state_id": "state1",
            "div": {
                /* ... */
            }
        },
        {
            "state_id": "state2",
            "div": {
                /* ... */
            }
        }
    ]
}
```

### DivPager

Horizontal/vertical pager with snap-to-page scrolling. Implemented on top of
React Native `ScrollView` with `snapToInterval`. Supports `percentage`,
`neighbour_page_width` (fixed) and `wrap_content` layout modes,
`infinite_scroll`, `default_item`, and `restrict_parent_scroll`. Exposes its
state to a `DivIndicator` via the internal `PagerContext`.

```json
{
    "type": "pager",
    "id": "stories_pager",
    "orientation": "horizontal",
    "layout_mode": {
        "type": "percentage",
        "page_width": { "type": "percentage", "value": 25 }
    },
    "item_spacing": { "type": "fixed", "value": 8 },
    "restrict_parent_scroll": 1,
    "items": [
        /* child divs — each one is a page */
    ]
}
```

Alternative layout modes:

```json
{
    "layout_mode": {
        "type": "fixed",
        "neighbour_page_width": { "type": "fixed", "value": 24 }
    }
}
```

```json
{ "layout_mode": { "type": "wrap_content" } }
```

### DivIndicator

Page-position dots for a `DivPager`. Subscribes to a pager via the internal
`PagerContext` (lookup by `pager_id`), tap-to-scroll on each dot. Supports
both modern `active_shape` / `inactive_shape` and the legacy
`shape` + `active_item_size` + colors configuration.
`items_placement` modes `default` (space_between_centers) and `stretch`
(`item_spacing`) are supported.

```json
{
    "type": "indicator",
    "pager_id": "stories_pager",
    "active_shape": {
        "type": "rounded_rectangle",
        "item_width": { "type": "fixed", "value": 20 },
        "item_height": { "type": "fixed", "value": 8 },
        "corner_radius": { "type": "fixed", "value": 4 },
        "background_color": "#000000"
    },
    "inactive_shape": {
        "type": "rounded_rectangle",
        "item_width": { "type": "fixed", "value": 8 },
        "item_height": { "type": "fixed", "value": 8 },
        "corner_radius": { "type": "fixed", "value": 4 },
        "background_color": "#CCCCCC"
    }
}
```

---

## Action Animation

Components with actions can have tap animations. Supported types: `fade`, `scale`, and `set` (combination).

### Fade Animation

```json
{
    "action_animation": {
        "name": "fade",
        "start_value": 1,
        "end_value": 0.4,
        "duration": 500,
        "interpolator": "ease_in_out"
    }
}
```

### Scale Animation

```json
{
    "action_animation": {
        "name": "scale",
        "start_value": 1,
        "end_value": 0.8,
        "duration": 300,
        "interpolator": "ease_in_out"
    }
}
```

### Combined Animation (Set)

```json
{
    "action_animation": {
        "name": "set",
        "items": [
            { "name": "fade", "start_value": 1, "end_value": 0.2, "duration": 300 },
            { "name": "scale", "start_value": 1, "end_value": 0.5, "duration": 500 }
        ]
    }
}
```

### How it works

- On `pressIn`: animates from `start_value` to `end_value`
- On `pressOut`: animates back from `end_value` to `start_value`
- Uses React Native `Animated` API with `useNativeDriver: true` for smooth 60fps animations
- `native` and `no_animation` types are ignored (no custom animation applied)

---

## Transitions

Any DivBase element supports three independent transition fields:

- `transition_in` — plays when the element appears (visibility flips to `visible`,
  or it mounts as part of a newly-active `DivState`).
- `transition_out` — plays when the element disappears (visibility flips to
  `gone` / `invisible`, or it unmounts because the enclosing `DivState`
  switches to another state).
- `transition_change` — plays when the element's size or position changes
  (a "change_bounds" / FLIP-style transition).

All three are handled by the `Outer` wrapper that wraps every component. No
extra wiring is required from the user — declare them in JSON and they fire
automatically.

### transition_in / transition_out (Appearance)

Supported types: `fade`, `scale`, `slide`, and `set` (parallel composition).

```json
{
    "type": "text",
    "text": "Hello",
    "visibility": "@{is_visible}",
    "transition_in":  { "type": "fade",  "duration": 1000 },
    "transition_out": { "type": "fade",  "duration": 1000 }
}
```

```json
{
    "transition_in":  { "type": "scale", "duration": 800, "scale": 0, "pivot_x": 0.5, "pivot_y": 0 },
    "transition_out": { "type": "scale", "duration": 800 }
}
```

```json
{
    "transition_in":  { "type": "slide", "edge": "right", "duration": 600 },
    "transition_out": { "type": "slide", "edge": "left",  "duration": 600 }
}
```

```json
{
    "transition_in": {
        "type": "set",
        "items": [
            { "type": "fade",  "duration": 1000 },
            { "type": "slide", "edge": "right", "duration": 1000 }
        ]
    }
}
```

#### Parameters

| Field         | Applies to | Description                                            |
| ------------- | ---------- | ------------------------------------------------------ |
| `duration`    | all        | Duration in ms (default `300`)                         |
| `start_delay` | all        | Delay in ms before the transition starts (default `0`) |
| `interpolator`| all        | `linear`, `ease`, `ease_in`, `ease_out`, `ease_in_out`, `spring` |
| `alpha`       | `fade`     | Starting (in) / ending (out) alpha — default `0`       |
| `scale`       | `scale`    | Starting / ending scale factor — default `0`           |
| `pivot_x`     | `scale`    | Pivot X (0..1) — default `0.5` (center)                |
| `pivot_y`     | `scale`    | Pivot Y (0..1) — default `0.5` (center)                |
| `edge`        | `slide`    | `left` / `top` / `right` / `bottom` — default `bottom` |
| `distance`    | `slide`    | Slide distance; if absent, `Dimensions.get('window')` size is used |

#### How it works

- Implemented in [`useAppearanceTransition`](../src/hooks/useAppearanceTransition.ts).
- On `visibility` flip → mounts/unmounts the child after running the
  appropriate transition. `gone` collapses layout (returns `null`),
  `invisible` keeps layout but goes to `opacity: 0`.
- On state switch inside `DivState`: out-transition is played on the outgoing
  children (awaited in parallel via `Promise.all`); the new state is then
  mounted and its `transition_in` plays automatically via the hook's
  `'auto-in'` mode.
- Driven by `Animated` API with `useNativeDriver: true` (transform + opacity).
- Off-center `pivot_x` / `pivot_y` are emulated through a
  translate-scale-translate composition once `onLayout` reports the element's
  size.
- The hook also exposes imperative `playIn()` / `playOut()` (returning a
  `Promise<void>`) for advanced cases. `DivState` uses this internally — most
  consumers do not need to call them directly.

### transition_change (change_bounds)

Triggered when the element's geometry changes. Two layers cooperate:

1. The element itself is animated via FLIP (First-Last-Invert-Play) using
   `Animated` with native driver — respects custom `interpolator` and
   `start_delay`. See [`useChangeBoundsTransition`](../src/hooks/useChangeBoundsTransition.ts).
2. Neighbors reflow smoothly via React Native's `LayoutAnimation.configureNext`
   queued at the right moments (collapse/expand of the wrapper itself, and
   inside `DivState` when swapping states). See
   [`configureChangeBoundsLayout`](../src/utils/configureChangeBoundsLayout.ts).

```json
{
    "type": "image",
    "image_url": "https://example.com/photo.jpg",
    "transition_change": {
        "type": "change_bounds",
        "duration": 1000,
        "interpolator": "ease_in_out"
    }
}
```

```json
{
    "type": "state",
    "id": "image_state",
    "states": [
        {
            "state_id": "state1",
            "div": {
                "type": "image",
                "image_url": "https://example.com/photo.jpg",
                "width": { "type": "match_parent" },
                "transition_change": { "type": "change_bounds", "duration": 1000 }
            }
        },
        {
            "state_id": "state2",
            "div": {
                "type": "image",
                "image_url": "https://example.com/photo.jpg",
                "alignment_horizontal": "right",
                "alignment_vertical": "bottom",
                "transition_change": { "type": "change_bounds", "duration": 1000 }
            }
        }
    ]
}
```

#### Known limitations

- `onLayout` reports coordinates relative to the parent — if the parent itself
  moves, FLIP will perceive that as the child moving. For stable containers
  (the common case) this is fine.
- The first `onLayout` is treated as the baseline; the very first appearance
  is not animated by FLIP (use `transition_in` for that).
- React Native's `LayoutAnimation` accepts only coarse easings (`linear`,
  `easeIn`, `easeOut`, `easeInEaseOut`, `spring`) and a single duration per
  configuration window, so neighbor reflow may not perfectly match a custom
  cubic-bezier interpolator. The element itself uses `Animated`, which does
  respect the spec's interpolator.

---

## Expression Syntax

Variables can be referenced in JSON values using the `@{expression}` syntax.

### Variable Reference

```json
{ "text": "@{userName}" }
```

### Expressions

```json
{ "text": "Count: @{counter + 1}" }
{ "text_color": "@{isError ? '#FF0000' : '#000000'}" }
```

### String Interpolation

```json
{ "text": "Hello, @{firstName} @{lastName}!" }
```

### Supported Operators

- Arithmetic: `+`, `-`, `*`, `/`, `%`
- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Logical: `&&`, `||`, `!`
- Ternary: `condition ? true : false`
- String concatenation: `+`

### Built-in Functions

```json
{ "text": "@{len(items)}" }
{ "text": "@{toString(count)}" }
{ "text": "@{toUpperCase(name)}" }
```

### Expressions in actions

`@{...}` is also resolved in action fields (`url`, `typed.value`, `payload`)
right before the action is dispatched. The scope is the calling component's
`componentContext.variables`, so a `url` action declared inside a template can
reference variables local to that template:

```json
{
  "url": "myapp://open?desc=@{description}",
  "log_id": "navigate"
}
```

## Local Variables

Local `variables` can be declared on any div-node, not just on `card`.
Children of that node — including expressions inside their actions —
see the variable in their scope. Local names shadow same-named parent variables.

### Inline on a container

```json
{
  "type": "container",
  "variables": [
    { "name": "selected", "type": "string", "value": "" }
  ],
  "items": [
    { "type": "text", "text": "Picked: @{selected}" }
  ]
}
```

### As a template parameter bridge

Template `$key` substitution copies a field of the template instance into a
property of the template body, so combining `$value` with a `variables` entry
turns a template parameter into a real DivKit variable:

```json
"templates": {
  "prize_card": {
    "type": "container",
    "variables": [
      { "name": "description", "type": "string", "value": "", "$value": "description" }
    ],
    "items": [
      { "type": "text", "$text": "description" },
      {
        "type": "container",
        "actions": [
          { "url": "myapp://prize?desc=@{description}", "log_id": "tap" }
        ]
      }
    ]
  }
}
```

Each `prize_card` instance now produces its own `description` variable and
`@{description}` resolves per-card — inside text, action URLs, and any other
expression-aware field.

---

## License

Apache 2.0

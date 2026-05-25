# Migration Guide: DivKit Web to React Native

This guide helps developers migrate from DivKit Web (Svelte) to DivKit React Native.

## Table of Contents

- [Overview](#overview)
- [JSON Compatibility](#json-compatibility)
- [API Differences](#api-differences)
- [Component Mapping](#component-mapping)
- [Styling Differences](#styling-differences)
- [Action Handling](#action-handling)
- [Variable System](#variable-system)
- [Known Limitations](#known-limitations)

---

## Overview

DivKit React Native is based on the DivKit Web (TypeScript + Svelte) implementation:

| Aspect            | Code Reuse                    |
| ----------------- | ----------------------------- |
| Expression engine | 100% - copied directly        |
| Type definitions  | 100% - copied directly        |
| Utilities         | ~90% - minor adaptations      |
| Components        | 20% - rewritten for RN        |
| Context/State     | 0% - new React implementation |

### Key Differences

| Feature          | Web (Svelte)        | React Native                                      |
| ---------------- | ------------------- | ------------------------------------------------- |
| Rendering        | DOM + CSS           | React Native Views                                |
| State management | Svelte stores       | React hooks + Observable                          |
| Styling          | CSS + inline styles | StyleSheet                                        |
| Animations       | CSS transitions     | Animated API (action_animation, transition_in/out) |
| Transitions      | CSS transitions     | Animated API + FLIP + LayoutAnimation             |
| Events           | DOM events          | Pressable/TouchableOpacity                        |

---

## JSON Compatibility

### Fully Compatible

DivKit JSON is **fully compatible** between Web and React Native for MVP components:

```json
{
    "card": {
        "log_id": "example",
        "states": [
            {
                "state_id": 0,
                "div": {
                    "type": "text",
                    "text": "Hello, @{name}!",
                    "font_size": 20,
                    "text_color": "#000000"
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

This JSON works identically on both platforms.

### Expression Engine

Expressions work identically:

```json
"@{userName}"
"@{counter + 1}"
"@{isActive ? '#00FF00' : '#FF0000'}"
"@{len(items)}"
```

All built-in functions are supported.

---

## API Differences

### Initialization

**Web (Svelte):**

```svelte
<script>
  import { render } from 'divkit';
</script>

<div use:render={{ json: divKitJson, onStat, onCustomAction }} />
```

**React Native:**

```tsx
import { DivKit } from 'react-native-divkit';

<DivKit data={divKitJson} onStat={handleStat} onCustomAction={handleCustomAction} onError={handleError} />;
```

### Callbacks

**Web:**

```javascript
const callbacks = {
    onStat: stat => console.log(stat),
    onCustomAction: action => handleAction(action),
    onError: error => console.error(error)
};
```

**React Native:**

```tsx
<DivKit
    onStat={stat => console.log(stat.type, stat.action)}
    onCustomAction={action => handleAction(action)}
    onError={error => console.error(error.message)}
/>
```

### Variable Access

**Web (using Svelte stores):**

```javascript
import { getVariable, setVariable } from 'divkit';

const nameVar = getVariable('userName');
nameVar.subscribe(value => console.log(value));
nameVar.set('Alice');
```

**React Native (using hooks):**

```tsx
import { useVariable, useVariableSetter } from 'react-native-divkit';

function MyComponent() {
    const name = useVariable('userName');
    const setName = useVariableSetter('userName');

    return (
        <View>
            <Text>Name: {name}</Text>
            <Button onPress={() => setName('Alice')} title="Set Name" />
        </View>
    );
}
```

Or using context:

```tsx
import { useDivKitContext } from 'react-native-divkit';

function MyComponent() {
    const { getVariable, setVariable } = useDivKitContext();

    const handlePress = () => {
        setVariable('userName', 'Alice');
    };

    return <Button onPress={handlePress} title="Set Name" />;
}
```

---

## Component Mapping

### Text Component

**Web (renders as):**

```html
<span class="div-text" style="font-size: 16px; color: #000;">Hello</span>
```

**React Native (renders as):**

```tsx
<Text style={{ fontSize: 16, color: '#000000' }}>Hello</Text>
```

### Container Component

**Web (renders as):**

```html
<div class="div-container" style="display: flex; flex-direction: column;">
    <!-- children -->
</div>
```

**React Native (renders as):**

```tsx
<View style={{ flexDirection: 'column' }}>{/* children */}</View>
```

### Image Component

**Web (renders as):**

```html
<img src="https://..." style="object-fit: cover;" />
```

**React Native (renders as):**

By default — `<Image>` from `react-native`. The actual renderer is a
pluggable `DivImageAdapter` taken from `DivKitContext`. The host app can opt
into `expo-image` or `react-native-fast-image` for disk caching, GIF/WebP,
blurhash, etc., without forking the library:

```tsx
import { expoImageAdapter } from 'react-native-divkit/adapters/expo-image';
// or:
import { fastImageAdapter } from 'react-native-divkit/adapters/fast-image';

<DivKit data={json} imageAdapter={expoImageAdapter} />;
```

See [API → Image adapter](API.md#image-adapter) for the contract and how to
write a custom adapter (e.g. CDN URL preprocessing).

### State Component

Behavior is identical - renders one child based on current state ID.

---

## Styling Differences

### Size Units

**Web:** Uses CSS pixels and percentage.

**React Native:** Uses density-independent pixels (dp).

| Web CSS           | React Native   |
| ----------------- | -------------- |
| `width: 100px`    | `width: 100`   |
| `width: 50%`      | `width: '50%'` |
| `font-size: 16px` | `fontSize: 16` |

### Colors

Identical format:

- `#RGB` → `#RGB`
- `#RRGGBB` → `#RRGGBB`
- `#AARRGGBB` → converted to `rgba()`

### Flexbox

Most flexbox properties map directly:

| CSS                       | React Native               |
| ------------------------- | -------------------------- |
| `flex-direction: row`     | `flexDirection: 'row'`     |
| `justify-content: center` | `justifyContent: 'center'` |
| `align-items: flex-start` | `alignItems: 'flex-start'` |
| `gap: 10px`               | `gap: 10` (RN 0.71+)       |

### Borders

**Web:**

```css
border: 1px solid #000;
border-radius: 8px;
```

**React Native:**

```typescript
{
  borderWidth: 1,
  borderColor: '#000000',
  borderRadius: 8
}
```

### Shadows

**Web:** Uses `box-shadow`.

**React Native:** Uses platform-specific shadow properties:

```typescript
// iOS
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4
}

// Android
{
  elevation: 5
}
```

---

## Action Handling

### URL Actions

**Web:**

```javascript
onCustomAction: action => {
    window.location.href = action.url;
};
```

**React Native:**

```tsx
import { Linking } from 'react-native';

onCustomAction: action => {
    if (action.url.startsWith('http')) {
        Linking.openURL(action.url);
    } else {
        // Handle custom schemes
        handleCustomScheme(action.url);
    }
};
```

> `action.url` arrives with `@{...}` expressions already resolved against the
> calling component's variable scope (same behaviour as Web's
> `getJsonWithVars(action)`). Pass through to your router as-is.

### set_variable Action

Identical JSON, but callback signature differs slightly.

### set_state Action

Identical behavior.

### copy_to_clipboard Action

**Web:** Uses `navigator.clipboard.writeText()`.

**React Native:** Uses `@react-native-clipboard/clipboard`:

```bash
npm install @react-native-clipboard/clipboard
```

Automatic fallback if not installed.

---

## Variable System

### Creating Variables

**Web (Svelte stores):**

```javascript
import { writable } from 'svelte/store';
const variable = writable('initial');
```

**React Native (Observable):**

```typescript
import { Observable } from '../stores/createObservable';
const variable = new Observable('initial');
```

The Variable class abstracts this difference - your JSON doesn't need to change.

### Subscribing to Variables

**Web:**

```javascript
$: derivedValue = $myVariable + 1;
```

**React Native:**

```tsx
const myValue = useVariable('myVariable');
const derivedValue = useMemo(() => myValue + 1, [myValue]);
```

### Reactive Expressions

**Web (using Svelte reactivity):**

```svelte
$: text = getDerivedFromVars(json.text);
```

**React Native (using hooks):**

```tsx
const text = useDerivedFromVars(json.text, variables);
```

### Local variables on inner nodes

Identical to Web: any div-node (or template body) may declare a `variables`
array. The variables are visible to that node's descendants, including inside
action `url` / `typed.value` expressions. Combined with template `$value`
substitution this is how a template parameter becomes a `@{...}`-resolvable
variable:

```json
"templates": {
  "card": {
    "type": "container",
    "variables": [
      { "name": "desc", "type": "string", "value": "", "$value": "desc" }
    ],
    "items": [
      { "type": "container", "actions": [
        { "url": "myapp://open?d=@{desc}", "log_id": "tap" }
      ] }
    ]
  }
}
```

Wiring on the RN side lives in `useLocalVariables` (called from
`DivComponent.tsx`) and in `ComponentContext.produceChildContext`, which
inherits `this.variables` rather than the root scope.

---

## Animation Differences

### Action Animation (tap animations)

JSON is fully compatible. The implementation differs:

**Web:** Uses CSS transitions on `:active` pseudo-class.

```css
transition: opacity 500ms ease-in-out;
/* :active state triggers end_value */
```

**React Native:** Uses `Animated` API with `onPressIn`/`onPressOut`.

```typescript
Animated.timing(animOpacity, {
    toValue: endValue,
    duration: 500,
    easing: Easing.inOut(Easing.ease),
    useNativeDriver: true
});
```

### Supported action_animation types

| Type             | Web | React Native |
| ---------------- | --- | ------------ |
| `fade`           | Yes | Yes          |
| `scale`          | Yes | Yes          |
| `set`            | Yes | Yes          |
| `native`         | Yes | Ignored      |
| `no_animation`   | Yes | Ignored      |
| `translate`      | No* | No           |

\* `translate` is only used for transition_in/transition_out in Web, not for action_animation.

### transition_in / transition_out / transition_change

Fully supported (since v1.8.0). JSON is identical to Web.

| Type / Field      | Web | React Native |
| ----------------- | --- | ------------ |
| `transition_in`   | Yes | Yes (fade, scale, slide, set) |
| `transition_out`  | Yes | Yes (fade, scale, slide, set) |
| `transition_change` | Yes | Yes (change_bounds, set) |
| Off-center `pivot_x` / `pivot_y` | Yes | Yes (via translate-scale-translate after `onLayout`) |
| `slide.distance`  | Yes | Yes (falls back to `Dimensions.get('window')` if absent) |
| `interpolator` (custom cubic) | Yes | Element-level: yes (Animated). Neighbour reflow under change_bounds: approximated via `LayoutAnimation`. |
| `transition_triggers` | Yes | Yes (`state_change`, `visibility_change`) |

Under the hood:

- `transition_in` / `transition_out` are driven by [`useAppearanceTransition`](../src/hooks/useAppearanceTransition.ts).
- `transition_change` uses FLIP via [`useChangeBoundsTransition`](../src/hooks/useChangeBoundsTransition.ts)
  for the element itself, and `LayoutAnimation.configureNext` for neighbours
  (via [`configureChangeBoundsLayout`](../src/utils/configureChangeBoundsLayout.ts)).
- Inside `DivState` swaps, the outgoing children's `transition_out` is awaited
  in parallel before the new state mounts — out-animations stay visible.
  Implemented through [`DivStateScopeContext`](../src/context/DivStateScopeContext.tsx).

### Interpolators

All interpolators are mapped:

| DivKit           | Web CSS            | React Native Easing        |
| ---------------- | ------------------ | -------------------------- |
| `linear`         | `linear`           | `Easing.linear`            |
| `ease`           | `ease`             | `Easing.ease`              |
| `ease_in`        | `ease-in`          | `Easing.in(Easing.ease)`   |
| `ease_out`       | `ease-out`         | `Easing.out(Easing.ease)`  |
| `ease_in_out`    | `ease-in-out`      | `Easing.inOut(Easing.ease)` |
| `spring`         | `ease-in-out`*     | `Easing.inOut(Easing.ease)`* |

\* `spring` falls back to `ease_in_out` in both Web and RN implementations.

---

## Known Limitations

### Not in MVP (0.1.x)

These features are planned for future versions:

| Feature                          | Web Support | RN MVP  |
| -------------------------------- | ----------- | ------- |
| Text                             | Full        | Basic   |
| Container                        | Full        | Basic   |
| Image                            | Full        | Basic   |
| State                            | Full        | Full    |
| Pager                            | Full        | Full    |
| Indicator                        | Full        | Full    |
| Gallery                          | Full        | No      |
| Tabs                             | Full        | No      |
| Input                            | Full        | No      |
| Select                           | Full        | No      |
| Video                            | Full        | No      |
| Lottie                           | Full        | No      |
| Text ranges                      | Full        | No      |
| Gradients (linear + radial)      | Full        | Full    |
| Image / nine_patch background    | Full        | No      |
| Action Animation                 | Full        | Partial |
| transition_in / transition_out   | Full        | Full    |
| transition_change (change_bounds)| Full        | Full    |
| Timers                           | Full        | No      |
| Tooltips                         | Full        | No      |
| Custom components                | Full        | No      |

### Platform Differences

1. **Font handling:** Web uses CSS fonts; RN requires native font registration.

2. **Image caching:** Web uses browser cache; RN benefits from `react-native-fast-image`.

3. **Gestures:** Web uses mouse/touch events; RN uses Gesture Handler for complex gestures.

4. **Keyboard:** Input handling differs significantly between platforms.

---

## Migration Checklist

### Before Migration

- [ ] Identify which components your JSON uses
- [ ] Check if all components are in MVP scope
- [ ] Review action handlers for platform differences
- [ ] Plan for missing features (use placeholders or alternatives)

### During Migration

- [ ] Install `react-native-divkit`
- [ ] Replace Svelte render with `<DivKit>` component
- [ ] Update callback signatures
- [ ] Replace Svelte stores with React hooks
- [ ] Test variable updates
- [ ] Test action execution

### After Migration

- [ ] Test on both iOS and Android
- [ ] Verify styling matches expectations
- [ ] Check performance with profiler
- [ ] Add error boundaries for graceful degradation

---

## Getting Help

- GitHub Issues: https://github.com/divkit/divkit/issues
- Documentation: https://divkit.tech
- Examples: `examples/NewExample/`

---

## License

Apache 2.0

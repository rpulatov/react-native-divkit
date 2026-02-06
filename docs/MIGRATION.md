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

| Aspect | Code Reuse |
|--------|------------|
| Expression engine | 100% - copied directly |
| Type definitions | 100% - copied directly |
| Utilities | ~90% - minor adaptations |
| Components | 20% - rewritten for RN |
| Context/State | 0% - new React implementation |

### Key Differences

| Feature | Web (Svelte) | React Native |
|---------|--------------|--------------|
| Rendering | DOM + CSS | React Native Views |
| State management | Svelte stores | React hooks + Observable |
| Styling | CSS + inline styles | StyleSheet |
| Animations | CSS transitions | LayoutAnimation (MVP) |
| Events | DOM events | Pressable/TouchableOpacity |

---

## JSON Compatibility

### Fully Compatible

DivKit JSON is **fully compatible** between Web and React Native for MVP components:

```json
{
  "card": {
    "log_id": "example",
    "states": [{
      "state_id": 0,
      "div": {
        "type": "text",
        "text": "Hello, @{name}!",
        "font_size": 20,
        "text_color": "#000000"
      }
    }],
    "variables": [{
      "type": "string",
      "name": "name",
      "value": "World"
    }]
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

<DivKit
  data={divKitJson}
  onStat={handleStat}
  onCustomAction={handleCustomAction}
  onError={handleError}
/>
```

### Callbacks

**Web:**

```javascript
const callbacks = {
  onStat: (stat) => console.log(stat),
  onCustomAction: (action) => handleAction(action),
  onError: (error) => console.error(error)
};
```

**React Native:**

```tsx
<DivKit
  onStat={(stat) => console.log(stat.type, stat.action)}
  onCustomAction={(action) => handleAction(action)}
  onError={(error) => console.error(error.message)}
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
<View style={{ flexDirection: 'column' }}>
  {/* children */}
</View>
```

### Image Component

**Web (renders as):**
```html
<img src="https://..." style="object-fit: cover;" />
```

**React Native (renders as):**
```tsx
<Image
  source={{ uri: 'https://...' }}
  style={{ resizeMode: 'cover' }}
/>
```

### State Component

Behavior is identical - renders one child based on current state ID.

---

## Styling Differences

### Size Units

**Web:** Uses CSS pixels and percentage.

**React Native:** Uses density-independent pixels (dp).

| Web CSS | React Native |
|---------|--------------|
| `width: 100px` | `width: 100` |
| `width: 50%` | `width: '50%'` |
| `font-size: 16px` | `fontSize: 16` |

### Colors

Identical format:
- `#RGB` → `#RGB`
- `#RRGGBB` → `#RRGGBB`
- `#AARRGGBB` → converted to `rgba()`

### Flexbox

Most flexbox properties map directly:

| CSS | React Native |
|-----|--------------|
| `flex-direction: row` | `flexDirection: 'row'` |
| `justify-content: center` | `justifyContent: 'center'` |
| `align-items: flex-start` | `alignItems: 'flex-start'` |
| `gap: 10px` | `gap: 10` (RN 0.71+) |

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
onCustomAction: (action) => {
  window.location.href = action.url;
}
```

**React Native:**
```tsx
import { Linking } from 'react-native';

onCustomAction: (action) => {
  if (action.url.startsWith('http')) {
    Linking.openURL(action.url);
  } else {
    // Handle custom schemes
    handleCustomScheme(action.url);
  }
}
```

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

---

## Known Limitations

### Not in MVP (0.1.x)

These features are planned for future versions:

| Feature | Web Support | RN MVP | RN Future |
|---------|-------------|--------|-----------|
| Text | Full | Basic | 0.2.0 |
| Container | Full | Basic | 0.2.0 |
| Image | Full | Basic | 0.2.0 |
| State | Full | Full | - |
| Gallery | Full | No | 0.2.0 |
| Pager | Full | No | 0.2.0 |
| Tabs | Full | No | 0.2.0 |
| Input | Full | No | 0.3.0 |
| Select | Full | No | 0.3.0 |
| Video | Full | No | 0.3.0 |
| Lottie | Full | No | 0.3.0 |
| Text ranges | Full | No | 0.2.0 |
| Gradients | Full | Partial | 0.2.0 |
| Animations | Full | Basic | 0.2.0 |
| Timers | Full | No | 0.2.0 |
| Tooltips | Full | No | 0.3.0 |
| Custom components | Full | No | 0.3.0 |

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
- Examples: `examples/BasicExample/`

---

## License

Apache 2.0

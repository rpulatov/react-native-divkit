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
    // ... component-specific properties
}
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

Image component.

```json
{
    "type": "image",
    "image_url": "https://example.com/image.png",
    "scale": "fill",
    "width": { "type": "fixed", "value": 200 },
    "height": { "type": "fixed", "value": 150 }
}
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

---

## License

Apache 2.0

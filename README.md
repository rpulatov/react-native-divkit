# react-native-divkit

DivKit renderer for React Native - Server-driven UI framework.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/react-native-divkit.svg)](https://www.npmjs.com/package/react-native-divkit)

## Overview

DivKit is a server-driven UI framework that allows you to define UI layouts in JSON and render them natively. This React Native implementation is based on the [DivKit Web](../web/divkit/) implementation, reusing the expression engine and adapting components for React Native.

## Status

**MVP Version 0.1.0-alpha**

| Feature | Status |
|---------|--------|
| Text component | ✅ Complete |
| Container component | ✅ Complete |
| Image component | ✅ Complete |
| State component | ✅ Complete |
| Variable system | ✅ Complete |
| Expression engine | ✅ Complete |
| Action handlers | ✅ Complete |
| Template resolution | ✅ Complete |

## Installation

```bash
npm install react-native-divkit
```

### Optional Dependencies

For enhanced functionality, install these optional packages:

```bash
# Optimized image loading with caching
npm install react-native-fast-image

# Gradient support (backgrounds)
npm install react-native-linear-gradient

# Clipboard support
npm install @react-native-clipboard/clipboard
```

## Quick Start

```tsx
import { DivKit } from 'react-native-divkit';

const divKitJson = {
  card: {
    log_id: 'hello_world',
    states: [{
      state_id: 0,
      div: {
        type: 'text',
        text: 'Hello, @{name}!',
        font_size: 24,
        text_color: '#000000',
        text_alignment_horizontal: 'center'
      }
    }],
    variables: [{
      type: 'string',
      name: 'name',
      value: 'World'
    }]
  }
};

export default function App() {
  return (
    <DivKit
      data={divKitJson}
      onStat={(stat) => console.log('Stat:', stat.type, stat.action.log_id)}
      onCustomAction={(action) => console.log('Custom action:', action.url)}
      onError={(error) => console.error('Error:', error.message)}
    />
  );
}
```

## Components

### Text

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

### Container

```json
{
  "type": "container",
  "orientation": "vertical",
  "items": [
    { "type": "text", "text": "Item 1" },
    { "type": "text", "text": "Item 2" }
  ],
  "content_alignment_horizontal": "center"
}
```

### Image

```json
{
  "type": "image",
  "image_url": "https://example.com/image.png",
  "scale": "fill",
  "width": { "type": "fixed", "value": 200 },
  "height": { "type": "fixed", "value": 150 }
}
```

### State

```json
{
  "type": "state",
  "id": "my_state",
  "default_state_id": "state1",
  "states": [
    {
      "state_id": "state1",
      "div": { "type": "text", "text": "State 1" }
    },
    {
      "state_id": "state2",
      "div": { "type": "text", "text": "State 2" }
    }
  ]
}
```

## Variables

Define variables in your JSON:

```json
{
  "card": {
    "variables": [
      { "type": "string", "name": "userName", "value": "World" },
      { "type": "integer", "name": "counter", "value": 0 },
      { "type": "color", "name": "textColor", "value": "#FF0000" },
      { "type": "boolean", "name": "isActive", "value": true }
    ]
  }
}
```

Use variables in expressions:

```json
{
  "type": "text",
  "text": "Hello, @{userName}!",
  "text_color": "@{textColor}"
}
```

### Variable Types

| Type | Description | Example |
|------|-------------|---------|
| `string` | Text value | `"Hello"` |
| `integer` | Whole number | `42` |
| `number` | Decimal number | `3.14` |
| `boolean` | True/false | `true` |
| `color` | Color value | `"#FF5500"` |
| `url` | URL string | `"https://..."` |
| `dict` | Key-value object | `{"key": "value"}` |
| `array` | List of values | `[1, 2, 3]` |

## Actions

Actions are triggered by user interaction:

```json
{
  "type": "text",
  "text": "Tap me",
  "actions": [{
    "log_id": "button_tap",
    "url": "divkit://custom_action"
  }]
}
```

### Typed Actions

#### set_variable

```json
{
  "typed": {
    "type": "set_variable",
    "variable_name": "counter",
    "value": { "type": "integer", "value": 10 }
  }
}
```

#### set_state

```json
{
  "typed": {
    "type": "set_state",
    "state_id": "my_state",
    "temporary_state_id": "state2"
  }
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `DivJson` | Yes | DivKit JSON data |
| `onStat` | `(stat) => void` | No | Statistics callback |
| `onCustomAction` | `(action) => void` | No | Custom action handler |
| `onError` | `(error) => void` | No | Error handler |
| `direction` | `'ltr' \| 'rtl'` | No | Text direction (default: `'ltr'`) |
| `platform` | `'desktop' \| 'touch'` | No | Platform type (default: `'touch'`) |
| `style` | `ViewStyle` | No | Container style |

## Hooks

For advanced usage, you can use hooks directly:

```tsx
import {
  useDivKitContext,
  useVariable,
  useVariableState,
  useAction
} from 'react-native-divkit';

function MyComponent() {
  const { setVariable } = useDivKitContext();
  const counter = useVariable('counter');

  return (
    <View>
      <Text>Count: {counter}</Text>
      <Button
        onPress={() => setVariable('counter', counter + 1)}
        title="Increment"
      />
    </View>
  );
}
```

## Examples

See the [examples/BasicExample](examples/BasicExample/) directory for a complete React Native app demonstrating all features.

```bash
cd examples/BasicExample
npm install
npm run ios   # or npm run android
```

## Documentation

- [API Reference](docs/API.md) - Complete API documentation
- [Migration Guide](docs/MIGRATION.md) - Migrating from Web version
- [Architecture](docs/ARCHITECTURE.md) - Internal architecture

## Not Included in MVP

The following features are planned for future versions:

- Gallery, Pager, Slider, Tabs
- Input, Select, Switch
- Video, Lottie animations
- Text ranges, complex gradients
- Advanced transitions and animations
- Custom components API

## Architecture

This library is based on DivKit Web (TypeScript + Svelte):

| Component | Reuse |
|-----------|-------|
| Expression engine | 100% copied |
| Type definitions | 100% copied |
| Utilities | ~90% adapted |
| Components | ~20% (rewritten for RN) |
| Context system | New (React-specific) |

## Development

```bash
# Install dependencies
npm install

# Build PEG parser
npm run build:peggy

# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build

# Test
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

Apache 2.0

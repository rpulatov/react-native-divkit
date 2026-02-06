# DivKit React Native Examples

This directory contains example JSON files and sample apps demonstrating DivKit functionality.

## Sample DivKit JSON Files

Located in `sample-divs/`:

### 1. simple-text.json
Basic text rendering with styling.
- Single text component
- Color, font size, alignment
- Padding

### 2. container-layout.json
Container layouts with nested components.
- Vertical and horizontal containers
- Multiple text items
- Nested layouts

### 3. with-variables.json
Variable substitution and reactivity.
- String, color, and integer variables
- Variable interpolation with `@{varName}` syntax
- Dynamic text updates

### 4. state-switching.json
State component with multiple states.
- State container with 2 states
- State switching capability
- Different content per state

### 5. with-image.json
Image rendering.
- Network image loading
- Image scaling modes
- Fixed dimensions

## Usage in React Native App

```tsx
import { DivKit } from 'react-native-divkit';
import sampleJson from './sample-divs/simple-text.json';

export default function App() {
  return (
    <DivKit
      data={sampleJson}
      onStat={(stat) => console.log('Stat:', stat)}
      onCustomAction={(action) => console.log('Action:', action.url)}
      onError={(error) => console.error('Error:', error)}
    />
  );
}
```

## Testing Variable Updates

```tsx
import React, { useRef } from 'react';
import { View, Button } from 'react-native';
import { DivKit } from 'react-native-divkit';
import { useDivKitContext } from 'react-native-divkit';

function VariableController() {
  const { setVariable } = useDivKitContext();

  return (
    <Button
      title="Update Counter"
      onPress={() => {
        setVariable('counter', Math.floor(Math.random() * 100));
      }}
    />
  );
}
```

## MVP Scope

These examples demonstrate the MVP functionality:
- ✅ Text component
- ✅ Container component (vertical/horizontal)
- ✅ Image component
- ✅ State component
- ✅ Variable system
- ✅ Expression evaluation
- ✅ Action execution

## Deferred Features (Post-MVP)

The following are not included in these examples:
- Gallery, Pager, Tabs
- Input, Select, Switch
- Video, Lottie animations
- Text ranges, gradients
- Complex transitions
- Custom components

## Next Steps

1. Create a React Native app using `npx react-native init`
2. Install the DivKit package
3. Import sample JSON files
4. Render with `<DivKit data={json} />`
5. Test variable updates and actions

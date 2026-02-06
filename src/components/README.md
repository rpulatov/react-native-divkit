# DivKit React Native Components - Phase 5 Complete

## MVP Components Implemented

### 1. DivText (`text/DivText.tsx`)

Text rendering component with variable substitution and styling.

**Features:**

- ✅ Text rendering with variable substitution
- ✅ Font styling (size, weight, color, family)
- ✅ Text alignment (horizontal, RTL support)
- ✅ Max lines with ellipsize
- ✅ Line height, letter spacing
- ✅ Text decorations (underline, strikethrough)
- ✅ Font feature settings (basic)

**Deferred:**

- Text ranges (nested styling)
- Text images
- Text gradients
- Text shadows
- Auto ellipsize
- Selectable text with custom actions

### 2. DivContainer (`container/DivContainer.tsx`)

Flex container component for layout management.

**Features:**

- ✅ Vertical/horizontal/overlap orientation
- ✅ Content alignment (horizontal & vertical)
- ✅ Item spacing (gap)
- ✅ Flex layout with proper alignment
- ✅ RTL support

**Deferred:**

- Wrap layout mode
- Separators (visual dividers)
- Line separators (for wrap mode)
- Aspect ratio constraints
- Item builder (dynamic items from data)
- Clip to bounds

### 3. DivImage (`image/DivImage.tsx`)

Image component with network loading and scaling.

**Features:**

- ✅ Network image loading
- ✅ Scaling modes (fill, fit, stretch, no_scale)
- ✅ Placeholder color while loading
- ✅ Loading indicator
- ✅ Error handling
- ✅ Aspect ratio

**Deferred:**

- GIF support (requires react-native-gif)
- Image preview (blur-up technique)
- Tint color and tint modes
- Image filters (blur, etc.)
- Appearance animations
- High priority preview
- react-native-fast-image integration

### 4. DivState (`state/DivState.tsx`)

State management component for switching between different UI states.

**Features:**

- ✅ State selection by state_id
- ✅ Default state
- ✅ State switching via actions (set_state)
- ✅ State registration in StateContext
- ✅ State variable binding (state_id_variable)
- ✅ Two-way binding with variables

**Deferred:**

- Transition animations (in/out/change)
- Animation timing and interpolation
- Clip to bounds
- Advanced state management
- Multiple concurrent state transitions

### 5. DivComponent (`DivComponent.tsx`)

Universal component router that dispatches to appropriate component based on type.

**Supported Types:**

- `text` → DivText
- `container` → DivContainer
- `image` / `gif` → DivImage
- `state` → DivState

**Deferred Types:**

- `gallery`, `pager`, `tabs`
- `slider`, `indicator`
- `input`, `select`, `switch`
- `video`, `custom`
- `separator`, `grid`

## Utility Components

### Outer (`utilities/Outer.tsx`)

Base wrapper component providing common functionality for all components.

**Features:**

- Visibility handling (visible/invisible/gone)
- Sizing (width/height with fixed/match_parent/wrap_content)
- Padding and margins
- Background (solid colors)
- Borders and border radius
- Shadows
- Opacity/alpha
- Action handling (onPress)

### Unknown (`utilities/Unknown.tsx`)

Fallback component for unsupported types.

## Architecture

```
DivComponent (router)
    ├── DivText
    │   └── Outer
    ├── DivContainer
    │   ├── Outer
    │   └── DivComponent (recursive for children)
    ├── DivImage
    │   └── Outer
    └── DivState
        ├── Outer
        └── DivComponent (recursive for active state)
```

## Integration with Context System

All components integrate with:

- **DivKitContext**: Access to variables, actions, configuration
- **StateContext**: State management and transitions
- **ActionContext**: Action execution
- **EnabledContext**: Visibility and enabled state

## Integration with Hooks

All components use reactive hooks:

- `useDerivedFromVarsSimple`: Variable substitution
- `useAction`, `useActionHandler`: Action execution
- `useDivKitContext`, `useStateContext`: Context access

## Usage Example

```tsx
import { DivComponent } from 'react-native-divkit';

const json = {
    type: 'container',
    orientation: 'vertical',
    items: [
        {
            type: 'text',
            text: 'Hello @{userName}!',
            font_size: 24
        },
        {
            type: 'image',
            image_url: 'https://example.com/image.png',
            scale: 'fit'
        }
    ]
};

const componentContext = {
    json,
    variables: variablesMap
    // ... other context props
};

<DivComponent componentContext={componentContext} />;
```

## Next Steps (Phase 6)

1. Create main DivKit component
2. Implement component context creation
3. Setup variable initialization
4. Implement template resolution
5. Create DivKitView wrapper
6. Build public API exports

## File Structure

```
src/components/
├── DivComponent.tsx          # Universal router
├── text/
│   ├── DivText.tsx          # Text component
│   └── index.ts
├── container/
│   ├── DivContainer.tsx     # Container component
│   └── index.ts
├── image/
│   ├── DivImage.tsx         # Image component
│   └── index.ts
├── state/
│   ├── DivState.tsx         # State component
│   └── index.ts
├── utilities/
│   ├── Outer.tsx            # Base wrapper
│   ├── Unknown.tsx          # Fallback
│   └── index.ts
└── index.ts                  # Public exports
```

## Testing TODO

- [ ] Unit tests for each component
- [ ] Integration tests with variables
- [ ] State transition tests
- [ ] Layout tests (snapshot testing)
- [ ] Action execution tests
- [ ] Error handling tests

## Known Limitations (MVP)

1. **Text ranges**: Nested text styling not supported
2. **Wrap layout**: Container wrap mode not implemented
3. **Separators**: Visual dividers between items not implemented
4. **GIF animations**: Requires additional native modules
5. **Image tinting**: Tint modes not implemented
6. **Transitions**: State transitions are instant (no animations)
7. **Templates**: Not yet integrated (Phase 6)
8. **Item builder**: Dynamic items from data not supported

These limitations will be addressed in post-MVP versions.

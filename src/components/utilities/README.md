# Utility Components

Base utility components for DivKit React Native library.

## Components

### Outer

Base wrapper component for all DivKit components. Handles common properties like visibility, sizing, padding, margins, background, borders, and actions.

**Features:**
- ✅ Visibility handling (`gone`, `invisible`, `visible`)
- ✅ Width/Height sizing (`fixed`, `match_parent`, `wrap_content`)
- ✅ Padding and margins (with RTL support)
- ✅ Opacity/alpha
- ✅ Background (solid colors for MVP)
- ✅ Borders (width, color, style, radius)
- ✅ Shadows
- ✅ Actions (tap handlers)
- ✅ Reactive variable binding

**Usage:**

```tsx
import { Outer } from './components/utilities';

function MyComponent({ componentContext }) {
  return (
    <Outer componentContext={componentContext}>
      <Text>Content goes here</Text>
    </Outer>
  );
}
```

**Props:**

- `componentContext: ComponentContext` - Component context with JSON and variables
- `children: ReactNode` - Child components to render
- `style?: ViewStyle` - Additional custom styles

**Visibility Behavior:**

- `gone` - Component returns `null` (removed from layout)
- `invisible` - Component rendered with `opacity: 0` (takes space but not visible)
- `visible` - Component rendered normally

**Sizing:**

- `fixed` - Explicit size in dp
- `match_parent` - Fills parent container (100% width/height)
- `wrap_content` - Wraps content size (default React Native behavior)

**Actions:**

If the component has `actions` defined in JSON, Outer automatically wraps children in `Pressable` for tap handling.

**RTL Support:**

Padding and margins respect `direction` from DivKitContext:
- `start`/`end` → automatically mapped to `left`/`right` based on direction
- Supports both LTR and RTL layouts

---

### Unknown

Fallback component for unsupported component types. Renders a placeholder in DEV mode and nothing in production.

**Usage:**

```tsx
import { Unknown } from './components/utilities';

function ComponentResolver({ type }) {
  switch (type) {
    case 'text':
      return <DivText />;
    case 'container':
      return <DivContainer />;
    default:
      return <Unknown type={type} message="Not implemented yet" />;
  }
}
```

**Props:**

- `type: string` - Component type that is unknown
- `message?: string` - Optional error message

**Behavior:**

- **DEV mode**: Renders yellow warning box with component type
- **Production**: Returns `null` (renders nothing)
- Logs warning to console in DEV mode

---

## Implementation Notes

### MVP Scope

The current implementation is MVP-focused and includes only essential features:

**Included:**
- Basic sizing and layout
- Solid color backgrounds
- Simple borders and shadows
- Basic action handling

**Deferred (Post-MVP):**
- Complex backgrounds (images, gradients)
- Advanced animations and transitions
- Extensions
- Custom focus handling
- Transform/transformations
- Visibility actions
- Layout provider

### Performance

- Uses `useMemo` for style computation to minimize re-renders
- Reactive variables are tracked via `useDerivedFromVarsSimple`
- Conditional rendering based on visibility for optimal performance

### Future Enhancements

1. **Advanced Backgrounds** - Add support for images, gradients, nine-patch
2. **Animations** - Implement action animations and transitions
3. **Focus** - Add keyboard focus and custom focus styles
4. **Accessibility** - Enhanced accessibility support
5. **Extensions** - Plugin system for custom behaviors
6. **Layout Provider** - Width/height variable tracking

---

## Related Files

- [Outer.tsx](./Outer.tsx) - Main wrapper component
- [Unknown.tsx](./Unknown.tsx) - Fallback component
- [Web Outer.svelte](../../../web/divkit/src/components/utilities/Outer.svelte) - Reference implementation

---

## Testing

Test Outer component behavior:

```tsx
import { render } from '@testing-library/react-native';
import { Outer } from './Outer';

it('renders children when visible', () => {
  const { getByText } = render(
    <Outer componentContext={mockContext}>
      <Text>Test</Text>
    </Outer>
  );
  expect(getByText('Test')).toBeTruthy();
});

it('returns null when visibility is gone', () => {
  const context = {
    ...mockContext,
    json: { ...mockContext.json, visibility: 'gone' }
  };
  const { queryByText } = render(
    <Outer componentContext={context}>
      <Text>Test</Text>
    </Outer>
  );
  expect(queryByText('Test')).toBeNull();
});
```

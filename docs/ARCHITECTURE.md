# DivKit React Native Architecture

This document describes the internal architecture of the DivKit React Native library.

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Core Layers](#core-layers)
- [Data Flow](#data-flow)
- [Component System](#component-system)
- [Expression Engine](#expression-engine)
- [Variable System](#variable-system)
- [Action System](#action-system)
- [Animation System](#animation-system)
- [Transition System](#transition-system)
- [Context Architecture](#context-architecture)
- [Rendering Pipeline](#rendering-pipeline)
- [Design Decisions](#design-decisions)

---

## Overview

DivKit React Native is a server-driven UI framework that renders JSON layouts as native React Native components.

```
┌─────────────────────────────────────────────────────────────┐
│                        DivKit JSON                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Template Resolution                       │
│              (applyTemplate, variable prep)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Expression Evaluation                     │
│           (PEG parser, eval, variable binding)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     React Components                         │
│     (DivText, DivContainer, DivImage, DivState, Outer)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   React Native Views                         │
│              (View, Text, Image, Pressable)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
src/
├── index.ts                    # Public API exports
├── DivKit.tsx                  # Main entry component
│
├── components/                 # React Native components
│   ├── DivComponent.tsx        # Component router
│   ├── text/
│   │   └── DivText.tsx         # Text component
│   ├── container/
│   │   └── DivContainer.tsx    # Container component
│   ├── image/
│   │   └── DivImage.tsx        # Image component
│   ├── state/
│   │   └── DivState.tsx        # State component
│   ├── pager/
│   │   └── DivPager.tsx        # Pager component
│   ├── indicator/
│   │   └── DivIndicator.tsx    # Indicator component
│   └── utilities/
│       ├── Outer.tsx           # Base wrapper (visibility, actions,
│       │                       #   action_animation, transitions)
│       ├── Background.tsx      # Background renderer
│       └── Unknown.tsx         # Unknown type fallback
│
├── context/                    # React contexts
│   ├── DivKitContext.tsx       # Main context
│   ├── ActionContext.tsx       # Action context
│   ├── StateContext.tsx        # State context
│   ├── PagerContext.tsx        # Pager ↔ Indicator binding
│   ├── LayoutParamsContext.tsx # Layout params (alignment, etc.)
│   └── DivStateScopeContext.tsx # Per-DivState transition_out registry
│
├── hooks/                      # React hooks
│   ├── useDerivedFromVars.ts   # Expression evaluation hook
│   ├── useVariable.ts          # Variable subscription hooks
│   ├── useAction.ts            # Action execution hooks
│   ├── useAppearanceTransition.ts   # transition_in / transition_out driver
│   ├── useChangeBoundsTransition.ts # transition_change FLIP driver
│   └── index.ts                # Hook exports
│
├── expressions/                # Expression engine (from Web)
│   ├── expressions.peggy       # PEG grammar
│   ├── expressions.ts          # Generated parser
│   ├── eval.ts                 # Expression evaluator
│   ├── variable.ts             # Variable classes
│   ├── json.ts                 # JSON preparation
│   ├── funcs/                  # Built-in functions
│   └── ...                     # Other expression utils
│
├── stores/                     # State management
│   └── createObservable.ts     # Observable pattern (replaces Svelte stores)
│
├── actions/                    # Action handlers
│   ├── array.ts                # Array actions
│   ├── dict.ts                 # Dict actions
│   ├── copyToClipboard.ts      # Clipboard action
│   └── updateStructure.ts      # Structure updates
│
├── utils/                      # Utilities (from Web)
│   ├── applyTemplate.ts        # Template resolution
│   ├── correctColor.ts         # Color conversion
│   ├── flattenAnimation.ts     # Flatten action_animation sets
│   ├── flattenTransition.ts    # Flatten transition sets (appearance / change)
│   ├── configureChangeBoundsLayout.ts # LayoutAnimation for neighbour reflow
│   ├── correct*.ts             # Value converters
│   └── ...                     # Other utilities
│
├── types/                      # TypeScript types
│   ├── base.d.ts               # Base component types
│   ├── text.d.ts               # Text types
│   ├── container.d.ts          # Container types
│   ├── image.d.ts              # Image types
│   ├── state.d.ts              # State types
│   ├── animation.d.ts          # Animation types
│   ├── actionable.d.ts         # Actionable data types
│   └── componentContext.d.ts   # Context types
│
└── typings/                    # Shared type definitions
    ├── common.d.ts             # Common types
    └── store.d.ts              # Store types
```

---

## Core Layers

### Layer 1: Expression Engine

The expression engine evaluates `@{...}` expressions in JSON values.

```
Input: "Hello, @{userName}!"
       Variables: { userName: "World" }
Output: "Hello, World!"
```

**Key Files:**

- `expressions.peggy` - PEG grammar definition
- `eval.ts` - Expression evaluator (20KB)
- `variable.ts` - Variable class definitions

**100% reused from Web implementation.**

### Layer 2: Variable System

Variables are reactive values that trigger re-renders when changed.

```typescript
class Variable<T> {
    private value: T;
    private observable: Observable<T>;

    getValue(): T {
        return this.value;
    }
    setValue(newValue: T): void {
        /* notify subscribers */
    }
    subscribe(callback: (value: T) => void): () => void;
}
```

**Key Files:**

- `stores/createObservable.ts` - Observable pattern
- `expressions/variable.ts` - Variable classes

### Layer 3: Context System

React contexts provide dependency injection:

```
DivKitContext
├── variables: Map<string, Variable>
├── execAnyActions: (actions) => Promise<void>
├── direction: 'ltr' | 'rtl'
├── platform: 'desktop' | 'touch'
├── typefaceProvider: (fontFamily, opts?) => string
└── imageAdapter: DivImageAdapter  // render+getSize for <DivImage>; default rn-image

ActionContext
└── hasAction: () => boolean

StateContext
├── registerState: (id, setter) => unsubscribe
└── switchState: (stateId) => Promise<void>

DivStateScopeContext (per DivState)
└── registerTransitionOutPlayer(play: () => Promise<void>): () => void
```

### Layer 4: Component System

Components render JSON types as React Native views:

```
DivKit.tsx          → Provider setup
DivComponent.tsx    → Type router
DivText.tsx         → <Text> rendering
DivContainer.tsx    → <View> with flex
DivImage.tsx        → image loading via DivImageAdapter (rn-image / expo-image / fast-image)
DivState.tsx        → Conditional render + state transitions
DivPager.tsx        → <ScrollView> with snap-to-page
DivIndicator.tsx    → Dots bound to a pager via PagerContext
Outer.tsx           → Base wrapper (visibility, actions, action_animation,
                      transition_in / transition_out / transition_change)
```

---

## Data Flow

### Initialization Flow

```
1. DivKit receives JSON data
   │
2. Parse card.states[0].div
   │
3. Apply templates (applyTemplate)
   │
4. Initialize variables (createVariable for each)
   │
5. Create context value (DivKitContextValue)
   │
6. Create root ComponentContext
   │
7. Render <DivComponent>
```

### Render Flow

```
1. DivComponent receives ComponentContext
   │
2. useLocalVariables: if json.variables is set, instantiate them and
   merge into componentContext.variables (local wins over parent)
   │
3. Switch on json.type
   │
4. Render specific component (DivText, DivContainer, etc.)
   │
5. Component calls useDerivedFromVars for expressions
   │
6. Outer wrapper applies common styles
   │
7. Return React Native elements
```

### Variable Update Flow

```
1. Action calls setVariable(name, value)
   │
2. Variable.setValue(value) triggers observable
   │
3. Observable notifies all subscribers
   │
4. useDerivedFromVars hook receives update
   │
5. React re-renders affected components
```

### Action Execution Flow

```
1. User taps component with actions
   │
2. Outer.onPressIn() → action_animation starts (fade/scale to end_value)
   │
3. User releases tap
   │
4. Outer.onPressOut() → action_animation reverses (back to start_value)
   │   Outer.handlePress() called
   │
5. componentContext.execAnyActions(actions)
   │
6. For each action:
   │   ├─ Log statistics (onStat)
   │   ├─ Execute typed action (set_variable, set_state, etc.)
   │   └─ Call custom handler (onCustomAction)
   │
7. State updates trigger re-render
```

---

## Component System

### Base Component Pattern

All components follow this pattern:

```tsx
function DivXxx({ componentContext }: { componentContext: ComponentContext }) {
    const { json, variables } = componentContext;

    // 1. Evaluate expressions
    const derivedValue = useDerivedFromVars(json.some_prop, variables);

    // 2. Create styles
    const styles = useMemo(
        () => ({
            // React Native styles
        }),
        [derivedValue]
    );

    // 3. Render with Outer wrapper
    return <Outer componentContext={componentContext}>{/* Component-specific content */}</Outer>;
}
```

### Outer Wrapper

The `Outer` component handles common functionality:

```tsx
<Outer componentContext={context}>
    {/* Handles:
    - visibility (gone → null, invisible → opacity: 0)
    - background
    - borders
    - paddings/margins
    - actions (tap handling)
    - action_animation (fade, scale, set)
    - accessibility
  */}
</Outer>
```

### Component Registration

Components are registered in `DivComponent.tsx`:

```typescript
switch (json.type) {
  case 'text':       return <DivText ... />;
  case 'container':  return <DivContainer ... />;
  case 'image':      return <DivImage ... />;
  case 'state':      return <DivState ... />;
  case 'pager':      return <DivPager ... />;
  case 'indicator':  return <DivIndicator ... />;
  default:           return <Unknown ... />;
}
```

---

## Expression Engine

### PEG Grammar

The grammar defines expression syntax:

```
Expression = Ternary
Ternary = Or ("?" Expression ":" Expression)?
Or = And ("||" And)*
And = Comparison ("&&" Comparison)*
Comparison = Additive (("==" | "!=") Additive)*
Additive = Multiplicative (("+" | "-") Multiplicative)*
Multiplicative = Unary (("*" | "/" | "%") Unary)*
Unary = ("!" | "-")? Primary
Primary = Literal | Variable | FunctionCall | "(" Expression ")"
```

### Evaluation Process

```
1. Parse string with PEG parser
   "@{counter + 1}" → AST

2. Cache parsed AST (parserCache)

3. Walk AST with evalExpression:
   - VariableNode → lookup in variables map
   - BinaryOp → evaluate operands, apply operator
   - FunctionCall → lookup in funcs map, call with args

4. Return evaluated value
```

### Built-in Functions

Located in `expressions/funcs/`:

| Category | Functions                                                                       |
| -------- | ------------------------------------------------------------------------------- |
| Math     | `abs`, `ceil`, `floor`, `round`, `max`, `min`, `sqrt`, `pow`                    |
| String   | `len`, `contains`, `substring`, `replace`, `trim`, `toUpperCase`, `toLowerCase` |
| Array    | `len`, `getArrayValue`, `containsValue`                                         |
| Dict     | `getDictValue`, `containsKey`                                                   |
| Color    | `setColorAlpha`, `argb`, `rgb`                                                  |
| Type     | `toString`, `toNumber`, `toBoolean`                                             |
| DateTime | `formatDate`, `parseDate`, `now`                                                |

---

## Variable System

### Variable Types

```typescript
type VariableType = 'string' | 'integer' | 'number' | 'boolean' | 'color' | 'url' | 'dict' | 'array';
```

### Observable Pattern

Replaced Svelte stores with a custom Observable:

```typescript
class Observable<T> {
    private value: T;
    private subscribers = new Set<(value: T) => void>();

    subscribe(callback: (value: T) => void): () => void {
        this.subscribers.add(callback);
        callback(this.value); // Immediate call
        return () => this.subscribers.delete(callback);
    }

    set(newValue: T): void {
        this.value = newValue;
        this.subscribers.forEach(cb => cb(newValue));
    }
}
```

### Variable Class

```typescript
class Variable<T> {
    readonly name: string;
    readonly type: VariableType;
    private observable: Observable<T>;

    subscribe(callback: (value: T) => void): () => void;
    getValue(): T;
    setValue(value: T): void;
}
```

---

## Action System

### Action Types

```typescript
type ActionType =
    | 'set_variable' // Update variable value
    | 'set_state' // Switch state
    | 'array_insert_value' // Insert into array
    | 'array_remove_value' // Remove from array
    | 'array_set_value' // Set array element
    | 'dict_set_value' // Set dict key
    | 'copy_to_clipboard' // Copy text
    | 'update_structure'; // Patch JSON structure
```

### Action Handler Pattern

```typescript
function handleAction(
    componentContext: ComponentContext | undefined,
    variables: Map<string, Variable>,
    logError: (error: WrappedError) => void,
    action: TypedAction
): void {
    // Validate inputs
    // Execute action logic
    // Handle errors
}
```

### Action Execution

```typescript
async execAnyActions(
  actions: Action[],
  opts?: { componentContext?: ComponentContext; processUrls?: boolean }
): Promise<void> {
  // Variable scope for expressions inside actions — falls back to the global
  // scope when called outside a component context.
  const vars = opts?.componentContext?.variables ?? globalVariables;

  for (const raw of actions) {
    // 1. Resolve @{...} in every string field of the action (url, typed.value,
    //    payload, ...). Mirrors Web getJsonWithVars(action).
    const action = prepareVars(raw).hasExpression
      ? prepareVars(raw).applyVars(vars, undefined, true).result
      : raw;

    // 2. Log statistics
    if (action.log_id) onStat({ type: 'action', action });

    // 3. Execute typed action
    if (action.typed) {
      switch (action.typed.type) {
        case 'set_variable': /* ... */
        case 'set_state': /* ... */
        // ...
      }
    }

    // 4. Handle URL action (URL is already substituted)
    if (action.url) onCustomAction(action);
  }
}
```

---

## Animation System

### Action Animation

Tap animations are handled in the `Outer` component using React Native's `Animated` API.

```
1. JSON specifies action_animation (fade, scale, or set)
   │
2. flattenAnimation() expands sets into flat list
   │
3. parseActionAnimations() creates typed animation configs
   │
4. Animated.Value refs created (opacity, scale)
   │
5. On pressIn: Animated.timing → end_value
   │
6. On pressOut: Animated.timing → start_value
```

### Web → RN Mapping

| Web (CSS Transitions)                    | React Native (Animated API)          |
| ---------------------------------------- | ------------------------------------ |
| CSS `transition: opacity 500ms`          | `Animated.timing(opacity, {...})`    |
| CSS `:active { opacity: 0.4 }`          | `onPressIn` → animate to end_value  |
| CSS `transform: scale(0.5)`              | `transform: [{ scale: animScale }]` |
| CSS interpolators (`ease-in-out`)        | `Easing.inOut(Easing.ease)`          |
| Multiple transitions (comma-separated)  | `Animated.parallel([...])`           |

### Performance

- Uses `useNativeDriver: true` for all animations (opacity + transform)
- Animations run on the UI thread, not JS thread
- `Animated.Value` refs are stable (created once via `useRef`)

---

## Transition System

DivKit defines three kinds of transitions, all driven by the `Outer` wrapper:

- `transition_in`  — appearance on mount / visibility flip to `visible`.
- `transition_out` — disappearance on visibility flip to `gone` / `invisible`,
  or unmount triggered by `DivState`.
- `transition_change` (change_bounds) — element geometry change.

### Appearance transitions (in / out)

Implemented in [`hooks/useAppearanceTransition.ts`](../src/hooks/useAppearanceTransition.ts).

```
1. JSON spec (fade / scale / slide / set) is flattened via flattenTransition()
   │
2. normalize() merges items into one NormalizedTransition (per-type duration,
   delay, easing, plus pivot / slide edge / alpha / scale endpoint)
   │
3. Animated.Value refs created: opacity, scale, slideTx, slideTy
   │
4. Driver mode chooses when to fire:
   - 'visibility'  → visibility prop change triggers in/out
   - 'imperative'  → consumer calls playIn() / playOut() manually
   - 'auto-in'     → like imperative, but transition_in plays on first mount
   │
5. transition_out finished → rendered = false (collapsed = true)
   transition_in  finished → returns to identity, child stays mounted
```

The hook exposes both **declarative** outputs (`rendered`, `collapsed`,
`opacity`, `transform`) and **imperative** controls (`playIn()`, `playOut()`
returning `Promise<void>`).

#### Off-center scale (pivot_x / pivot_y)

React Native's `Animated.transform` only supports center-anchored scale. Off-
center pivots are emulated via translate-scale-translate, computed from
`onLayout` measurements (`layoutWidth` / `layoutHeight`).

#### Slide without `distance`

If `distance` is omitted, the hook falls back to `Dimensions.get('window')` for
the relevant axis (mirrors Web's window-size fallback).

### transition_change (change_bounds)

Two layers cooperate for smooth change_bounds:

1. **The element itself** — animated by FLIP via
   [`useChangeBoundsTransition`](../src/hooks/useChangeBoundsTransition.ts).
   On each `onLayout`:
   - Capture previous (First) and new (Last) bounds.
   - Set `transform = translate(-dx, -dy) * scale(prevW/newW, prevH/newH)` so the
     element visually stays at the old spot (Invert).
   - `Animated.timing(...)` rides the transforms back to identity (Play).
   - Uses `useNativeDriver: true` and honors the spec's `interpolator` and
     `start_delay` (custom cubic curves are respected).

2. **Neighbors** — reflow via React Native's `LayoutAnimation`, queued through
   [`utils/configureChangeBoundsLayout.ts`](../src/utils/configureChangeBoundsLayout.ts).
   `LayoutAnimation` only supports coarse easings (`linear`, `easeIn`, `easeOut`,
   `easeInEaseOut`, `spring`), so neighbour reflow is approximated.

### transitions inside DivState

[`DivStateScopeContext`](../src/context/DivStateScopeContext.tsx) is a scoped
context provided by each `DivState`. Children rendered inside register their
`playOut` callback via `registerTransitionOutPlayer`.

State swap sequence:

```
1. setState(newId) requested via action / variable binding
   │
2. DivState collects all registered playOut callbacks
   │
3. await Promise.all(playOuts())  — wait for transition_out to finish
   │
4. Render new state's children
   │
5. Each new Outer mounts with mode='auto-in' and plays transition_in
   │
6. transition_change of the state container queues LayoutAnimation
   for smooth size change of the wrapper
```

This mirrors Web's `stateCtx.registerChildWithTransitionOut`.

### Triggers

`transition_triggers` (`state_change`, `visibility_change`) are honored by the
underlying hooks. `visibility_change` is the implicit default for in/out
transitions; `state_change` for change_bounds inside `DivState`.

---

## Context Architecture

### DivKitContext

Main context for the entire DivKit tree:

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

    // Component management
    registerComponent: (id: string, context: ComponentContext) => void;
    unregisterComponent: (id: string) => void;
    genId: (key: string) => string;
}
```

### StateContext

Manages state components:

```typescript
interface StateContextValue {
    registerState: (componentId: string, setState: StateSetter) => () => void;
    switchState: (stateId: string) => Promise<void>;
    getStateSetter: (componentId: string) => StateSetter | undefined;
}
```

### DivStateScopeContext

Scoped per `DivState` — collects `transition_out` players from its children so
that the state swap can await all out-animations in parallel:

```typescript
interface DivStateScopeValue {
    registerTransitionOutPlayer(play: () => Promise<void>): () => void;
}
```

### PagerContext

Binds a `DivPager` to its `DivIndicator(s)`:

```typescript
interface PagerContextValue {
    registerPager: (id: string, snapshot: PagerSnapshot) => () => void;
    listenPager: (id: string, callback: (snapshot: PagerSnapshot) => void) => () => void;
    scrollToItem: (id: string, index: number) => void;
}
```

### ComponentContext

Per-component context (passed down the tree):

```typescript
interface ComponentContext<T = DivBaseData> {
    path: string[];
    json: T;
    origJson: T;
    variables?: Map<string, Variable>; // root scope + ancestors' local variables
    id: string;
    parent?: ComponentContext;

    // Methods
    logError: (error: WrappedError) => void;
    execAnyActions: (actions: Action[]) => Promise<void>;
    produceChildContext: (div: DivBaseData, opts?) => ComponentContext;
    getVariable: (name: string) => Variable | undefined;
}
```

`produceChildContext` is a regular method (not an arrow), so `this.variables`
refers to whichever context the caller is on — that's how local variables from
`useLocalVariables` propagate to descendants without being clobbered by the
root closure.

---

## Rendering Pipeline

### Phase 1: JSON Preparation

```typescript
// Parse and validate
const card = data.card;
const state = card.states[0];
const divData = state.div;

// Apply templates
const { json: resolvedDiv } = applyTemplate(divData, {}, templates, logError);
```

### Phase 2: Variable Initialization

Root scope is seeded from `card.variables`:

```typescript
const variables = new Map<string, Variable>();

card.variables?.forEach(varData => {
    const variable = createVariable(varData.name, varData.type, varData.value);
    variables.set(varData.name, variable);
});
```

Any inner div-node may declare its own `variables` array; those are instantiated
lazily by the `useLocalVariables` hook (in `DivComponent.tsx`) and merged with
the parent scope. Combined with template `$value` substitution this lets a
template parameter flow into a real DivKit variable visible inside `@{...}`:

```json
"templates": {
  "prize_card": {
    "type": "container",
    "variables": [
      { "name": "description", "type": "string", "value": "", "$value": "description" }
    ],
    "items": [ /* @{description} is now resolvable here */ ]
  }
}
```

### Phase 3: Context Creation

```typescript
const rootComponentContext: ComponentContext = {
    path: [],
    json: resolvedDiv,
    variables,
    id: genId('root')
    // ... methods
};
```

### Phase 4: Component Rendering

```tsx
<DivKitContext.Provider value={contextValue}>
    <StateContext.Provider value={stateContextValue}>
        <View style={styles.container}>
            <DivComponent componentContext={rootComponentContext} />
        </View>
    </StateContext.Provider>
</DivKitContext.Provider>
```

---

## Design Decisions

### Why Observable instead of Svelte Stores?

Svelte stores require Svelte runtime. We created a minimal Observable class that:

- Has the same subscription API
- Works with React's useEffect
- Has no external dependencies

### Why Hooks instead of HOCs?

React hooks provide:

- Better composability
- Cleaner code
- Better TypeScript support
- More predictable re-renders

### Why ComponentContext pattern?

The ComponentContext pattern:

- Mirrors Web implementation structure
- Enables easy child context creation
- Preserves path information for debugging
- Allows component-specific overrides

### Why PEG.js for expressions?

PEG.js (Peggy):

- Same grammar as Web version
- Generates efficient parser
- Easy to extend
- Good error messages

### Why not Redux/MobX?

Simple Observable pattern:

- Minimal overhead
- Direct compatibility with Web
- Sufficient for variable updates
- Easy to understand

---

## Performance Considerations

### Memoization

- Components use `useMemo` for expensive computations
- Derived values are cached
- Styles are memoized per-component

### Re-render Optimization

- Context values are memoized with `useMemo`
- Variables update only subscribed components
- Child contexts are only created when needed

### Future Optimizations

- [ ] VirtualizedList for large containers
- [ ] Image caching with FastImage
- [ ] Lazy component loading
- [ ] Expression result caching

---

## Testing Strategy

### Unit Tests

- Expression evaluation
- Variable operations
- Action handlers
- Utility functions (`flattenTransition`, `configureChangeBoundsLayout`, …)

### Component Tests

- Render output
- Style application
- Event handling
- Context usage

### Integration Tests

- Variable → Component updates
- Action → State changes
- URL-action `set_variable` (`tests/integration-rn/url-action-set-variable.test.tsx`)
- Full render cycle

### Snapshot / Visual Tests

- Jest snapshot tests for component output
- Maestro flows for end-to-end visual verification on Android
  (`examples/NewExample/.maestro/snapshots/*.yaml`), covering all examples
  including `transition_change` and `transition_in_out_visibility`.

---

## License

Apache 2.0

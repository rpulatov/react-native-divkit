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
│   └── utilities/
│       ├── Outer.tsx           # Base wrapper
│       └── Unknown.tsx         # Unknown type fallback
│
├── context/                    # React contexts
│   ├── DivKitContext.tsx       # Main context
│   ├── ActionContext.tsx       # Action context
│   └── StateContext.tsx        # State context
│
├── hooks/                      # React hooks
│   ├── useDerivedFromVars.ts   # Expression evaluation hook
│   ├── useVariable.ts          # Variable subscription hooks
│   ├── useAction.ts            # Action execution hooks
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
│   ├── correct*.ts             # Value converters
│   └── ...                     # Other utilities
│
├── types/                      # TypeScript types
│   ├── base.d.ts               # Base component types
│   ├── text.d.ts               # Text types
│   ├── container.d.ts          # Container types
│   ├── image.d.ts              # Image types
│   ├── state.d.ts              # State types
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

  getValue(): T { return this.value; }
  setValue(newValue: T): void { /* notify subscribers */ }
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
└── platform: 'desktop' | 'touch'

ActionContext
└── hasAction: () => boolean

StateContext
├── registerState: (id, setter) => unsubscribe
└── switchState: (stateId) => Promise<void>
```

### Layer 4: Component System

Components render JSON types as React Native views:

```
DivKit.tsx          → Provider setup
DivComponent.tsx    → Type router
DivText.tsx         → <Text> rendering
DivContainer.tsx    → <View> with flex
DivImage.tsx        → <Image> loading
DivState.tsx        → Conditional render
Outer.tsx           → Base wrapper
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
2. Switch on json.type
   │
3. Render specific component (DivText, DivContainer, etc.)
   │
4. Component calls useDerivedFromVars for expressions
   │
5. Outer wrapper applies common styles
   │
6. Return React Native elements
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
2. Outer.handlePress() called
   │
3. componentContext.execAnyActions(actions)
   │
4. For each action:
   │   ├─ Log statistics (onStat)
   │   ├─ Execute typed action (set_variable, set_state, etc.)
   │   └─ Call custom handler (onCustomAction)
   │
5. State updates trigger re-render
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
  const styles = useMemo(() => ({
    // React Native styles
  }), [derivedValue]);

  // 3. Render with Outer wrapper
  return (
    <Outer componentContext={componentContext}>
      {/* Component-specific content */}
    </Outer>
  );
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

| Category | Functions |
|----------|-----------|
| Math | `abs`, `ceil`, `floor`, `round`, `max`, `min`, `sqrt`, `pow` |
| String | `len`, `contains`, `substring`, `replace`, `trim`, `toUpperCase`, `toLowerCase` |
| Array | `len`, `getArrayValue`, `containsValue` |
| Dict | `getDictValue`, `containsKey` |
| Color | `setColorAlpha`, `argb`, `rgb` |
| Type | `toString`, `toNumber`, `toBoolean` |
| DateTime | `formatDate`, `parseDate`, `now` |

---

## Variable System

### Variable Types

```typescript
type VariableType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'color'
  | 'url'
  | 'dict'
  | 'array';
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
  | 'set_variable'      // Update variable value
  | 'set_state'         // Switch state
  | 'array_insert_value'// Insert into array
  | 'array_remove_value'// Remove from array
  | 'array_set_value'   // Set array element
  | 'dict_set_value'    // Set dict key
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
async execAnyActions(actions: Action[]): Promise<void> {
  for (const action of actions) {
    // 1. Log statistics
    if (action.log_id) onStat({ type: 'action', action });

    // 2. Execute typed action
    if (action.typed) {
      switch (action.typed.type) {
        case 'set_variable': /* ... */
        case 'set_state': /* ... */
        // ...
      }
    }

    // 3. Handle URL action
    if (action.url) onCustomAction(action);
  }
}
```

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

### ComponentContext

Per-component context (passed down the tree):

```typescript
interface ComponentContext<T = DivBaseData> {
  path: string[];
  json: T;
  origJson: T;
  variables: Map<string, Variable>;
  id: string;
  parent?: ComponentContext;

  // Methods
  logError: (error: WrappedError) => void;
  execAnyActions: (actions: Action[]) => Promise<void>;
  produceChildContext: (div: DivBaseData, opts?) => ComponentContext;
  getVariable: (name: string) => Variable | undefined;
}
```

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

```typescript
const variables = new Map<string, Variable>();

card.variables?.forEach(varData => {
  const variable = createVariable(
    varData.name,
    varData.type,
    varData.value
  );
  variables.set(varData.name, variable);
});
```

### Phase 3: Context Creation

```typescript
const rootComponentContext: ComponentContext = {
  path: [],
  json: resolvedDiv,
  variables,
  id: genId('root'),
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
- Utility functions

### Component Tests

- Render output
- Style application
- Event handling
- Context usage

### Integration Tests

- Variable → Component updates
- Action → State changes
- Full render cycle

---

## License

Apache 2.0

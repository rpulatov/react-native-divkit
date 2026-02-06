# DivKit React Hooks

Custom React hooks для работы с DivKit в React Native приложениях.

## Hooks Overview

### 1. `useDerivedFromVars` - Реактивность переменных

Главный hook для подстановки переменных в JSON props с автоматическим обновлением при изменении переменных.

**Использование:**

```tsx
import { useDerivedFromVars } from './hooks';

function DivText({ json, variables }: Props) {
    // json.text = "Hello @{userName}!"
    const text = useDerivedFromVars(json.text, { variables });
    // text = "Hello Alice!" - обновляется при изменении userName

    return <Text>{text}</Text>;
}
```

**Опции:**

- `variables` - Map переменных из DivKitContext
- `additionalVars` - дополнительные локальные переменные
- `keepComplex` - сохранять dict/array как объекты (не stringify)
- `maxDepth` - максимальная глубина обработки (default: 10)
- `customFunctions` - кастомные функции для expressions
- `weekStartDay` - день начала недели (0 = воскресенье)

**Simplified version:**

```tsx
const text = useDerivedFromVarsSimple(json.text, variables);
```

---

### 2. `useVariable` - Подписка на переменную

Подписывается на конкретную переменную по имени и обновляет компонент при её изменении.

**Использование:**

```tsx
import { useVariable } from './hooks';

function UserGreeting() {
    const userName = useVariable('userName');

    return <Text>Hello {userName}</Text>;
}
```

**Related hooks:**

- `useVariableInstance(variable)` - подписка на Variable инстанс
- `useVariableSetter(name)` - получить setter функцию
- `useVariableState(name)` - получить [value, setter] tuple (как useState)

**Example with setter:**

```tsx
function Counter() {
    const [count, setCount] = useVariableState('counter');

    return (
        <View>
            <Text>Count: {count}</Text>
            <Button title="+" onPress={() => setCount((count || 0) + 1)} />
        </View>
    );
}
```

---

### 3. `useAction` - Выполнение actions

Hooks для выполнения DivKit actions (click, visibility, etc.)

**Использование:**

```tsx
import { useActionHandler } from './hooks';

function DivText({ json }: { json: DivTextJson }) {
    const onPress = useActionHandler(json.actions);

    return (
        <Pressable onPress={onPress}>
            <Text>{json.text}</Text>
        </Pressable>
    );
}
```

**Available hooks:**

- `useAction(options)` - выполнить одиночный action
- `useActions(options)` - выполнить массив actions
- `useActionHandler(actions, options)` - получить onPress handler
- `useHasActions(actions)` - проверить наличие actions

**Example with useAction:**

```tsx
function MyButton() {
    const execAction = useAction({ processUrls: true });

    const handlePress = () => {
        execAction({
            log_id: 'button_click',
            typed: { type: 'set_variable', variable_name: 'counter', value: 42 }
        });
    };

    return <Button title="Click" onPress={handlePress} />;
}
```

---

## Architecture

### Паттерн реализации

Все hooks следуют единому паттерну:

1. **Получение контекста** - через `useDivKitContext()`
2. **Подписка на изменения** - через `useEffect` + Variable.subscribe()
3. **Автоматический cleanup** - unsubscribe в return useEffect

### Зависимости

- `DivKitContext` - главный контекст с переменными и actions
- `Observable` - реализация реактивности (замена Svelte stores)
- `Variable` - классы переменных с методом subscribe()
- `prepareVars` / `applyVars` - обработка expressions в JSON

### Связь с Web реализацией

Эти hooks заменяют Svelte реактивные конструкции:

| Svelte (Web)                            | React Native (Hooks)                      |
| --------------------------------------- | ----------------------------------------- |
| `$: derived = getDerivedFromVars(json)` | `useDerivedFromVars(json, { variables })` |
| `$variable` (auto-subscribe)            | `useVariable('variable')`                 |
| `execAnyActions(actions)`               | `useActions(options)`                     |

---

## Best Practices

### 1. Оптимизация производительности

```tsx
// ❌ Плохо - создается новый объект options каждый рендер
const text = useDerivedFromVars(json.text, { variables, keepComplex: true });

// ✅ Хорошо - используем useMemo для стабильного объекта
const options = useMemo(() => ({ variables, keepComplex: true }), [variables]);
const text = useDerivedFromVars(json.text, options);

// ✅ Или используйте simplified version для базовых случаев
const text = useDerivedFromVarsSimple(json.text, variables);
```

### 2. Условная подписка

```tsx
// useVariable автоматически обрабатывает отсутствие переменной
const userName = useVariable('userName'); // undefined если не найдена

// Для проверки наличия:
if (userName !== undefined) {
    // переменная существует
}
```

### 3. Action handling

```tsx
// ✅ Простой случай - используйте useActionHandler
const onPress = useActionHandler(json.actions);

// ✅ Сложный случай - используйте useActions для контроля
const execActions = useActions({ componentContext, processUrls: false });
const handlePress = async () => {
    await execActions(json.actions);
    console.log('Actions completed');
};
```

---

## Testing

### Unit тесты

```tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { useVariable } from './hooks';
import { createVariable } from '../expressions/variable';

test('useVariable subscribes and updates', () => {
    const variable = createVariable('test', 'string', 'initial');
    const variables = new Map([['test', variable]]);

    const { result } = renderHook(() => useVariable('test'), {
        wrapper: ({ children }) => (
            <DivKitContext.Provider value={{ variables /* ... */ }}>{children}</DivKitContext.Provider>
        )
    });

    expect(result.current).toBe('initial');

    act(() => {
        variable.setValue('updated');
    });

    expect(result.current).toBe('updated');
});
```

---

## Migration from Web

При портировании компонентов из Web версии:

1. Замените `$: derived = getDerivedFromVars(...)` на `useDerivedFromVars(...)`
2. Замените `$variable` на `useVariable('variable')`
3. Замените прямые вызовы `execAnyActions` на `useActions()` hook
4. Удалите `onMount` и замените на `useEffect`

**Пример миграции:**

```svelte
<!-- Web (Svelte) -->
<script>
  import { getContext } from 'svelte';
  const { variables } = getContext(ROOT_CTX);

  $: text = getDerivedFromVars(json.text);
  $: color = getDerivedFromVars(json.color);
</script>
```

```tsx
// React Native
function DivText({ json }: Props) {
    const { variables } = useDivKitContext();

    const text = useDerivedFromVarsSimple(json.text, variables);
    const color = useDerivedFromVarsSimple(json.color, variables);

    return <Text style={{ color }}>{text}</Text>;
}
```

---

## Next Steps

После реализации hooks, следующие фазы:

- **Phase 4:** Base Component Wrapper (Outer.tsx)
- **Phase 5:** MVP Components (Text, Container, Image, State)
- **Phase 6:** Main DivKit Component integration

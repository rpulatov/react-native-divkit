# react-native-divkit

Рендерер DivKit для React Native — фреймворк для Server-Driven UI.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/react-native-divkit.svg)](https://www.npmjs.com/package/react-native-divkit)

## Обзор

DivKit — это фреймворк для построения UI на основе данных с сервера (Server-Driven UI), который позволяет описывать макеты в формате JSON и рендерить их нативно. Данная реализация для React Native основана на веб-версии DivKit, переиспользуя движок выражений и адаптируя компоненты под React Native.

## Статус

**MVP**

| Функция                            | Статус      |
| ---------------------------------- | ----------- |
| Текстовый компонент                | ✅ Готово   |
| Компонент контейнера               | ✅ Готово   |
| Компонент изображения              | ✅ Готово   |
| Компонент состояния                | ✅ Готово   |
| Компонент Pager                    | ✅ Готово   |
| Компонент Indicator                | ✅ Готово   |
| Система переменных                 | ✅ Готово   |
| Движок выражений                   | ✅ Готово   |
| Обработчики действий               | ✅ Готово   |
| Подстановка шаблонов               | ✅ Готово   |
| Анимации нажатия (action_animation)| ✅ Готово   |
| Transition_in / transition_out     | ✅ Готово   |
| Transition_change (change_bounds)  | ✅ Готово   |

## Скриншоты

<p>
  <img src="screenshots/image1.png" width="200" alt="" />
  <img src="screenshots/image3.png" width="200" alt="" />
  <img src="screenshots/image4.png" width="200" alt="" />
  <img src="screenshots/image8.png" width="200" alt="" />
</p>

## Установка

```bash
npm install react-native-divkit
```

### Каналы релизов

- `latest` — стабильная версия (ветка `main`).
- `alpha` — тестовая версия с новыми фичами до их стабилизации (ветка `alpha`).

```bash
# Стабильная версия
npm install react-native-divkit

# Alpha-версия (тестовая, может содержать баги и breaking changes)
npm install react-native-divkit@alpha
```

Alpha-релизы публикуются автоматически из ветки `alpha` через semantic-release
и получают версии вида `1.12.0-alpha.1`, `1.12.0-alpha.2` и т.д. Когда фичи
из `alpha` стабилизируются, они мержатся в `main` и выходят как обычный релиз
под тегом `latest`.

### Опциональные зависимости

Для расширенной функциональности установите следующие пакеты:

```bash
# Оптимизированная загрузка изображений с кешированием
# (используется через imageAdapter — см. ниже)
npm install react-native-fast-image
# или
npx expo install expo-image

# Поддержка градиентов (фоны)
npm install react-native-linear-gradient

# Поддержка буфера обмена
npm install @react-native-clipboard/clipboard
```

### Кастомный загрузчик картинок

По умолчанию `DivImage` рендерит через `react-native` `Image`. Чтобы получить
дисковый кэш / GIF / blurhash без форка библиотеки — подключите готовый пресет:

```tsx
import { DivKit } from 'react-native-divkit';
import { expoImageAdapter } from 'react-native-divkit/adapters/expo-image';
// или: import { fastImageAdapter } from 'react-native-divkit/adapters/fast-image';

<DivKit data={json} imageAdapter={expoImageAdapter} />;
```

Свой адаптер пишется через интерфейс `DivImageAdapter` —
см. [docs/API.md → Image adapter](docs/API.md#image-adapter).

## Быстрый старт

```tsx
import { DivKit } from 'react-native-divkit';

const divKitJson = {
    card: {
        log_id: 'hello_world',
        states: [
            {
                state_id: 0,
                div: {
                    type: 'text',
                    text: 'Привет, @{name}!',
                    font_size: 24,
                    text_color: '#000000',
                    text_alignment_horizontal: 'center'
                }
            }
        ],
        variables: [
            {
                type: 'string',
                name: 'name',
                value: 'Мир'
            }
        ]
    }
};

export default function App() {
    return (
        <DivKit
            data={divKitJson}
            onStat={stat => console.log('Статистика:', stat.type, stat.action.log_id)}
            onCustomAction={action => console.log('Кастомное действие:', action.url)}
            onError={error => console.error('Ошибка:', error.message)}
        />
    );
}
```

## Компоненты

### Text (Текст)

```json
{
    "type": "text",
    "text": "Привет, мир",
    "font_size": 16,
    "font_weight": "bold",
    "text_color": "#000000",
    "text_alignment_horizontal": "center",
    "max_lines": 2
}
```

### Container (Контейнер)

```json
{
    "type": "container",
    "orientation": "vertical",
    "items": [
        { "type": "text", "text": "Элемент 1" },
        { "type": "text", "text": "Элемент 2" }
    ],
    "content_alignment_horizontal": "center"
}
```

### Image (Изображение)

```json
{
    "type": "image",
    "image_url": "https://example.com/image.png",
    "scale": "fill",
    "width": { "type": "fixed", "value": 200 },
    "height": { "type": "fixed", "value": 150 }
}
```

### State (Состояние)

```json
{
    "type": "state",
    "id": "my_state",
    "default_state_id": "state1",
    "states": [
        {
            "state_id": "state1",
            "div": { "type": "text", "text": "Состояние 1" }
        },
        {
            "state_id": "state2",
            "div": { "type": "text", "text": "Состояние 2" }
        }
    ]
}
```

## Переменные

Объявление переменных в JSON:

```json
{
    "card": {
        "variables": [
            { "type": "string", "name": "userName", "value": "Мир" },
            { "type": "integer", "name": "counter", "value": 0 },
            { "type": "color", "name": "textColor", "value": "#FF0000" },
            { "type": "boolean", "name": "isActive", "value": true }
        ]
    }
}
```

Использование переменных в выражениях:

```json
{
    "type": "text",
    "text": "Привет, @{userName}!",
    "text_color": "@{textColor}"
}
```

### Типы переменных

| Тип       | Описание         | Пример             |
| --------- | ---------------- | ------------------ |
| `string`  | Текстовая строка | `"Hello"`          |
| `integer` | Целое число      | `42`               |
| `number`  | Дробное число    | `3.14`             |
| `boolean` | Логическое       | `true`             |
| `color`   | Цвет             | `"#FF5500"`        |
| `url`     | URL              | `"https://..."`    |
| `dict`    | Словарь (объект) | `{"key": "value"}` |
| `array`   | Список (массив)  | `[1, 2, 3]`        |

### Локальные переменные на узле / в шаблоне

`variables` можно объявить не только на `card`, но и на любом div-узле.
Они видны только внутри этого узла и его потомков (в том числе в `@{...}`
внутри `url` и `typed.value` экшенов). Совместно с подменой `$value` в
шаблонах это позволяет провести параметр шаблона как полноценную переменную:

```json
"templates": {
  "prize_card": {
    "type": "container",
    "variables": [
      { "name": "description", "type": "string", "value": "", "$value": "description" }
    ],
    "items": [
      { "type": "text", "$text": "description" },
      {
        "type": "container",
        "actions": [
          { "url": "myapp://prize?d=@{description}", "log_id": "tap" }
        ]
      }
    ]
  }
}
```

Каждый инстанс `prize_card` получит свой `description` — `@{description}`
резолвится индивидуально для каждой карточки.

## Действия (Actions)

Действия вызываются при взаимодействии с пользователем:

```json
{
    "type": "text",
    "text": "Нажми меня",
    "actions": [
        {
            "log_id": "button_tap",
            "url": "divkit://custom_action"
        }
    ]
}
```

> Перед отправкой action в обработчик все поля (`url`, `typed.value`,
> `payload`, …) пропускаются через резолв `@{...}` против переменных
> компонента — то же поведение, что у Web (`getJsonWithVars(action)`).
> В колбэк `onCustomAction` приходит уже подставленный URL.

### Типизированные действия

#### set_variable (установка переменной)

```json
{
    "typed": {
        "type": "set_variable",
        "variable_name": "counter",
        "value": { "type": "integer", "value": 10 }
    }
}
```

#### set_state (смена состояния)

```json
{
    "typed": {
        "type": "set_state",
        "state_id": "my_state",
        "temporary_state_id": "state2"
    }
}
```

## Анимации нажатия (Action Animation)

Компоненты с действиями могут иметь анимацию при нажатии. Поддерживаются анимации `fade` (прозрачность), `scale` (масштаб) и их комбинация через `set`.

```json
{
    "type": "text",
    "text": "Нажми меня",
    "actions": [
        {
            "log_id": "button_tap",
            "url": "div-action://tap"
        }
    ],
    "action_animation": {
        "name": "fade",
        "start_value": 1,
        "end_value": 0.4,
        "duration": 500,
        "interpolator": "ease_in_out"
    }
}
```

### Комбинированная анимация (Set)

```json
{
    "action_animation": {
        "name": "set",
        "items": [
            {
                "name": "fade",
                "start_value": 1,
                "end_value": 0.2,
                "duration": 300,
                "interpolator": "ease_in_out"
            },
            {
                "name": "scale",
                "start_value": 1,
                "end_value": 0.5,
                "duration": 500,
                "interpolator": "ease_in_out"
            }
        ]
    }
}
```

### Параметры анимации

| Параметр       | Тип     | По умолч.    | Описание                    |
| -------------- | ------- | ------------ | --------------------------- |
| `name`         | string  | —            | `fade`, `scale`, `set`, `native`, `no_animation` |
| `start_value`  | number  | `1`          | Начальное значение          |
| `end_value`    | number  | `1`          | Конечное значение           |
| `duration`     | number  | `300`        | Длительность в миллисекундах|
| `start_delay`  | number  | `0`          | Задержка перед стартом      |
| `interpolator` | string  | `ease_in_out`| `linear`, `ease`, `ease_in`, `ease_out`, `ease_in_out`, `spring` |

## Свойства (Props)

| Свойство         | Тип                    | Обязательно | Описание                           |
| ---------------- | ---------------------- | ----------- | ---------------------------------- |
| `data`           | `DivJson`              | Да          | JSON-данные DivKit                 |
| `onStat`         | `(stat) => void`       | Нет         | Колбэк статистики                  |
| `onCustomAction` | `(action) => void`     | Нет         | Обработчик кастомных действий      |
| `onError`        | `(error) => void`      | Нет         | Обработчик ошибок                  |
| `direction`      | `'ltr' \| 'rtl'`       | Нет         | Направление текста (по умолч.: `'ltr'`) |
| `platform`       | `'desktop' \| 'touch'` | Нет         | Тип платформы (по умолч.: `'touch'`) |
| `style`          | `ViewStyle`            | Нет         | Стили контейнера                   |

## Хуки

Для продвинутого использования вы можете использовать хуки напрямую:

```tsx
import { useDivKitContext, useVariable, useVariableState, useAction } from 'react-native-divkit';

function MyComponent() {
    const { setVariable } = useDivKitContext();
    const counter = useVariable('counter');

    return (
        <View>
            <Text>Счетчик: {counter}</Text>
            <Button onPress={() => setVariable('counter', counter + 1)} title="Увеличить" />
        </View>
    );
}
```

## Примеры

Смотрите директорию [examples/NewExample](examples/NewExample/) — готовое React Native приложение, демонстрирующее все возможности (включая Pager + Indicator, action_animation, transition_in/out и transition_change). Прогон визуальных снапшотов настроен через Maestro в `examples/NewExample/.maestro/`.

```bash
cd examples/NewExample
npm install
npm run ios   # или npm run android
```

## Документация

- [Справочник API](docs/API.md) - Полная документация API
- [Руководство по миграции](docs/MIGRATION.md) - Миграция с веб-версии
- [Архитектура](docs/ARCHITECTURE.md) - Внутренняя архитектура

## Не включено в MVP

Следующие функции запланированы для будущих версий:

- Gallery (Галерея), Slider (Слайдер), Tabs (Вкладки)
- Input (Ввод), Select (Выбор), Switch (Переключатель)
- Видео, Lottie-анимации
- Диапазоны текста, сложные градиенты
- API пользовательских компонентов

## Архитектура

Библиотека основана на DivKit Web (TypeScript + Svelte):

| Компонент         | Переиспользование       |
| ----------------- | ----------------------- |
| Движок выражений  | 100% скопировано        |
| Определения типов | 100% скопировано        |
| Утилиты           | ~90% адаптировано       |
| Компоненты        | ~20% (переписано под RN)|
| Система контекстов| Новая (специфично для React)|

## Разработка

```bash
# Установка зависимостей
npm install

# Сборка парсера PEG
npm run build:peggy

# Проверка типов
npm run typecheck

# Линтинг
npm run lint

# Сборка
npm run build

# Тесты
npm test
```

## Лицензия

Apache 2.0

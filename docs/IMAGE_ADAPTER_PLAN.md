# План работ: универсальный Image-адаптер для DivKit

## Цель

Дать пользователю возможность подключить **любую** библиотеку для загрузки картинок (`react-native` Image, `expo-image`, `react-native-fast-image`, кастомную) без правок исходников `react-native-divkit`. Сейчас [src/components/image/DivImage.tsx](../src/components/image/DivImage.tsx) жёстко импортирует `Image` из `react-native`, что блокирует переход на expo-image / FastImage и приводит к плохому кэшированию на экранах с большим числом картинок (как в `prizesSmartphones.json` — каждый prize_card грузит свою product-image).

## Мотивация

| Библиотека | Кэш на диск | GIF | blurhash | tintColor | transition |
|------------|-------------|-----|----------|-----------|------------|
| RN `Image` (дефолт) | слабый | iOS только | — | да | — |
| `react-native-fast-image` | да (SDWebImage/Glide) | да | — | да | — |
| `expo-image` | да | да | да | да | да |

Универсальный API позволит выбирать оптимальную реализацию под нужды проекта без форка либы.

---

## Архитектура

### Контракт адаптера

Минимальный интерфейс, покрывающий всё, что реально нужно `DivImage` (см. [DivImage.tsx](../src/components/image/DivImage.tsx)):

```ts
// src/types/imageAdapter.ts
import type { ReactElement } from 'react';
import type { ImageStyle } from 'react-native';
import type { ImageScale } from './imageScale';

export interface DivImageAdapter {
    /**
     * Рендер картинки. Стили (width/height/aspectRatio) уже посчитаны библиотекой.
     * Адаптер мапит `scale` на свой проп (resizeMode/contentFit/...).
     */
    render(props: {
        uri: string;
        scale: ImageScale;          // 'fill' | 'fit' | 'stretch' | 'no_scale'
        style: ImageStyle;
        onLoadEnd: () => void;
        onError: () => void;
    }): ReactElement;

    /**
     * Натуральные размеры картинки. Нужно для:
     *   - height: wrap_content без aspect
     *   - scale: no_scale (для корректного позиционирования)
     */
    getSize(uri: string): Promise<{ width: number; height: number }>;
}
```

### Прокидывание через контекст

1. Добавить опциональное поле `imageAdapter?: DivImageAdapter` в [DivKitProps](../src/DivKit.tsx#L64) и в `DivKitContextValue` ([context/DivKitContext.ts](../src/context/DivKitContext.ts)).
2. В `DivKit.tsx` положить адаптер в провайдер. Если не задан — fallback на встроенный `rnImageAdapter`.
3. В `DivImage.tsx` достать адаптер через `useDivKitContext()` и заменить:
   - `<Image source={...} resizeMode={resizeMode} ...>` → `adapter.render({ uri, scale, style, ... })`
   - `Image.getSize(uri, success, error)` → `adapter.getSize(uri).then(...).catch(...)`

### Пресеты адаптеров

Шипим **раздельными подпутями**, чтобы пользователь не тащил лишние peer-зависимости через side-import:

```
src/adapters/
├── rn-image.ts        # default — react-native Image
├── expo-image.ts      # expo-image
└── fast-image.ts      # react-native-fast-image
```

В `package.json` добавить `exports`:

```json
"exports": {
  ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
  "./adapters/rn-image":   { "import": "./dist/adapters/rn-image.js",   "types": "./dist/adapters/rn-image.d.ts" },
  "./adapters/expo-image": { "import": "./dist/adapters/expo-image.js", "types": "./dist/adapters/expo-image.d.ts" },
  "./adapters/fast-image": { "import": "./dist/adapters/fast-image.js", "types": "./dist/adapters/fast-image.d.ts" }
}
```

`expo-image` и `react-native-fast-image` уйдут в `peerDependenciesMeta` как optional (FastImage там уже есть в `optionalDependencies` — переведём в `peerDependenciesMeta` для чистоты).

---

## Маппинг scale → API

| DivKit `scale` | RN `Image` resizeMode | `expo-image` contentFit | `FastImage` resizeMode |
|----------------|----------------------|------------------------|-----------------------|
| `fill`         | `cover`              | `cover`                | `FastImage.resizeMode.cover` |
| `fit`          | `contain`            | `contain`              | `FastImage.resizeMode.contain` |
| `stretch`      | `stretch`            | `fill`                 | `FastImage.resizeMode.stretch` |
| `no_scale`     | `center`             | `none`                 | `FastImage.resizeMode.center` |

## Маппинг getSize

| Библиотека | API | В адаптере |
|------------|-----|------------|
| RN `Image` | `Image.getSize(uri, success, error)` | оборачиваем в Promise |
| `expo-image` | `Image.getSize(uri)` → Promise | используем как есть |
| `FastImage` | **нет** API | фолбэк на `RN Image.getSize` (URL тот же) |

---

## API использования (для пользователя)

```tsx
// expo-image
import { expoImageAdapter } from 'react-native-divkit/adapters/expo-image';
<DivKit data={json} imageAdapter={expoImageAdapter} />

// FastImage
import { fastImageAdapter } from 'react-native-divkit/adapters/fast-image';
<DivKit data={json} imageAdapter={fastImageAdapter} />

// без указания — RN Image (как сейчас)
<DivKit data={json} />
```

Кастомный адаптер (например, с предобработкой URL через CDN):

```tsx
const cdnAdapter: DivImageAdapter = {
  render: ({ uri, scale, style, onLoadEnd, onError }) => (
    <ExpoImage
      source={{ uri: `https://cdn.example/?u=${encodeURIComponent(uri)}&w=400` }}
      style={style}
      contentFit={mapScaleToContentFit(scale)}
      onLoad={onLoadEnd}
      onError={onError}
    />
  ),
  getSize: (uri) => ExpoImage.getSize(uri),
};
```

---

## Этапы работ

### Этап 1 — Контракт и интеграция (ядро)

- [ ] Создать `src/types/imageAdapter.ts` с интерфейсом `DivImageAdapter` и хелперами маппинга.
- [ ] Создать `src/adapters/rn-image.ts` — дефолтный адаптер на `react-native` Image (перенести логику из текущего `DivImage`).
- [ ] Добавить `imageAdapter` в `DivKitContextValue` ([src/context/DivKitContext.ts](../src/context/DivKitContext.ts)).
- [ ] Добавить проп `imageAdapter?: DivImageAdapter` в `DivKitProps` ([src/DivKit.tsx](../src/DivKit.tsx)) и положить в провайдер с фолбэком на `rnImageAdapter`.
- [ ] Переписать [src/components/image/DivImage.tsx](../src/components/image/DivImage.tsx):
  - убрать прямой импорт `Image`;
  - достать `adapter` через `useDivKitContext()`;
  - заменить рендер `<Image>` на `adapter.render(...)`;
  - заменить `Image.getSize` на `adapter.getSize(...)`;
  - сохранить логику `wrap_content` + `no_scale` + спиннер + error state без изменений.

**Критерий готовности**: все существующие snapshot- и integration-тесты [tests/](../tests/) проходят без изменений; примеры в [examples/](../examples/) работают как раньше.

### Этап 2 — Пресет expo-image

- [ ] Создать `src/adapters/expo-image.ts`:
  - использовать `Image` и `Image.getSize` из `expo-image`;
  - маппить `scale` на `contentFit`;
  - использовать `onLoad` (а не `onLoadEnd`) и `onError`.
- [ ] Добавить `expo-image` в `peerDependenciesMeta` (optional) в `package.json`.
- [ ] Описать в `docs/API.md` (раздел "Image adapter").
- [ ] Добавить пример использования в [examples/VendorExample/](../examples/VendorExample/) — отдельный экран с `expoImageAdapter`.

**Критерий готовности**: ручная проверка на `prizesSmartphones.json` в примере — картинки грузятся через expo-image, кэш работает.

### Этап 3 — Пресет react-native-fast-image

- [ ] Создать `src/adapters/fast-image.ts`:
  - `FastImage` + `FastImage.resizeMode.*`;
  - `getSize` — фолбэк на `Image.getSize` из RN, обёрнутый в Promise.
- [ ] Перенести `react-native-fast-image` из `optionalDependencies` в `peerDependenciesMeta`.
- [ ] Документация + пример.

**Критерий готовности**: то же — `prizesSmartphones.json` через FastImage без визуальных регрессий.

### Этап 4 — Тесты адаптера

- [ ] Unit-тест: `DivImage` с моком адаптера получает правильные `uri/scale/style/onLoadEnd/onError`.
- [ ] Unit-тест: при отсутствии `imageAdapter` в пропах используется `rnImageAdapter`.
- [ ] Snapshot-тест: рендер `DivImage` с разными `scale` через rn-image-адаптер не меняется относительно текущего.
- [ ] Integration-тест: `wrap_content` + `no_scale` с моком `getSize` корректно ставит `aspectRatio` / размер.

### Этап 5 — Документация

- [ ] [docs/API.md](API.md) — раздел `imageAdapter` с описанием контракта и примерами трёх пресетов.
- [ ] [docs/ARCHITECTURE.md](ARCHITECTURE.md) — добавить блок про image-адаптеры в карту контекстов.
- [ ] [docs/MIGRATION.md](MIGRATION.md) — раздел "v1.10 → v1.11" (если будет minor-bump): инструкция, как перейти на expo-image / FastImage.
- [ ] [CLAUDE.md](../CLAUDE.md) — упомянуть `imageAdapter` в маппинге DivImage и в "Зависимости".
- [ ] [README.md](../README.md) — короткая секция "Custom image loaders" с примером на 5 строк.

---

## Совместимость

- **Backwards-compatible**: проп опциональный, без него поведение идентично текущему. Минорный bump (`1.10.0 → 1.11.0`).
- **API стабильность**: контракт `DivImageAdapter` намеренно узкий. Расширения (`preview`, `tintColor`, `blurhash`) — позже, опциональными полями. Уже сейчас заложим возможность через `// eslint-disable-next-line` для unknown-props в адаптерах.

## Что **не** входит в этот план

- `preview` / `placeholder` поля DivKit JSON — отложены post-MVP (см. [DivImage.tsx:32-38](../src/components/image/DivImage.tsx#L32-L38)).
- `tintColor` / image filters / GIF animation — отложены post-MVP.
- `image` / `nine_patch_image` как background в `Outer` — отдельная задача.
- SSR-режим адаптера (Web-порт). У нас RN-only, не актуально.

## Открытые вопросы

1. Нужен ли API для предзагрузки картинок (`adapter.prefetch?`)? У expo-image и FastImage есть, у RN Image тоже (`Image.prefetch`). Полезно для пейджеров (как `prizesSmartphones.json` — 30+ картинок). **Предложение**: добавить опциональный `prefetch(uris: string[]): Promise<void>` в контракт; `DivPager` сможет вызывать его для соседних страниц.
2. Нужно ли давать адаптеру доступ к `componentContext` (например, для логирования)? **Предложение**: пока — нет, держим контракт узким. Логирование ошибок остаётся на стороне `DivImage` через `componentContext.logError`.
3. Версионировать ли контракт (`adapter.version`)? **Предложение**: пока нет — semver самой либы достаточно.

---

## Оценка

| Этап | Объём |
|------|-------|
| 1. Контракт + интеграция | ~2-3 часа |
| 2. expo-image пресет | ~1 час |
| 3. FastImage пресет | ~1 час |
| 4. Тесты | ~2 часа |
| 5. Документация | ~1 час |
| **Итого** | **~7-8 часов** |

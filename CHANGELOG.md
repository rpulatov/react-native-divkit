## [1.5.2](https://github.com/rpulatov/react-native-divkit/compare/v1.5.1...v1.5.2) (2026-03-13)


### Bug Fixes

* Улучшить обработку выравнивания и стилей в компоненте Outer ([fdb7127](https://github.com/rpulatov/react-native-divkit/commit/fdb7127dda7494c0746abf363816cceba9a6bbfc))

## [1.5.1](https://github.com/rpulatov/react-native-divkit/compare/v1.5.0...v1.5.1) (2026-03-13)


### Bug Fixes

* Исправить проблемы с выравниванием элементов в DivContainer и Outer компонентах ([7afe2a6](https://github.com/rpulatov/react-native-divkit/commit/7afe2a6b310be6e1140f06bd20a3c352039d1368))

# [1.5.0](https://github.com/rpulatov/react-native-divkit/compare/v1.4.0...v1.5.0) (2026-03-13)


### Features

* Добавить обработку div-action schema ([d632f6d](https://github.com/rpulatov/react-native-divkit/commit/d632f6d44697a050ad3ebd275d8c4ba4c863b8b7))
* Добавить поддержку min/max размеров для компонентов с типами MatchParentSize и WrapContentSize ([d35e110](https://github.com/rpulatov/react-native-divkit/commit/d35e1109903ab39a1ac4b73bf6f9d0819a325e52))

# [1.4.0](https://github.com/rpulatov/react-native-divkit/compare/v1.3.0...v1.4.0) (2026-03-13)


### Features

* Добавить overflow hidden для corner_radius блоков по умолчанию ([0343152](https://github.com/rpulatov/react-native-divkit/commit/0343152443817fed16c1c9697fc816a6a2e316b4))

# [1.3.0](https://github.com/rpulatov/react-native-divkit/compare/v1.2.1...v1.3.0) (2026-03-13)


### Features

* Добавить поддержку action_animation ([e86d722](https://github.com/rpulatov/react-native-divkit/commit/e86d722dd75e3fce9fce49049880010826dd1f6d))
* Добавить поддержку text_alignment_vertical ([27b0904](https://github.com/rpulatov/react-native-divkit/commit/27b0904adf9de628ace7204a9997dcdcd8588469))

## [1.2.1](https://github.com/rpulatov/react-native-divkit/compare/v1.2.0...v1.2.1) (2026-03-12)


### Bug Fixes

* Исправить центровку элементов через alignmentHorizontal и alignmentVertical ([6f89d35](https://github.com/rpulatov/react-native-divkit/commit/6f89d3575030a9542cd02a7cfb71cff78d3865e7))

# [1.2.0](https://github.com/rpulatov/react-native-divkit/compare/v1.1.0...v1.2.0) (2026-03-11)


### Features

* добавить поддержку действия set_state с указанием вложенности состояния ([6e06345](https://github.com/rpulatov/react-native-divkit/commit/6e06345ce6363930087d2b257c642900bcd34eb2))

# [1.1.0](https://github.com/rpulatov/react-native-divkit/compare/v1.0.0...v1.1.0) (2026-03-11)


### Bug Fixes

* Исправлены тесты приложения примера и добавлены в CI ([fe0ae6f](https://github.com/rpulatov/react-native-divkit/commit/fe0ae6fa1f90861cda2935a873553c457c317a91))


### Features

* добавить поддержку пользовательского провайдера шрифтов в DivKit ([bfb4afc](https://github.com/rpulatov/react-native-divkit/commit/bfb4afcb2717a03ae025f585fdd5941283a9c4f4))

# 1.0.0 (2026-02-09)


### Bug Fixes

* Добавить свойство flexShrink для предотвращения переполнения текста в компоненте Outer ([cde1e65](https://github.com/rpulatov/react-native-divkit/commit/cde1e65d80cb5895e3c8d538db6eae1d7707d19a))
* Добавить форматтер ([5104927](https://github.com/rpulatov/react-native-divkit/commit/51049272df2a014a3ae8f1376f0bea12a226b9b8))
* Использовать alignSelf: 'stretch' вместо width: '100%' для корректного расчета отступов ([fe03d55](https://github.com/rpulatov/react-native-divkit/commit/fe03d5570ed86ffaf9eba7442ff8d4f2ca05b7f0))
* Обновить URL репозитория в package.json для корректного формата ([bb3ccad](https://github.com/rpulatov/react-native-divkit/commit/bb3ccaddabf74974a57561c0d570ee8e98d269de))
* обновить типы и исправить ошибки в коде ([1d5ea77](https://github.com/rpulatov/react-native-divkit/commit/1d5ea773904a560e542fa87be89354e948f88dc8))
* Удалить ненужные свойства ширины и уменьшить верхние отступы в storiesJson ([b09cf05](https://github.com/rpulatov/react-native-divkit/commit/b09cf05a905080936594e39547229db348b02046))
* Удалить обработчик события загрузки изображения так как на ios handleLoadEnd срабатывает раньше чем handleLoadStart ([409152b](https://github.com/rpulatov/react-native-divkit/commit/409152b8c465db8b339d5c1446018584daa09941))


### Features

* Добавить компонент Background для поддержки радиальных градиентов и обновить зависимости ([f01d2ef](https://github.com/rpulatov/react-native-divkit/commit/f01d2effeb27a85e6ba3d91a65ff29951617b997))
* Добавить контекст LayoutParams для управления параметрами компоновки в компонентах ([45eb6f7](https://github.com/rpulatov/react-native-divkit/commit/45eb6f763c3f35a378a806b8274dd7c47a71ae87))
* Добавить контроллер глобальных переменных и интегрировать его в компоненты DivKit ([bdc5672](https://github.com/rpulatov/react-native-divkit/commit/bdc5672afde0f9c36c497eafad86b368ac02c542))
* Добавить поддержку выражений в строках для установки переменных ([9ce7296](https://github.com/rpulatov/react-native-divkit/commit/9ce72964f25fdcdea33e4c3f6a92d61c5f448d17))
* Добавить поддержку единиц измерения шрифта и корректировку размеров в компоненте DivText ([cdc9fe0](https://github.com/rpulatov/react-native-divkit/commit/cdc9fe0e5371d4033cc7500023c2514f6b05d9ef))
* Добавить тестовый проект ([9e05704](https://github.com/rpulatov/react-native-divkit/commit/9e057042a80b3135f15f24b7b734927154f52967))

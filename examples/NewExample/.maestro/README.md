# Maestro visual e2e

These flows run Android-only visual checks against the real React Native example app.

## First run

Install Maestro and start an Android emulator, then run from `examples/NewExample`:

```sh
npm run e2e:android:build
npm run e2e:android:install
npm run e2e:maestro:android:record
```

Commit the generated files under `.maestro/goldens/android/*.png`.

## Regression run

```sh
npm run e2e:android:install
npm run e2e:maestro:android
```

The snapshot flows compare only the `divkit-snapshot-area` element, avoiding device status bars and the event log panel.


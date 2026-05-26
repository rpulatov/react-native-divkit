#!/usr/bin/env bash
set -euo pipefail

export PATH="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}/platform-tools:$PATH"
export MAESTRO_CLI_NO_ANALYTICS=1

cd examples/NewExample

npm start -- --port 8081 > metro.log 2>&1 &

metro_ready=0
for _ in $(seq 1 60); do
    if curl -fsS http://localhost:8081/status 2>/dev/null | grep -q "packager-status:running"; then
        metro_ready=1
        break
    fi
    sleep 2
done

if [ "$metro_ready" != "1" ]; then
    echo "Metro did not become ready in time"
    cat metro.log
    exit 1
fi

echo "Warming up Metro bundle..."
bundle_url="http://localhost:8081/index.bundle?platform=android&dev=true&minify=false"
bundle_ready=0
for _ in $(seq 1 60); do
    code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 120 "$bundle_url" 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
        bundle_ready=1
        break
    fi
    sleep 2
done

if [ "$bundle_ready" != "1" ]; then
    echo "Metro bundle did not build in time"
    tail -n 200 metro.log
    exit 1
fi

npm run e2e:android:install

adb wait-for-device
adb devices
adb shell getprop ro.build.version.sdk
adb reverse tcp:8081 tcp:8081
adb shell pm path com.newexample
adb shell pm list packages --user 0 com.newexample
adb shell cmd package resolve-activity --brief com.newexample || true
adb shell am start -W -n com.newexample/.MainActivity
adb shell monkey -p com.newexample -c android.intent.category.LAUNCHER 1

case "${MAESTRO_ANDROID_MODE:-verify}" in
    record)
        npm run e2e:maestro:android:record
        ;;
    verify)
        npm run e2e:maestro:android
        ;;
    *)
        echo "Unsupported MAESTRO_ANDROID_MODE: ${MAESTRO_ANDROID_MODE}"
        exit 1
        ;;
esac

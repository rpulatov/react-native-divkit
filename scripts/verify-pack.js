#!/usr/bin/env node
/**
 * Verifies the publishable npm tarball:
 *   1. Runs `npm run build` (peggy → tsc → copy-types).
 *   2. Runs `npm pack` and unpacks the tarball into a temp consumer project.
 *   3. Installs the tarball + typescript + minimal peer deps.
 *   4. Compiles a consumer file that imports the public API with
 *      `tsc --noEmit` to prove all declaration paths resolve.
 *
 * Fails the build if any declaration import (e.g. `../typings/common`,
 * `./types/base`) is missing from the tarball — preventing regressions of
 * the packaging gap reported in the "no resolvable TypeScript types" issue.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
const lockPath = path.join(REPO_ROOT, 'package-lock.json');
const lock = fs.existsSync(lockPath)
    ? JSON.parse(fs.readFileSync(lockPath, 'utf8'))
    : null;

function run(cmd, opts = {}) {
    console.log(`$ ${cmd}`);
    execSync(cmd, { stdio: 'inherit', ...opts, env: { ...process.env, ...opts.env } });
}

function lockedVersion(name) {
    const locked = lock?.packages?.[`node_modules/${name}`]?.version;
    if (locked) return locked;

    const declared =
        pkg.devDependencies?.[name] ??
        pkg.dependencies?.[name] ??
        pkg.peerDependencies?.[name];

    if (!declared) {
        throw new Error(`Cannot determine version for ${name}`);
    }

    return declared.replace(/^[~^]/, '');
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rndk-verify-pack-'));
const packDir = path.join(tmpRoot, 'pack');
const tmpDir = path.join(tmpRoot, 'consumer');
const npmCacheDir = path.join(tmpRoot, 'npm-cache');
fs.mkdirSync(packDir);
fs.mkdirSync(tmpDir);
fs.mkdirSync(npmCacheDir);
const env = { npm_config_cache: npmCacheDir };

try {
    console.log('[verify-pack] building package…');
    run('npm run build', { cwd: REPO_ROOT, env });

    console.log('[verify-pack] packing tarball…');
    run(`npm pack --silent --pack-destination "${packDir}"`, { cwd: REPO_ROOT, env });
    const tarballs = fs.readdirSync(packDir).filter(f => f.endsWith('.tgz'));
    if (tarballs.length !== 1) {
        throw new Error(`Expected exactly one tarball, found ${tarballs.length}`);
    }
    const tarballPath = path.join(packDir, tarballs[0]);
    console.log(`[verify-pack] tarball: ${tarballPath}`);

    console.log(`[verify-pack] consumer dir: ${tmpDir}`);

    const consumerPkg = {
        name: 'rndk-pack-consumer',
        version: '0.0.0',
        private: true,
        dependencies: {
            [pkg.name]: `file:${tarballPath}`,
            // Peer deps the published .d.ts files reference (react, react-native).
            // Without them tsc would report TS2307 from inside the dist tree
            // and we wouldn't be able to tell packaging bugs from missing peers.
            react: lockedVersion('react'),
            'react-native': lockedVersion('react-native'),
            '@types/react': lockedVersion('@types/react'),
            typescript: lockedVersion('typescript')
        }
    };
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(consumerPkg, null, 2));

    fs.writeFileSync(
    path.join(tmpDir, 'tsconfig.json'),
    JSON.stringify(
        {
            compilerOptions: {
                target: 'ES2020',
                module: 'ESNext',
                // Explicitly drop lib.dom — react-native ships its own globals
                // (XMLHttpRequest, WebSocket, FileReader, URL …) and lib.dom
                // conflicts with them. Matches the host library's own tsconfig.
                lib: ['ES2020'],
                // Suppress auto-inclusion of every @types/* package — react-native's
                // transitive @types/node collides with react-native/src/types/globals.d.ts
                // (FormData, AbortController, URL, fetch …). The consumer file under
                // test only needs library + react + react-native types, so an empty
                // list is correct here.
                types: [],
                jsx: 'react-native',
                moduleResolution: 'bundler',
                strict: true,
                // skipLibCheck is intentionally false: with skipLibCheck=true a missing
                // re-export path inside a library .d.ts is silently downgraded (the
                // exact gap this script guards against), so we want full library checking.
                // Peer libs are installed in the consumer, so their declarations resolve.
                skipLibCheck: false,
                noEmit: true,
                esModuleInterop: true,
                allowSyntheticDefaultImports: true
            },
            include: ['consumer.tsx']
        },
        null,
        2
    )
);

    fs.writeFileSync(
    path.join(tmpDir, 'consumer.tsx'),
    `// Touches every public re-export so any missing declaration path becomes a TS2307.
// Critically: also USES the imported types structurally — with skipLibCheck a missing
// path doesn't error at the library boundary, but the re-exported symbol degrades to
// \`any\`/\`unknown\` on the call site. The IsExact assertions below catch that case.
type IsAny<T> = 0 extends 1 & T ? true : false;
type IsUnknown<T> = unknown extends T ? (T extends unknown ? true : false) : false;
type IsResolvedType<T> = IsAny<T> extends true
    ? never
    : IsUnknown<T> extends true
        ? never
        : true;

import {
    DivKit,
    createVariable,
    Variable,
    StringVariable,
    IntegerVariable,
    NumberVariable,
    BooleanVariable,
    ColorVariable,
    UrlVariable,
    DictVariable,
    ArrayVariable,
    createGlobalVariablesController,
    GlobalVariablesController,
    useDivKitContext,
    DivKitContext,
    useDerivedFromVars,
    useDerivedFromVarsSimple,
    useVariable,
    useVariableInstance,
    useVariableSetter,
    useVariableState,
    useAction,
    useActions,
    useActionHandler,
    useHasActions,
    wrapError,
    correctColor,
    type DivKitProps,
    type StatCallback,
    type CustomActionCallback,
    type ErrorCallback,
    type Action,
    type DivJson,
    type DivBase,
    type DivVariable,
    type Direction,
    type TemplateContext,
    type BooleanInt,
    type DivBaseData,
    type ComponentContext,
    type VariableType,
    type VariableValue,
    type DivKitContextValue,
    type TypefaceProvider,
    type WrappedError
} from '${pkg.name}';

// Silence \"declared but unused\" — we only care about resolution.
export const _touch = [
    DivKit,
    createVariable,
    Variable,
    StringVariable,
    IntegerVariable,
    NumberVariable,
    BooleanVariable,
    ColorVariable,
    UrlVariable,
    DictVariable,
    ArrayVariable,
    createGlobalVariablesController,
    GlobalVariablesController,
    useDivKitContext,
    DivKitContext,
    useDerivedFromVars,
    useDerivedFromVarsSimple,
    useVariable,
    useVariableInstance,
    useVariableSetter,
    useVariableState,
    useAction,
    useActions,
    useActionHandler,
    useHasActions,
    wrapError,
    correctColor
];

export type _Types = [
    DivKitProps,
    StatCallback,
    CustomActionCallback,
    ErrorCallback,
    Action,
    DivJson,
    DivBase,
    DivVariable,
    Direction,
    TemplateContext,
    BooleanInt,
    DivBaseData,
    ComponentContext,
    VariableType,
    VariableValue,
    DivKitContextValue,
    TypefaceProvider,
    WrappedError
];

// If a re-export collapsed to any/unknown (the exact failure mode the issue describes),
// the corresponding line becomes \`never\` and the const assignment fails to compile.
export const _resolved: [
    IsResolvedType<DivJson>,
    IsResolvedType<Action>,
    IsResolvedType<DivBase>,
    IsResolvedType<DivVariable>,
    IsResolvedType<Direction>,
    IsResolvedType<TemplateContext>,
    IsResolvedType<BooleanInt>,
    IsResolvedType<DivBaseData>,
    IsResolvedType<ComponentContext>,
    IsResolvedType<DivKitProps>
] = [true, true, true, true, true, true, true, true, true, true];

// Structural use of DivJson — confirms its fields survived the re-export.
// Picks fields known to exist on the web-reference DivJson contract.
const _structural: DivJson = {
    card: {
        log_id: 'verify-pack',
        states: [{ state_id: 0, div: { type: 'container' } as DivBase }]
    }
};
export const _structuralLogId: string = _structural.card.log_id;
`
);

    console.log('[verify-pack] installing tarball into consumer…');
    run('npm install --no-audit --no-fund --silent --legacy-peer-deps', { cwd: tmpDir, env });

    console.log('[verify-pack] running tsc --noEmit against consumer.tsx…');
    // Use the consumer's own typescript install if present; fall back to repo's.
    const tscBin = path.join(tmpDir, 'node_modules', '.bin', 'tsc');
    const tsc = fs.existsSync(tscBin)
        ? tscBin
        : path.join(REPO_ROOT, 'node_modules', '.bin', 'tsc');
    if (!fs.existsSync(tsc)) {
        console.error('[verify-pack] no tsc binary found (neither in consumer nor repo)');
        process.exit(1);
    }
    run(`"${tsc}" -p tsconfig.json`, { cwd: tmpDir, env });

    console.log('[verify-pack] OK — packed tarball exposes resolvable declarations.');
} finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
}

#!/usr/bin/env node
/**
 * Mirrors every src/**\/*.d.ts into dist/, preserving the relative path.
 *
 * tsc does not copy non-emitted .d.ts files from rootDir to outDir
 * (https://github.com/microsoft/TypeScript/issues/30024). Without this step the
 * published tarball ships dangling declaration imports — e.g.
 * `dist/index.d.ts` → `./types/base` (gone), `dist/expressions/eval.d.ts` →
 * `./ast` (gone) — making the package unusable from any TypeScript consumer.
 *
 * env.d.ts is intentionally excluded from dist: it contains ambient
 * `declare namespace`/`declare var` for internal `process.env` usage and is not
 * referenced by the public declaration graph.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const DST = path.join(__dirname, '..', 'dist');
const EXCLUDE_BASENAMES = new Set(['env.d.ts']);

function walk(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...walk(full));
        } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
            out.push(full);
        }
    }
    return out;
}

let copied = 0;
for (const absSrc of walk(SRC)) {
    const base = path.basename(absSrc);
    if (EXCLUDE_BASENAMES.has(base)) continue;
    const rel = path.relative(SRC, absSrc);
    const absDst = path.join(DST, rel);
    fs.mkdirSync(path.dirname(absDst), { recursive: true });
    fs.copyFileSync(absSrc, absDst);
    copied++;
}

console.log(`[copy-types] mirrored ${copied} declaration file(s) from src → dist`);

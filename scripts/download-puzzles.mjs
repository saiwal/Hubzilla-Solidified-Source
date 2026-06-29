#!/usr/bin/env node
// Downloads Simon Tatham puzzle .js + .wasm files to public/puzzles/
// Run once: node scripts/download-puzzles.mjs
// Files are gitignored — re-run after updates.

import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT   = resolve(__dir, "../public/puzzles");
const BASE  = "https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/";

const GAMES = [
  "blackbox", "bridges",  "cube",     "dominosa", "fifteen",
  "filling",  "flip",     "flood",    "galaxies", "group",
  "guess",    "inertia",  "keen",     "lightup",  "loopy",
  "magnets",  "map",      "mines",    "mosaic",   "net",
  "netslide", "palisade", "pattern",  "pearl",    "pegs",
  "range",    "rect",     "samegame", "signpost", "singles",
  "sixteen",  "slant",    "solo",     "tents",    "towers",
  "tracks",   "twiddle",  "undead",   "unequal",  "unruly",
  "untangle",
];

await mkdir(OUT, { recursive: true });
console.log(`Downloading ${GAMES.length} games to ${OUT}…\n`);

let ok = 0, fail = 0;
for (const game of GAMES) {
  for (const ext of ["js", "wasm"]) {
    const url = `${BASE}${game}.${ext}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      await writeFile(`${OUT}/${game}.${ext}`, Buffer.from(buf));
      process.stdout.write(`  ✓ ${game}.${ext} (${Math.round(buf.byteLength / 1024)}KB)\n`);
      ok++;
    } catch (e) {
      process.stderr.write(`  ✗ ${game}.${ext}: ${e.message}\n`);
      fail++;
    }
  }
}

const LICENSE = `Simon Tatham's Portable Puzzle Collection
https://www.chiark.greenend.org.uk/~sgtatham/puzzles/

Copyright 2004-2024 Simon Tatham.
Portions copyright Richard Boulton, James Harvey, Mike Pinna, Jonas Kölker,
Dariusz Olszewski, Michael Schierl, Lambros Lambrou, Bernd Schmidt,
Steffen Bauer, Lennard Sprong, Rogier Goossens, Michael Quevillon,
Asher Gordon, Didi Kohen, and Ben Harris.

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
`;
await writeFile(`${OUT}/LICENSE`, LICENSE);
console.log("  ✓ LICENSE written\n");

console.log(`Done: ${ok} files downloaded, ${fail} failed.`);
if (fail > 0) process.exit(1);

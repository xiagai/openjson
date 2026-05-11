# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A zero-dependency, single-file browser tool (`index.html`) for formatting, validating, and diffing JSON. No build system, no package manager, no framework — open the file directly in a browser to develop.

The only external dependency is [pako](https://github.com/nodeca/pako) (loaded from CDN via `<script src="https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js">`), used for gzip compress/decompress in the Share feature.

## Architecture

Everything lives in `index.html` as three top-level sections:

1. **CSS** (`<style>`) — Theme system using CSS custom properties on `[data-theme="..."]` applied to `<html>`. Five themes: `dark`, `light`, `mocha`, `ocean`, `solarized`. Each theme defines both layout variables (`--bg`, `--border`, etc.) and JSON syntax-highlight colors (`--json-key`, `--json-string`, etc.).

2. **HTML** — Three tab-switched page sections (`#section-formatter`, `#section-diff`, `#section-transform`). Tab state is managed purely via `.active` CSS class toggling; no JS router.

3. **JS** (`<script>`, IIFE) — Split into logical blocks:
   - **JSON Tree Renderer** (`renderNode` / `buildTree`) — builds an interactive collapsible DOM tree from a parsed JS value. The last parsed value is stored on `window._lastParsed` so Copy/Download can reconstruct the string without scraping the DOM.
   - **Formatter tab** — `doFormat`, `doMinify`, `doValidate` operate on `#input` textarea and write to `#output` div.
   - **Share** — gzip (pako) + base64url encodes input into `?d=` URL param. On load, `restoreFromUrl()` decodes and formats it.
   - **Diff Engine** (`diffValues`, `diffObjects`, `diffArrays`, `renderDiffNode`) — recursive structural diff producing `{status, key, valA, valB, children}` nodes; `_lastDiffResult` is cached to allow toggling between "All" and "Diff only" views without re-running the diff.
   - **Transform Panel** — three independent blocks (Minify, Unescape, Escape), each with auto-run on input.
   - **Theme System** (`applyTheme`, `initTheme`) — sets `data-theme` on `<html>`, persists to `localStorage` under key `jf-theme`, and reflects as `?theme=` URL param.

## Key Behavioral Details

- **Auto-format on paste**: a document-level `paste` listener intercepts paste events and routes them to the formatter input unless focus is in another editable element.
- **`setInputValue`**: uses `document.execCommand('insertText')` instead of direct `.value =` assignment to preserve the browser undo stack.
- **Debouncing**: formatter auto-runs 300 ms after input; diff auto-runs 400 ms after input in either pane.
- **Indent setting** (`#indent-select`): 2 spaces / 4 spaces / tab — read at call time by `getIndent()`, affects Format, Copy, Download, and the Unescape output.
- **Fold buttons** (Expand All / Collapse All) are hidden until a valid JSON tree is rendered.

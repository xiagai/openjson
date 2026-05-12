# JSON Formatter Online

**[jsonopen.com](https://jsonopen.com/)** — Free online JSON tools that run entirely in your browser. No signup, no data upload.

## Features

- **Format & Beautify** — Pretty-print JSON with syntax highlighting and collapsible tree view
- **Validate** — Instant error detection with line/column info
- **Minify** — Compact JSON for production use
- **Diff** — Compare two JSON objects side-by-side, highlight added/removed/changed fields
- **Unescape / Escape** — Convert escaped JSON strings in one click
- **Share** — Generate a shareable URL with your JSON encoded inline (no server storage)
- **5 Themes** — Dark, Light, Mocha, Ocean, Solarized
- **Keyboard friendly** — Works offline, zero dependencies except pako for URL compression

## Usage

Open **[jsonopen.com](https://jsonopen.com/)** in any browser. No installation required.

## Tech

Single-file HTML app (`index.html`). No build system, no framework, no backend.

The only external dependency is [pako](https://github.com/nodeca/pako) (CDN) for gzip compression in the Share feature.

## License

MIT

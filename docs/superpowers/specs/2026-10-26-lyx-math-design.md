# LyX Math for Obsidian — Design

Date: 2026-10-26
Status: approved by user 2026-10-27

## Intent

The user writes math in LyX and likes how it feels: press a key, get a math box, type
`\frac` + Space and get two boxes, type `\Delta` + Space and see Δ, never type `{}` by hand.
They want math in Obsidian to feel the same. Raw LaTeX typing with manual braces is the
pain this removes.

Success: in the Lab Vault, the user can take lecture/lab notes with math using LyX habits,
without thinking about LaTeX syntax, and the notes stay plain Markdown + LaTeX.

## Goals

1. **Ctrl+M** opens an inline math editor at the cursor (produces `$...$`).
2. **Ctrl+Shift+M** opens a display math editor on its own line (produces `$$...$$`).
3. The editor is **WYSIWYG like LyX** — the formula is rendered while typing, not shown as raw LaTeX.
   (User chose this explicitly over a raw-text-with-autobraces approach.)
4. **LyX command entry**: typing `\` + letters, then **Space**, finishes the command exactly as typed
   (no need to pick from the suggestion list). A non-letter key (digit, `^`, `_`, `+`, `\`, …)
   also finishes the command and is then typed. Commands with arguments (`\frac`, `\sqrt`,
   `\hat`, …) create empty boxes and put the cursor in the first one.
5. Tab / arrow keys move between boxes; arrow past the end or **Esc** leaves the math and puts the
   text cursor right after the formula.
6. **Clicking an existing formula** in the note (inline or display, including ones written
   before the plugin existed) reopens it in the same editor.
7. **Formula panel** (user request, like math-chords' formula panel but inserting LyX-style): a
   right-sidebar view with clickable, rendered symbol buttons grouped like LyX's math toolbar —
   Fractions & roots, Accents, Greek, Operators, Relations, Arrows, Big operators, Delimiters,
   Functions, Misc — plus a search box (matches command name and group, `\` optional) and collapsible
   groups. Clicking a button inserts into the open math editor with the cursor in the first empty
   box (`mathfield.insert(latex, {selectionMode: 'placeholder'})`, `#?` = empty box); if no editor is
   open, it opens a new inline one at the note cursor and inserts there. Button mousedown must not
   steal focus from the editor. Opened via a ribbon icon and a command ("Open LyX formula panel").
   The demo's button list (`GROUPS` in demo.html) is the starting set; validated with the user.
8. **Saved LaTeX looks like LyX's**: braces always present — `\frac{4}{3}`, `\sqrt{2}`, `x^{2}`,
   `a_{1}` — never MathLive's shortened `\frac43` / `\sqrt2` / `x^2`.

## Non-goals

- Not a LyX file importer/exporter.
- No virtual on-screen math keyboard, no MathLive menu.
- No mobile support required (desktop Obsidian on Windows is the target).
- Not publishing to the Obsidian community store (may be done later; not required).
- **No multi-line math in v1** (user decision): no `align`/`eqnarray`/`cases`/matrix editing, no
  Ctrl+Enter new row. Display math is a single formula. Existing multi-line `$$` blocks open in the
  raw-text fallback (see below). New display math is saved as `$$` on its own line, formula on one
  line, `$$` on its own line.

## Anti-goals (would be a failure even if it "works")

- Notes stop being plain portable Markdown/LaTeX (no custom syntax, no hidden data).
- Saved LaTeX that is uglier or different from what was typed (e.g. the `\frac43` bug).
- Having to reach for the mouse or suggestion list to finish a command.
- Breaking the user's existing plugins, especially **math-chords** (enabled, leader key Alt+M,
  has its own inline preview/formula panel), Templater, Dataview, Tasks.

## Decided how (user)

- WYSIWYG editing, LyX-style (option A).
- Ctrl+M / Ctrl+Shift+M as above; Space finishes commands; click-to-edit existing math.
- Install into **Lab Vault**: `<your vault>/.obsidian/plugins/`.

## Decided how (Claude's calls — user may override)

- **Editor engine: MathLive** (`mathlive` npm package), bundled into the plugin (no CDN at runtime,
  so it works offline). A throwaway browser demo using MathLive 0.101.0 validated the feel with
  the user.
- **Storage:** standard `$...$` and `$$...$$` in the .md file; Obsidian's own MathJax renders
  them when not editing.
- **Space-to-finish** implemented by intercepting keydown while `mathfield.mode === 'latex'` and
  calling `executeCommand(['complete','accept'])` (accepts the typed text, not the suggestion).
  Non-letter printable keys: same command, then let the key through. Validated in the demo.
- **Only LyX behaviour, nothing extra** (user decision): turn off every MathLive automatism LyX
  doesn't have — inline shortcuts (`alpha`→α, `pi`→π, `->`, `<=`, `sin`, …), `/` → fraction,
  smart fences / auto-paired brackets, smart superscript auto-exit, smart mode, the menu and the
  virtual keyboard. Only `\` commands, `^`, `_` and normal keys do anything special.
- **Braces always** (my call): every argument and every script is braced in saved LaTeX, including
  single letters — `\frac{a}{b}`, `x^{a}`, `\hat{x}`, `\sqrt{2}`. The demo used regexes for the
  digit cases only:
  - `\\(frac|dfrac|tfrac|binom|dbinom|tbinom)(\d)(\d)` → `\$1{$2}{$3}`
  - `\\sqrt(\d)` → `\sqrt{$1}`
  - `([\^_])(\d)` → `$1{$2}`
  The real plugin must cover letters and all argument-taking commands; the builder decides between
  wider normalization and serializing from MathLive's atom tree.
- **Editing existing formulas** (my call): opened and closed without a change → original text kept
  byte-for-byte. Once edited, the whole formula is re-saved in normalized LyX style (as LyX itself does).
- **Raw-text fallback** (my call): a formula MathLive can't round-trip (unknown macro, `\label`,
  `\tag`, environments, multi-line `$$`) is not opened in the visual editor; the cursor is placed in
  its LaTeX source as normal Obsidian does, with a short notice.
- **Raw LaTeX always reachable** (my call): Source mode keeps Obsidian's normal plain-text behaviour
  for clicks; the visual editor opens there only via Ctrl+M / Ctrl+Shift+M. Clicking rendered
  math in Live Preview opens the visual editor.
- **Source code location:** `the repo folder` (git repo), built `main.js`,
  `manifest.json`, `styles.css` copied into the vault plugin folder `lyx-math`.
- **Toolchain:** Node.js is not installed on the machine; install Node LTS (e.g. via `winget`)
  to build. Standard Obsidian sample-plugin setup (TypeScript + esbuild).
- Hotkeys registered as Obsidian commands with default hotkeys Ctrl+M / Ctrl+Shift+M, so the
  user can rebind them in Obsidian settings. (Lab Vault `hotkeys.json` is currently empty —
  no existing binding conflict.)

## Behavior details

- Works in **Live Preview** (click or hotkey) and **Source mode** (hotkey only). Reading view: no editing.
- Inline editor appears in place of the formula/cursor within the line; display editor appears as a
  centered block. While open, the editor owns the keyboard; the CodeMirror document is only
  changed when the editor closes (commit) — one undo step per formula edit.
- Ctrl+M with text selected: wrap the selection as the initial content of the math (my call; like LyX).
- Ctrl+M while the cursor is already inside `$...$` source: open the editor on that formula.
- Closing with an empty formula removes it entirely (no `$$` left behind).
- Leaving the math: Esc, arrow right past the end (cursor after), arrow left past the start
  (cursor before), clicking elsewhere (commit).
- LaTeX that MathLive can't parse must never be destroyed — see raw-text fallback above.
- Verify that `alpha`, `pi`, `/`, `(` typed in the editor stay literal (no auto-conversion, no auto-pairing).

## Lessons from the demo (pitfalls to avoid)

- `mathfield.inlineShortcuts` throws "Mathfield not mounted" if set before the element is in the
  DOM — set it after insertion / on the `mount` event. (Broke Ctrl+M in the demo.)
- MathLive markup rendered outside a math-field (`convertLatexToMarkup`, used for panel buttons)
  needs `mathlive-static.css` + `mathlive-fonts.css` loaded, bundled locally, or fractions etc.
  render as flat text. In the note itself, closed formulas are rendered by Obsidian's MathJax.
- MathLive's default Space does not finish a `\command`; see the Space-to-finish call above.

## Left to the builder

- Exact CodeMirror 6 integration (widget decoration vs. floating overlay positioned over the text).
- Styling to match the Obsidian theme (light and dark).
- How to coexist with math-chords' inline preview (e.g. hide its preview while our editor is open);
  test with math-chords enabled.
- Settings tab (optional): toggle brace restoration, toggle Space-to-finish.

## Verification

- Manual checklist in Lab Vault: Ctrl+M / Ctrl+Shift+M, `\frac`+Space, `\Delta`+Space, `\cdot`+Space,
  `\alpha^2`, Esc and arrow exit, click to re-edit old formula, undo, saved text has braces.
- Unit tests for the pure parts (brace restoration, finding the `$...$` range at a cursor position).

## Addendum 2026-10-27: Equation numbering (approved by user in chat)

- **Ctrl+Shift+M** first shows a small menu at the cursor: **Display math** / **Numbered display math**
  (first highlighted; arrows + Enter or click; Esc cancels). Then the editor opens.
- Numbered equations are saved as `$$\n<body> \tag{n}\n$$`. Every commit through the plugin renumbers all
  numerically tagged display equations in the note 1, 2, 3… in document order (one undo step).
- Command **Renumber equations** does the same on demand (after manual edits).
- Only `\tag{<digits>}` is managed; `\tag{*}`, `\tag{A}` are left alone and not counted.
- Ctrl+Shift+M on an existing display equation shows the menu with its current choice checked
  (lets you add/remove the number). Clicking / Ctrl+M opens it directly, keeping its number.
- The tag is not shown inside the editor; it is split off on open and re-added on commit.
- A numeric `\tag` no longer triggers the raw-text fallback (supersedes that bullet for numeric tags).

## Addendum 2026-10-27: matrices (user request)

The user asked for a matrix option in the formula panel; this narrows the "no multi-line math"
non-goal for matrices only. A "Matrices" panel group inserts pmatrix/bmatrix/vmatrix/Bmatrix/
Vmatrix/matrix (2x2), pmatrix/bmatrix 3x3 and 2- and 3-row column vectors, saved on one line
(`\begin{pmatrix}a & b\ c & d\end{pmatrix}`). Tab moves cell to cell and leaves after the last;
Ctrl+Enter adds a row, Ctrl+Shift+Enter a column (Claude's call; LyX has no default column key),
both only inside a matrix. Saved single-line matrices reopen in the math editor; other
environments still open as raw text. Empty boxes are saved empty, never as `\placeholder{}`.

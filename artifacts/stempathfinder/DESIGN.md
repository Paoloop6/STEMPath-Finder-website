---
name: NextStep Database
description: A deep rail-green concourse lettered in cream, one black departures board in it, and safety orange for every action.
colors:
  hall: "#113a2e"
  hall-deep: "#0c2e24"
  hall-line: "rgba(243, 236, 217, 0.14)"
  hall-line-strong: "rgba(243, 236, 217, 0.28)"
  surface: "#17493a"
  surface-2: "#1c5544"
  ink: "#f3ecd9"
  ink-soft: "#e2dbc6"
  ink-muted: "#b9b6a1"
  ink-faint: "#a3a893"
  orange: "#ff6a13"
  orange-hi: "#ff7d33"
  orange-ink: "#1a0d00"
  board: "#0b0f0d"
  flap: "#171b18"
  flap-hi: "#212623"
  flap-split: "rgba(0, 0, 0, 0.6)"
  flap-text: "#f4efe2"
  flap-dim: "#8f958c"
  flap-amber: "#f0b63c"
  amber-ink: "#1a1400"
  signal-green: "#5fd68f"
  signal-red: "#f0705f"
typography:
  display:
    fontFamily: "Archivo, Arial Black, Helvetica Neue, system-ui, sans-serif"
    fontSize: "clamp(36px, 5.6vw, 72px)"
    fontWeight: 900
    lineHeight: 0.94
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 118"
    fontFeature: "tnum"
  display-cta:
    fontFamily: "Archivo, Arial Black, Helvetica Neue, system-ui, sans-serif"
    fontSize: "clamp(40px, 7.2vw, 92px)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 118"
    fontFeature: "tnum"
  headline:
    fontFamily: "Archivo, Arial Black, Helvetica Neue, system-ui, sans-serif"
    fontSize: "clamp(32px, 5.3vw, 68px)"
    fontWeight: 900
    lineHeight: 0.94
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 118"
    fontFeature: "tnum"
  title:
    fontFamily: "Archivo, Arial Black, Helvetica Neue, system-ui, sans-serif"
    fontSize: "clamp(22px, 2vw, 26px)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 118"
    fontFeature: "tnum"
  board-heading:
    fontFamily: "Archivo, Arial Narrow, Helvetica Neue, system-ui, sans-serif"
    fontSize: "clamp(30px, 2.7vw, 34px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.04em"
    fontVariation: "'wdth' 75"
    fontFeature: "tnum"
  board-title:
    fontFamily: "Archivo, Arial Narrow, Helvetica Neue, system-ui, sans-serif"
    fontSize: "23px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0.015em"
    fontVariation: "'wdth' 75"
    fontFeature: "tnum"
  gate-label:
    fontFamily: "Archivo, Arial Narrow, Helvetica Neue, system-ui, sans-serif"
    fontSize: "clamp(24px, 2.7vw, 34px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.02em"
    fontVariation: "'wdth' 75"
    fontFeature: "tnum"
  flap:
    fontFamily: "Archivo, Arial Narrow, Helvetica Neue, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.02em"
    fontVariation: "'wdth' 75"
    fontFeature: "tnum"
  signage-label:
    fontFamily: "Archivo, Arial Narrow, Helvetica Neue, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.14em"
    fontVariation: "'wdth' 75"
    fontFeature: "tnum"
  body:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  lead:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "clamp(17px, 1.5vw, 19px)"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.08em"
  caption:
    fontFamily: "Archivo, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
    fontFeature: "tnum"
rounded:
  flap: "2px"
  plate: "3px"
  control-plate: "4px"
  plate-inline: "0.06em"
  hero-flap: "4px"
  lamp: "999px"
  button: "0.25rem"
  control: "0.375rem"
  card: "0.375rem"
  board: "6px"
  large: "0.5rem"
spacing:
  "1": "0.5rem"
  "2": "1rem"
  "3": "1.5rem"
  "4": "2rem"
  "5": "3rem"
  "6": "4.5rem"
  "7": "6rem"
components:
  button-slab:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.orange-ink}"
    rounded: "{rounded.button}"
    padding: "0.8rem 1.25rem"
  button-slab-hover:
    backgroundColor: "{colors.orange-hi}"
    textColor: "{colors.orange-ink}"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "calc(0.8rem - 1px) 1.25rem"
  button-line-hover:
    backgroundColor: "rgba(243, 236, 217, 0.06)"
    textColor: "{colors.ink}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.button}"
    padding: "0.35rem 0.75rem"
  chip-hover:
    backgroundColor: "rgba(243, 236, 217, 0.06)"
    textColor: "{colors.ink-soft}"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.hall-deep}"
  board:
    backgroundColor: "{colors.board}"
    textColor: "{colors.flap-text}"
    rounded: "{rounded.board}"
  board-row:
    backgroundColor: "transparent"
    textColor: "{colors.flap-text}"
    padding: "0.95rem 1.4rem"
  board-row-hover:
    backgroundColor: "rgba(244, 239, 226, 0.045)"
    textColor: "#ffffff"
  flap-cell:
    backgroundColor: "{colors.flap}"
    textColor: "{colors.flap-text}"
    rounded: "{rounded.flap}"
    typography: "{typography.flap}"
    width: "0.74em"
    height: "1.28em"
  signage-plate:
    backgroundColor: "{colors.board}"
    textColor: "{colors.flap-amber}"
    rounded: "{rounded.plate}"
    typography: "{typography.signage-label}"
  plate-inline:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.orange-ink}"
    rounded: "{rounded.plate-inline}"
    padding: "0.02em 0.18em 0.06em"
  live-dot:
    backgroundColor: "{colors.signal-green}"
    rounded: "{rounded.lamp}"
    size: "7px"
  band-deep:
    backgroundColor: "{colors.hall-deep}"
    textColor: "{colors.ink}"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    height: "3.5rem"
    padding: "0 0.75rem"
  nav-link-active:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
  input-composer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  gate-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "1.25rem 0.25rem"
  save-plate:
    backgroundColor: "{colors.flap}"
    textColor: "{colors.flap-dim}"
    rounded: "{rounded.control-plate}"
    size: "2rem"
  save-plate-pressed:
    backgroundColor: "{colors.flap-amber}"
    textColor: "{colors.amber-ink}"
  pager-btn:
    backgroundColor: "transparent"
    textColor: "{colors.flap-text}"
    rounded: "{rounded.control-plate}"
    size: "1.75rem"
  pager-btn-pressed:
    backgroundColor: "{colors.flap-amber}"
    textColor: "{colors.amber-ink}"
  pass:
    backgroundColor: "{colors.flap}"
    textColor: "{colors.flap-text}"
    rounded: "{rounded.board}"
  pass-stub:
    backgroundColor: "{colors.board}"
    textColor: "{colors.flap-amber}"
    width: "4.5rem"
    padding: "0.9rem 0.5rem"
  toast-plate:
    backgroundColor: "{colors.board}"
    textColor: "{colors.flap-text}"
    rounded: "{rounded.board}"
    padding: "0.8rem 0.9rem 0.8rem 1rem"
    width: "360px"
  toast-action:
    backgroundColor: "{colors.flap-text}"
    textColor: "{colors.board}"
    rounded: "{rounded.control-plate}"
    padding: "0.4rem 0.7rem"
---

# Design System: NextStep Database

## Overview

**Creative North Star: "The Terminal Hall"**

The site is a deep rail-green concourse with one black departures board in it. The page ground is a committed, drenched green (the concourse), the type is cream, and the rules that divide content are hairlines of that same cream at low alpha. Into the concourse is mounted a single near-black panel: the departures board, where real program deadlines sit in amber split-flap cells and green, amber, and red lamps report status. Everything the visitor reads on the concourse is quiet and ruled; everything on the board is loud and mechanical. Safety orange is the one thing that is neither: it is the action color, and it appears only where the visitor is meant to act (the slab button, the focus ring, the active-nav underline, the plated phrase in a headline, text selection). The concourse is paced in bands: green sections alternate with deeper green bands, each divided from the next by a strong hairline, so the page reads as a sequence of signs rather than one scroll.

The type is one family, Archivo, in three widths. Headlines are set wide (font-stretch 118%, weight 900) at sign size (36px on a phone, 72px on a wide screen; the closing sign reaches 92px) with a 0.92 to 0.94 line-height so a two-line headline reads as one sign. The one phrase a sign is about is lettered on an inline orange plate. The board and every code, column head, and flap use Archivo condensed (font-stretch 75%, weight 700) in uppercase with tabular numerals. Body copy is Archivo at normal width, 15 to 17px, with generous leading, so the concourse reads as a place to stand and read, not a poster. Density is high where the data is (the board packs ten rows into one viewport) and calm everywhere else (sections are ruled lists with wide vertical rhythm).

Motion is the split-flap. Rows flap in on load with a 40ms row stagger and a 22ms per-tile stagger; changed cells re-flap when a filter changes; a clock colon blinks once a second; the board pages itself every 20s behind a thin amber paging line and stops the moment a visitor points at it or tabs into it. Saving a departure lands an amber SAVED stamp on the row once, the one flourish the world allows. Every other interaction uses strong ease-out curves, a 160ms press scale, and hover feedback gated to fine pointers. Under reduced motion the flaps become 200ms fades and every travel is dropped. The world refuses the category default of a centered hero, three feature cards, and a stats strip; the database itself is the first thing on screen.

**Key Characteristics:**
- One near-black object (the board) on a drenched green concourse; nothing else on the page is black. Gate codes and the NS mark are small plates of board material, not surfaces.
- Sign-scale headlines (36 to 92px at 0.92 to 0.94 leading) in wide Archivo 900, with one orange plated phrase per sign.
- One typeface in three widths: wide for signs, condensed uppercase for the board and every plate, normal for reading.
- Orange is action by law; green, amber, and red are status by law. None of the four is decoration.
- Buttons are orange slabs with near-black text; the cream line button is the only sibling.
- Corners are tight (2 to 6px); rules are 1px cream at 14% or 28% alpha; shadows are black with a 1px lip, plus an orange glow under the slab.
- Lists are ruled, not carded; the concourse divides with strong hairlines and alternates hall and hall-deep bands.
- Motion is mechanical (flap, blink, stagger, paging) on the board and Kowalski-curved (160ms press, strong ease-out) everywhere else.
- The visitor's own board is made of board material: saved departures are boarding passes in a black drawer, and confirmations are black board plates with an Undo, never a modal.

## Colors

A drenched palette: one hue of green for the whole concourse, cream lettering on it, one black board with amber flaps, and safety orange reserved for action.

### Primary
- **Orange** (`{colors.orange}`): the single action color. The slab button, the inline `.plate` on a headline, the focus ring on every element (inside `.dark` as well), the active-nav underline, the composer's focused border and ring, the checkbox and range accent, and text selection. It never colors a status, a heading, a rule, or a decoration.
- **Orange High** (`{colors.orange-hi}`): the slab button on fine-pointer hover only.
- **Orange Ink** (`{colors.orange-ink}`): the only text color on an orange ground (slab label, plated phrase, selected text).

### Secondary (the board)
- **Board** (`{colors.board}`): the near-black panel. The departures board, the `.dark` scope background, and the ground of every small signage plate (gate codes, the NS mark).
- **Flap** (`{colors.flap}`) and **Flap Highlight** (`{colors.flap-hi}`): the two stops of each flap tile's vertical gradient (highlight, flap at 48%, a `#111412` seam at 52%, highlight). Also the `.dark` card and popover surfaces.
- **Flap Split** (`{colors.flap-split}`): the 1px hairline across the middle of every flap cell.
- **Flap Text** (`{colors.flap-text}`): cream type on the board: titles, counts, the clock, links, and the LISTED status. Pure `#fff` appears only on a hovered board title.
- **Flap Dim** (`{colors.flap-dim}`): board column heads, sub-lines, "updated" text, the footer strip, and the dim dash for an unknown status.
- **Flap Amber** (`{colors.flap-amber}`): the board's lettering color for what is loud: the DEPARTURES heading, every deadline flap, the hero-count tiles, gate codes, and the NS mark. The CSS also exposes it as `--signal-yellow`, the SOON / "N D LEFT" status tone; amber as status and amber as lettering are the same value on purpose.

### Tertiary (signal lamps)
- **Signal Green** (`{colors.signal-green}`): OPEN, and the LIVE lamp on the board header (a 7px dot with a slow pulse; state, not decoration). Also the success token.
- **Signal Red** (`{colors.signal-red}`): CLOSED and PASSED. Also the destructive and error tokens.

### Neutral
- **Hall** (`{colors.hall}`): the page ground and the top bar (at 90% over blur).
- **Hall Deep** (`{colors.hall-deep}`): the footer ground, the alternating deep bands on the homepage (`.band-deep`: the gate directory and the closing CTA), and the text color on a selected cream chip.
- **Surface** (`{colors.surface}`): the raised concourse surface for cards, popovers, the composer input, and the legacy glass panel (at 85%). One tone lighter than the hall, same hue.
- **Surface 2** (`{colors.surface-2}`): the shadcn muted / secondary / accent surface; two tones above the hall.
- **Ink** (`{colors.ink}`): cream. The concourse's text, headlines, the line button, the gate label, the selected chip's ground, and the hero-count caption.
- **Ink Soft** (`{colors.ink-soft}`): lead paragraphs, chip text at rest, footer links.
- **Ink Muted** (`{colors.ink-muted}`): section intros, inactive nav links, filter-group labels, gate notes, the CTA footnote, the copyright line, footer description.
- **Ink Faint** (`{colors.ink-faint}`): footer column heads, placeholder text.
- **Hall Line** (`{colors.hall-line}`): the default border and in-list rule, 1px.
- **Hall Line Strong** (`{colors.hall-line-strong}`): the rule between sections and bands, the rule under the hero headline, input borders, chip and line-button borders, gate rules, the board's mounting frame, the footer's bottom rule, thin scrollbars. Active/hovered borders step to `rgba(243, 236, 217, 0.6)`.

### Named Rules
**The Orange Is Action Rule.** Safety orange marks exactly the places a visitor acts or is acting: the slab button, the plated phrase that names the action in a headline, the focus ring, the current-route underline, the focused input, and selection. It is never a status, a heading color, a rule, a badge, or a fill behind content.

**The Status-By-Law Rule.** Green, amber, and red mean OPEN, SOON / due-within-14-days, and CLOSED / PASSED, set only by a recorded status or a real date. LISTED is cream; unknown is a dim dash. None of the three is ever a button, a fill, a hover color, or an ornament.

**The Amber Plate Rule.** Outside a status flap, amber appears only as condensed uppercase lettering on board-black: the DEPARTURES heading and deadline flaps on the board, the hero-count tiles, gate codes, and the NS mark. Amber never sits on the green ground as text and never becomes a background.

**The One Dark Object Rule.** The board is the only black surface on the concourse. Do not add dark cards, dark bands, or a dark footer; pacing bands and the footer are Hall Deep, raised surfaces are Surface. A gate code or NS mark is a plate of board material the size of a word, not a surface, and does not count. The visitor's own board (the bottom drawer of boarding passes) and the toasts that report saves are the board's material carrying board rows, not a second surface; anything black must be showing departures.

## Typography

**Display Font:** Archivo, wide cut (font-stretch 118%, weight 900) with Arial Black, Helvetica Neue, system-ui
**Board Font:** Archivo, condensed cut (font-stretch 75%, weight 700), uppercase, tabular numerals, with Arial Narrow, Helvetica Neue, system-ui
**Body Font:** Archivo, normal width, with Helvetica Neue, Arial, system-ui
**Mono Font:** JetBrains Mono (token only; not used on the redesigned surfaces)

Loaded (index.html): the Archivo variable face over its full width axis (wdth 62 to 125) and weight axis (wght 400 to 900), plus a single 400 italic at normal width. Every width and weight in the ramp is real; nothing snaps.

**Character:** One voice at three widths. The wide cut shouts a headline in two lines at sign size, weight 900, near-zero leading, with its key phrase plated in orange; the condensed cut runs the board and every code plate in caps with lining tabular figures; the normal cut does all the sentences with room to breathe.

### Hierarchy
- **Display** (900, wide, 36px / 56px at 640px / 64px at 1024px / 72px at 1280px, line-height 0.94, tracking -0.02em): the page h1, its last phrase on an inline orange plate. The closing CTA sign is the same face one step larger (40px / 72px / 92px, line-height 0.92, max 12ch). Left-aligned, never centered.
- **Headline** (900, wide, 32px / 52px at 640px for the gate directory, 34px / 56px / 68px at 1024px for the notice, line-height 0.94, tracking -0.02em, max 14 to 18ch): section h2s.
- **Title** (900, wide, 22px / 26px at 640px, line-height 1, tracking -0.015em): h3 inside ruled lists (the notice items). The wordmark is the same face at 900: 18px in the bar (tracking -0.02em) and 28px in the footer (line-height 0.95).
- **Board Heading** (Board font, 700, 30px / 34px at 640px, tracking 0.04em, Flap Amber): the DEPARTURES title. The live count beside it is Board font 600, 16px, Flap Text; the LIVE label is 700, 12px, tracking 0.14em, Signal Green beside its lamp; the clock is 600, 15px, Flap Text.
- **Board Title** (Board font, 700, 23px, line-height 1.05, tracking 0.015em; 18px and a two-line clamp under 900px): a program's name in its row.
- **Gate Label** (Board font, 700, 24px / 34px at 640px, line-height 1, tracking 0.02em, Ink): the category name in a gate row, over a 14px Ink Muted note.
- **Flap** (Board font, 700, 19px for deadlines, 14px for status, 52px for the hero count, tracking 0.02em, one character per 0.74em by 1.28em tile; 80% under 900px): the split-flap cells. Deadline flaps letter in Flap Amber (Signal Yellow when due soon); the relative line beneath ("in 6 days", "today", "date not listed") is 13px tabular Flap Dim.
- **Signage Label** (Board font, 700 at 12px with tracking 0.14em for footer column heads and the LIVE label; 700 at 15px with tracking 0.08em for gate codes; 700 at 14px / 15px with tracking 0.12em for the CTA footnote and the hero-count caption; 600 at 11.5px with tracking 0.14em for board column heads; 700 at 11px for the NS mark): every uppercase plate and column head.
- **Lead** (400, 17px / 19px at 640px, line-height 1.5, max 44 to 48ch, Ink Soft): the sentence beside the hero count and the sentence under the notice headline. Section intros beside a headline (the gate directory) are 15px Ink Muted at 1.6, max 40ch.
- **Body** (400, 15px, line-height 1.6 to 1.65): running copy on the concourse. Nav links, footer links, and board organization text are 13.5px; footer description is 13px.
- **Label** (500, 12.5px, uppercase, tracking 0.08em, Ink Muted): filter-group labels ("GRADE", "TYPE", "FORMAT"), the one uppercase use of the normal cut.
- **Caption** (400, 12.5 to 13px, tabular numerals): the board's "updated" and footer strips, the copyright line.

### Named Rules
**The Tabular Rule.** Wherever numbers sit in a column or a strip (counts, dates, clocks, gate codes, copyright), turn on `tnum`. The `.font-display`, `.font-board`, `.font-annotation`, and `.tnum` utilities all do this.

**The Three Widths Rule.** Archivo is the only family, and width is the hierarchy: 118% wide at 900 for signs, 75% condensed at 700 for the board and plates, normal width for sentences. Do not introduce a second family or a fourth width; do not set a sign at normal width or a sentence condensed.

**The Two-Line Sign Rule.** Display and headline copy is capped by `max-width` in `ch` so it never runs past two lines; if the copy needs three, shorten the copy.

**The Board Is Uppercase Rule.** Only the condensed cut is set in caps, and it always is. The normal cut is never uppercased except the 12.5px filter labels; there are no kicker lines above headlines.

**The Plated Phrase Rule.** A display sign may plate exactly one phrase (`.plate`: Orange ground, Orange Ink lettering, `0.02em 0.18em 0.06em` padding, `0.06em` corners, line-height 0.95, `box-decoration-break: clone` so a wrapped phrase stays plated). Plate the phrase the sign is about, which is the action ("Your board."), never a whole headline, and never more than one per sign.

## Layout

The concourse is a single centered column with three widths: page (`1280px`) for the top bar, hero, board, gates, notice, CTA, and footer; story (`1040px`) for two-column explanatory sections; content (`780px`) for single-column reading. Horizontal gutters are `1rem` on mobile and `1.5rem` from 640px. Homepage sections stack with a 1px Hall Line Strong rule on top and vertical padding of `5rem` (mobile) rising to `7rem` at 640px; the CTA band uses `6rem` to `9rem`. Bands alternate: hero and notice sit on Hall; the gate directory and CTA sit on Hall Deep (`.band-deep`); the footer is Hall Deep on a Hall Line rule. Inside sections, rhythm follows the spacing scale (`0.5rem` to `6rem` in seven steps).

The first viewport is the headline at full page width, then, under a Hall Line Strong rule, a two-column row at 1024px and up (`1fr 1fr`, `3rem` column gap, items aligned to the bottom): the live total as 52px amber flap tiles with its caption on the left; the lead (max 48ch, pushed to the right edge) and two buttons on the right. Beneath that the board runs the full page width and starts inside the first viewport. Filters sit on the concourse under the board, `1.75rem` down, as wrapped chip groups. The board shows ten rows per page over the next 200 listings by deadline; pages turn every 20s (`PAGE_MS`) and the footer strip carries the page counter, prev / next / pause controls, and the "Full database" link. The visitor's board is a bottom drawer (vaul) capped at `720px` wide and `88vh` tall, with a `1rem` gutter and passes stacked at a `0.75rem` gap.

The board is a five-column grid (`7.25rem` deadline, `1.9fr` program, `1.1fr` organization, `8.5rem` type, `7.5rem` status, `1rem` gap) with `0.95rem 1.4rem` row padding. Under 900px it collapses to three columns (`4.7rem`, `1fr`, `5.2rem`, `0.6rem` gap, `0.9rem` side padding): organization and type hide, the organization moves under the title as a sub-line, flaps shrink to 80%, and titles drop to 18px with a two-line clamp.

The gate directory opens with its headline and a 40ch intro side by side at 640px, then a ruled list in a two-column grid at 768px and up (`3rem` column gap): each row is `3.2rem` code, label, arrow (`1.25rem` gap), with `1.25rem` vertical padding and a Hall Line Strong rule on top. The notice is a headline and lead over a three-column ruled grid at 768px (`3rem` gap); the footer is `1.2fr 1fr 1fr 1fr` at 640px. Breakpoints in use: 640px (sm), 768px (md), 900px (board collapse), 1024px (lg), 1280px (xl, the h1's last step).

## Elevation & Depth

The concourse is flat. Depth on it is drawn with 1px cream rules at two alphas and one tone step (Surface over Hall), never with shadows; the only things on the concourse that cast a shadow are the slab button (a black lip and an orange glow), the board itself, and the hero count's flap tiles, which are board material set loose on the concourse. The board is the one lifted object on the page: a matte panel with a 1px black edge, a lit top lip, a long black drop, and a 5px-offset hairline mounting frame around it. Inside the board, depth is tonal and mechanical: each flap tile has an inset 1px black edge, a vertical gradient, and a hairline split. The top bar floats on a translucent Hall at 90% over a 12px blur backdrop.

### Shadow Vocabulary
- **Slab lift** (`box-shadow: 0 1px 0 rgba(0, 0, 0, 0.3), 0 10px 24px -12px rgba(255, 106, 19, 0.6)`): the slab button at rest, a black lip and an orange glow. Hover deepens to `0 1px 0 rgba(0, 0, 0, 0.3), 0 14px 28px -12px rgba(255, 106, 19, 0.7)`; active flattens to `0 1px 0 rgba(0, 0, 0, 0.3), 0 4px 10px -8px rgba(255, 106, 19, 0.5)`.
- **Board mount** (`box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 1px 0 rgba(0, 0, 0, 0.5), 0 30px 60px -28px rgba(0, 0, 0, 0.8), 0 2px 8px rgba(0, 0, 0, 0.35)`): the departures board only, with `border: 1px solid #000` and the `::before` frame at `inset: -5px` in Hall Line Strong.
- **Flap edge** (`box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.45)`): every flap cell.
- **Hero flap** (`box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(0, 0, 0, 0.4), 0 12px 28px -14px rgba(0, 0, 0, 0.8)`): the 52px hero-count tiles only, which sit on the concourse and so get a lip and a drop.
- **Live pulse** (`box-shadow: 0 0 0 0 rgba(87, 208, 138, 0.55)` to `0 0 0 7px rgba(87, 208, 138, 0)` at 70%, 2.4s, strong ease-out, infinite): the LIVE lamp's ring. A state signal, not elevation; off under reduced motion.
- **Pass** (`box-shadow: 0 1px 0 rgba(0, 0, 0, 0.4), 0 14px 30px -20px rgba(0, 0, 0, 0.8)`): a boarding pass in the drawer, a lip and a short drop on the board's own ground.
- **Toast plate** (`box-shadow: 0 1px 0 rgba(0, 0, 0, 0.5), 0 20px 40px -20px rgba(0, 0, 0, 0.8)`): a board plate floating over the concourse at bottom-left.
- **Focus ring, inputs** (`box-shadow: 0 0 0 3px rgba(255, 106, 19, 0.2)` plus an Orange border): the composer shell on `:focus-within`.

### Named Rules
**The One Lift Rule.** Only the board, board material set loose from it (the hero count's tiles, boarding passes, toast plates), and the slab button cast shadows. Cards, chips, line buttons, nav, plates, and lists are flat and ruled.

**The Lip Rule.** Every elevation shadow starts with a 1px black lip (`0 1px 0`) before its soft spread; there are no floating glows except the orange one under the slab, and no hard offset shadows. The live lamp's pulse ring is a lamp, not a lift, and is the one zero-offset spread.

## Shapes

Corners are tight and get tighter as objects get smaller: the board is 6px, the hero-count tiles 4px, cards and controls 0.375rem, buttons and chips 0.25rem, plates (gate code, NS mark) 3px, flap tiles and skeleton bars 2px, the focus outline 2px, the inline plate `0.06em` of its type size. The small controls that live on board-black (save plate, pager buttons, the toast's action) are 4px. Nothing is pill-shaped except the 7px live lamp and the three legacy loading dots; the 14px discs at the ends of a boarding pass's perforation are cutouts in the board's ground, not shapes on it. A boarding pass is a 6px rectangle split by a 2px dashed cream rule (22% alpha) into a `4.5rem` black stub and a Flap body. Borders are 1px everywhere: Hall Line for in-list rules, Hall Line Strong for anything interactive or framed, `#000` for the board edge. The recurring silhouette is the rectangle of a signage plate: a small block carrying lettering in a contrasting color (flap cell, gate code, NS mark, selected chip, slab button, and the inline orange plate on a headline, which clones across line breaks). Long content clips with an ellipsis on one line on the board and a two-line clamp on narrow screens; nothing else clips.

## Components

Every interactive element takes the `press` behaviour: a 160ms `scale(0.97)` on `:active` using the strong ease-out, with color and border transitions at 200ms; hover styles exist only under `(hover: hover) and (pointer: fine)`. Focus is a 2px Orange outline offset 2px, on the concourse and inside `.dark` alike.

### Buttons
- **Shape:** tight corners (`0.25rem`), inline-flex, `0.5rem` gap for a trailing arrow icon.
- **Slab (primary):** Orange ground, Orange Ink 700-weight text at 15px, tracking -0.005em, `0.8rem 1.25rem` padding, slab-lift shadow. One per section at most; it is the only filled button. It scales with its sign: 13.5px at `0.5rem 0.875rem` in the top bar, 16px at `0.875rem 1.5rem` in the hero, 18px at `1rem 2rem` under the CTA sign.
- **Hover / Focus:** hover goes to Orange High with a deeper glow; active flattens the shadow and presses 3%.
- **Line (secondary):** transparent with a 1px Hall Line Strong border, Ink 500-weight text, padding reduced by 1px to match slab height. Hover fills `rgba(243, 236, 217, 0.06)` and steps the border to `rgba(243, 236, 217, 0.6)`.
- **Text links on the board:** Flap Text, 500 weight, underline when inline; no third button style exists.

### Chips
- **Style:** the board's filters, on the concourse. Transparent with a 1px Hall Line Strong border, 4px corners, `0.35rem 0.75rem` padding, 13px Ink Soft text, in wrapped groups behind a 12.5px uppercase label. Hover fills `rgba(243, 236, 217, 0.06)`.
- **State:** `aria-pressed="true"` becomes a cream slab (Ink ground, Hall Deep text), like a pressed key. Toggling a chip re-flaps every changed board cell.

### Cards / Containers
- **Corner Style:** the world prefers ruled lists to cards: sections and list items divide with 1px Hall Line rules, not boxes.
- **Background:** where a container is needed (popover, composer input, legacy card), it is Surface with a Hall Line border and `0.375rem` corners; inside `.dark` it is Flap with a `rgba(244, 239, 226, 0.12)` border.
- **Shadow Strategy:** none (see The One Lift Rule).
- **Internal Padding:** ruled rows pad `1.75rem` vertically in the notice list and `1.25rem` in the gate list.

### Inputs / Fields
- **Style:** the composer shell: Surface ground, 1px Hall Line Strong border, `0.375rem` corners, Ink text, Ink Faint placeholder.
- **Focus:** border becomes Orange and a `0 0 0 3px rgba(255, 106, 19, 0.2)` ring appears, 200ms.
- **Error:** Signal Red on the concourse and the board; admin's light theme uses its own `#c9463a`.

### Navigation
- **Style:** a sticky 3.5rem signage bar on translucent Hall (90%) over a 12px blur backdrop, Hall Line bottom rule. Wordmark left: an NS plate (1.5rem Board square, 3px corners, 11px Board font in Flap Amber) plus "NextStep Database" in Display 900 at 18px. The bar's right end carries the primary action as a small slab ("Find matches", 13.5px, `0.75rem` from the last link).
- **Links:** 13.5px, Ink Muted at rest, Ink at 600 weight when current. A 2px Orange underline inset `0.6rem` from each side scales in from the left over 200ms on hover (fine pointers) and stays on `aria-current="page"`.
- **Mobile:** links scroll horizontally with hidden scrollbars; the wordmark shortens to "NextStep".
- **Footer:** Hall Deep ground, four columns, the wordmark at Display 900 28px, Board-font column heads in Ink Faint, 13.5px Ink Soft links that underline on hover, a Hall Line Strong bottom rule with a tabular copyright line.

### Departures Board (signature)
A `.board.dark` panel, Board ground, 6px corners, black edge, mounting frame, and the board-mount shadow. Header strip: DEPARTURES in Flap Amber at 30px / 34px, the live listing count in Flap Text at 16px, a LIVE label in Signal Green beside its pulsing lamp, then "updated …" in Flap Dim and a clock in Flap Text with a colon that blinks at 1s in `steps(1)`. Column heads: 11.5px Board font, tracking 0.14em, Flap Dim, over a 0.14-alpha rule. Rows: links on a 0.07-alpha rule, `0.95rem 1.4rem` padding; deadline as six amber flap cells at 19px (Signal Yellow when due within 14 days) with a relative "in N days" / "today" / "date not listed" line beneath in tabular Flap Dim; title in Board Title (23px) with a Flap Dim sub-line (grades and location); organization and type as flap-text blocks; status as seven flap cells at 14px in the tone the law assigns (LISTED in plain Flap Text). Hover tints the row `rgba(244, 239, 226, 0.045)` and lifts the title to white; active tints `0.07`; focus outline sits 3px inside. Footer strip: "Next 10 of 1,234 by deadline" in tabular Flap Dim and a "Full database" link. Loading shows 14px skeleton bars with a 1.4s shimmer; errors and empty filters show a centered Flap Dim sentence with an underlined recovery link.

Each row ends in a save plate (`.save-btn`): a 2rem Flap square, 4px corners, 18%-alpha cream edge, Flap Dim plus icon, absolutely placed `0.9rem` from the right edge (the status column pads `2.6rem` to make room). Hover lifts it to Flap Text; press scales it to 0.94 over 160ms; `aria-pressed="true"` fills it Flap Amber with an Amber Ink check. On the save the stamp (`.stamp`) lands once beside it: SAVED in 15px condensed uppercase, tracking 0.12em, Flap Amber on a 2px Flap Amber outline, 3px corners, entering over 220ms on the strong ease-out from `scale(1.4)` and -10deg to rest at -5deg, then fading over 240ms after 860ms. Under reduced motion it fades in at rest tilt over 200ms. It is the world's one flourish and fires only on a save, never on a removal.

Under the header strip runs the paging line (`.board-pager`): 2px, 8%-alpha cream track, an amber fill that scales from 0 to 1 over `--page-ms` (20s) linearly, then the next ten rows flap in. The line is cycling only while nothing is paused: it stops on pointer-enter or focus within the board, on the pause control, when there is a single page, and under reduced motion. The footer strip carries three pager buttons (`.pager-btn`, 1.75rem, 4px corners, 16%-alpha edge, Flap Text glyph; disabled at 35%; hover 8% cream; the pause button fills Flap Amber with Amber Ink while `aria-pressed`) beside "Page 1 / 20" in 13px condensed Flap Text and the "next 200 of 1,234 by deadline" line in Flap Dim. Rows leave over 160ms with `layout="position"`, so a filter or page turn moves rows rather than redrawing them; under reduced motion the transition is instant.

Each flap cell is a `0.74em` by `1.28em` inline-grid tile with a vertical Flap gradient, inset black edge, a Flap Split hairline at 50%, and 2px corners; blanks sit at 55% opacity. A changed character flips in place over 260ms (`rotateX` 0 to -88deg, then 88deg to 0, opacity dipping to 0.6 mid-flip) on the strong ease-out; rows stagger 40ms and tiles 22ms via `--i` and `--k`. Under reduced motion each flip becomes a 200ms fade from 0.4 opacity and rows appear via `@starting-style`.

### Gate Row (signature)
The concourse's list form for categories: a three-column grid (`3.2rem` code, label, arrow, `1.25rem` gap), Hall Line Strong rule on top, `1.25rem 0.25rem` padding. The code is a signage plate (Board ground, 3px corners, 15px Board font in Flap Amber, tracking 0.08em, `0.4rem` vertical padding); the label is Gate Label (Board font 700, 24px / 34px) in Ink with a 14px Ink Muted note beneath; the arrow is 20px. On fine-pointer hover the label underlines and the arrow travels 4px right on the strong ease-out.

### Inline Plate (signature)
`.plate`: the action color carried into a display sign for the one phrase the sign is about. Inline-block, Orange ground, Orange Ink type, `0.02em 0.18em 0.06em` padding, `0.06em` corners, line-height 0.95, `box-decoration-break: clone`. It inherits the sign's face and size (the h1's last phrase at up to 72px; "Your board." at up to 92px). No hover, no shadow, no motion; it is lettering.

### My Board (signature)
The visitor's saved departures, persisted in this browser only (`localStorage`, `nextstep.myboard.v1`; never a server). The top bar carries a "My board" line button (2.25rem tall, 4px corners, Hall Line Strong edge, ticket glyph, 13.5px Ink text, label hidden under 768px) whose count is a 12px flap tile: Flap Amber when non-zero, Flap Dim at zero. It opens a bottom drawer (vaul, `.board` class): Board ground, 10px top corners, a 60% black overlay, a title "Your board" in Board Heading style at 28px Flap Amber with the count ("3 departures" / "No departures yet") at 14px tabular Flap Text, then a 14%-alpha rule and the scrolling list. Empty state is a 22px condensed sentence with a 34ch Flap Dim explanation.

Each saved departure is a boarding pass (`.pass`), not a card: a 6px Flap rectangle with a 14%-alpha edge and the pass shadow, split into a `4.5rem` Board stub and a body. The stub carries "GATE" at 11px Flap Dim (tracking 0.16em), the two-letter gate code in 30px condensed Flap Amber, and a two-digit tabular position; a 2px dashed cream rule (22% alpha) perforates it from the body with a 14px notch cut from the ground at each end. The body (`0.9rem 1rem 1rem 1.1rem`) sets "DEPARTURE" at 11px Flap Dim, the title at 20px condensed Flap Text clamped to two lines, the organization at 13px Flap Dim, then six deadline flaps at 15px (Signal Yellow inside 14 days) with a countdown line in the tone the law assigns, an "Open" link in 13px condensed Flap Text (underline on hover, arrow glyph), and a 2rem remove button at the top-right corner. Passes enter with a 10px lift on a no-bounce spring (0.42s) and leave sliding 24px right over 180ms; `layout="position"` reorders the rest. Under reduced motion both are instant.

### Toasts
Sonner, bottom-left with a 20px offset and 10px gap, 4s duration, unstyled and dressed as a board plate (`.sonner-board`): 360px wide (capped at the viewport minus 32px), Board ground, 18%-alpha cream edge, 6px corners, the toast-plate shadow, `0.8rem 0.9rem 0.8rem 1rem` padding. The title is 14px condensed uppercase Flap Amber (tracking 0.08em); the description is 13px Flap Dim on one ellipsised line; the action is a cream plate (Flap Text ground, Board text, 13px 700, `0.4rem 0.7rem`, 4px corners) with the 160ms press. "Added to your board" offers "Open board"; "Removed from your board" offers "Undo".

### Named Rules
**The Board Pages Itself Rule.** A board with more than one page turns on its own timer behind a visible amber paging line and stops for any sign the visitor is reading it: pointer over the board, focus inside it, the pause control, or reduced motion. It never turns under a visitor's hand.

**The Passes, Not Cards Rule.** A saved departure is a boarding pass: a black stub with the gate code, a dashed perforation with cut notches, and a body of board lettering. It is never a generic card, and it lives only on board-black.

**The Undo Over Confirm Rule.** Removing a saved departure never asks first; it happens, and the toast offers Undo. Saving reports itself with the stamp on the row and a toast that opens the board; no dialog, no modal.

**The One Stamp Rule.** The SAVED stamp is the delight budget: one landing per save, 220ms in, gone by 1.1s, amber outline only, never on a removal, a page turn, or any other event.

### Live Lamp
`.live-dot`: a 7px Signal Green disc beside the board's LIVE label. Its ring pulses from `0 0 0 0 rgba(87, 208, 138, 0.55)` to `0 0 0 7px` transparent over 2.4s on the strong ease-out, forever. It reports that the board is live data; it is never used as decoration or on anything that is not a live state. Static under reduced motion.

### Hero Count
The live total set as amber flap tiles at 52px on the concourse (`.hero-count`): tiles gain 4px corners, a wider 4px gap, and the hero-flap shadow so they read as board material mounted in the open. A 15px Board-font caption in Ink (tracking 0.12em) beneath names the count and its freshness; while loading, an 80px skeleton bar holds the space.

### Deep Band
`.band-deep`: a section on Hall Deep ground with the same Hall Line Strong top rule and section padding as its neighbours. Used to pace the homepage (gates, CTA); it is a tone step in the same green, never a black surface.

### Page Transition
Route content enters with `page-enter`: 360ms, 8px upward travel with a fade, strong ease-out. Sections lower on the page reveal through an IntersectionObserver at 14% with a 700ms fade-and-4px-lift, skipped entirely under reduced motion.

## Do's and Don'ts

### Do:
- **Do** open every public page with the database or the record itself; the concourse exists to hold real rows, not to describe them.
- **Do** set status only from a recorded status or a real date, and render the unknown as a dim dash in Flap Dim (The Status-By-Law Rule).
- **Do** use one slab button per section (Orange ground, Orange Ink text, `0.25rem` corners, slab-lift shadow) and the line button as its only sibling.
- **Do** put orange only where the visitor acts: the slab, the plated phrase, the focus ring, the active-nav underline, the focused input, selection (The Orange Is Action Rule).
- **Do** divide the concourse with 1px cream rules (Hall Line inside lists, Hall Line Strong between sections), pace long pages by alternating Hall and Hall Deep bands, and reserve shadows for the board, its hero tiles, and the slab (The One Lift Rule).
- **Do** set headlines in Archivo wide (font-stretch 118%, weight 900) at sign size (36px to 92px by breakpoint) and line-height 0.92 to 0.94, left-aligned, capped in `ch` to two lines.
- **Do** set the board, every code plate, and every column head in Archivo condensed (font-stretch 75%, weight 700), uppercase, tabular (The Three Widths Rule, The Board Is Uppercase Rule).
- **Do** set every column of numbers, every date, count, and code with tabular numerals (The Tabular Rule).
- **Do** use the strong ease-out (`cubic-bezier(0.23, 1, 0.32, 1)`) for every entrance and travel, the 160ms press scale on every pressable, and gate hover to `(hover: hover) and (pointer: fine)`.
- **Do** keep each flap under 300ms (260ms in the build) and provide the 200ms fade under `prefers-reduced-motion`.
- **Do** put amber only on board-black, as condensed uppercase lettering, or in a status flap (The Amber Plate Rule).
- **Do** scale the slab button with its sign (13.5px in the bar, 16px in the hero, 18px under the CTA) rather than adding a second button style.
- **Do** show a visible paging line whenever the board turns on its own, and stop it on pointer, focus, pause, or reduced motion (The Board Pages Itself Rule).
- **Do** make saved things boarding passes on board-black (stub, perforation, body) and report every removal with an Undo toast rather than a confirmation (The Passes, Not Cards Rule, The Undo Over Confirm Rule).
- **Do** keep small controls on the board (save plate, pager buttons, toast action) at 4px corners, and mark their pressed state as Flap Amber with Amber Ink.

### Don't:
- **Don't** make a status, heading, rule, badge, or ornament out of Orange, or a button, fill, hover color, or ornament out of Signal Green, Flap Amber, or Signal Red.
- **Don't** add a second black surface: no dark cards, bands, or footers; the board is the one dark object, pacing bands are Hall Deep, raised surfaces are Surface, and code plates are lettering-sized.
- **Don't** center a hero, stack feature cards, or add a stats strip; the board and the ruled gate list replace all three.
- **Don't** place a kicker or eyebrow line above a headline; the headline and its lead carry the section.
- **Don't** use ease-in, a built-in `ease`, or any curve weaker than the tokens for motion that travels; and never animate a flap longer than 300ms.
- **Don't** round anything past 6px (the board) or use pill shapes; corners are 2 to 6px by size, the only discs are the 7px live lamp and the legacy loading dots, and the pass's perforation notches are cutouts, not discs.
- **Don't** introduce a second typeface or a fourth width; signs are wide, the board is condensed, sentences are normal (The Three Widths Rule).
- **Don't** uppercase the normal-width cut for headings or plates; uppercase belongs to the condensed cut only.
- **Don't** invent a value for a null deadline, cost, grade, or location; unknown renders as unknown.
- **Don't** plate more than one phrase per sign, plate a whole headline, or pulse a lamp on anything that is not live state.
- **Don't** spend the stamp anywhere but a save, page the board while a visitor is over it, or ask for confirmation before a removal.

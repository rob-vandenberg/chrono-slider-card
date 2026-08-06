/**
 * chrono-slider-card
 *
 * Standalone Home Assistant Lovelace dashboard card, part of the
 * chrono-* plugin family, for controlling a single cover-domain entity
 * (blind, shade, screen, awning, etc.) with a configurable open/closed
 * value mapping and fill direction.
 *
 * Successor to vertical-slider-card (frozen at v0.0.12, not deleted).
 * Rebuilt from scratch in Lit 2.0, following the established chrono-*
 * file structure (helper functions -> UI editor -> card) and generic
 * function/element prefixing convention (prefix here: "csc").
 *
 * PORTING APPROACH (per explicit agreement):
 *  - Pure, DOM-free logic (icon selection, cover capability checks,
 *    color resolution, favorite-position normalization, relative-time
 *    formatting, drag-position math) is copied near-verbatim from
 *    vertical-slider-card, since it has no dependency on the old
 *    imperative-DOM rendering approach and works unchanged.
 *  - The rendering/DOM layer is written fresh, idiomatically in Lit
 *    (declarative templates, styleMap/classMap, reactive properties),
 *    rather than transliterating vertical-slider-card's
 *    attachShadow()+innerHTML+querySelector approach, which does not
 *    translate structurally into Lit.
 *  - Exception, by design: the slider's drag-update path keeps an
 *    imperative fast path (cached element refs, direct
 *    style.setProperty on every pointermove), bypassing Lit's
 *    render/diff cycle during drag - matching vertical-slider-card's
 *    own _paint() approach and HA's real ha-control-slider, which uses
 *    the same technique for the same reason (a full template re-render
 *    on every pointermove is unnecessary overhead and a jank risk).
 *
 * DROPPED vs. vertical-slider-card (explicit agreement - dialog
 * scaffolding, a leftover from this project's dialog-port lineage, has
 * no place in a real dashboard card):
 *  - Dialog-style header (back button, history/settings/details action
 *    icons) and the three sub-views themselves (history/settings/details,
 *    including their hass.callApi/callWS calls).
 *  - show_close_button, show_history_button, show_settings_button,
 *    show_details_button config options (no longer applicable).
 *
 * KEPT, CONFIRMED FUNCTIONAL (do not confuse with the dropped dialog
 * scaffolding above - these are a genuinely separate feature):
 *  - The slider <-> up/stop/down-buttons mode-toggle icons. These
 *    ARE live-functional in vertical-slider-card (real click listener
 *    swaps which control widget is active) - a stale comment in that
 *    file's header claimed otherwise; confirmed against the actual
 *    code and corrected before this port. show_control_switch_buttons
 *    now defaults to false (differs intentionally from
 *    vertical-slider-card's source default of true - v0.0.13-era
 *    decision, carried forward here).
 *
 * FLAGGED, NOT SILENTLY ASSUMED:
 *  - <ha-selector> with a selector of { entity: { domain: 'cover' } }
 *    is used for the entity picker in the UI editor. This is standard,
 *    widely-used HA custom-card-editor practice, but its exact
 *    behavior has not been re-verified against HA frontend source in
 *    this session - flagged per this project's established convention
 *    for recalled-not-verified third-party API shapes.
 *  - static getConfigElement() returning
 *    document.createElement('chrono-slider-card-editor') is the
 *    standard custom-card editor registration pattern; likewise not
 *    re-verified against HA source this session.
 *
 * DEFERRED (see project backlog - not implemented in this version):
 *  - The styles: YAML->CSS override mechanism (ported from
 *    chrono-popup's STYLE_TARGETS / DEFAULT_X_STYLES / styleMap merge
 *    pattern). Deliberately postponed until the render structure below
 *    is settled through real iteration, per explicit agreement.
 */

import { LitElement, html, css } from 'https://unpkg.com/lit@2.0.0/index.js?module';
import { styleMap }              from 'https://unpkg.com/lit@2.0.0/directives/style-map.js?module';
import { classMap }              from 'https://unpkg.com/lit@2.0.0/directives/class-map.js?module';
import { live }                  from 'https://unpkg.com/lit@2.0.0/directives/live.js?module';

// --- Version ---------------------------------------------------------------
const CARD_VERSION = '1.1.29';

// --- Version History ---------------------------------------------------------
// v1.1.29: Editor UI overhaul: Mode/Fill direction/Default control moved into a
//          single grid row (1fr 1fr 1fr, cm grid technique) placed after Name and
//          before all toggles. Toggle order changed to Show name -> Show state ->
//          Show percentage -> Show last changed -> Show control switch buttons ->
//          Show favorites, with Favorite positions directly below. Added new
//          show_state config option (default true), mirroring the show_last_changed/
//          show_percentage pattern: MODE_DEFAULTS (both blocks), setConfig(), editor
//          toggle, and .state's <p> now conditional on it. Also added missing
//          padding: var(--ha-space-1, 4px) 0; to .percentage, matching .last-changed
//          (pending since v1.1.26, mistakenly dropped from v1.1.28).
// v1.1.28: Specificity audit of the built-in stylesheet, so the styles:
//          mechanism's flat single-class injected rules (see v1.1.23) reliably
//          win via source order alone, without a specificity mismatch against
//          the built-in rules. Flattened compound descendant selectors down to
//          their single (already-unique) class wherever the parent qualifier
//          was not needed for disambiguation: .state-header .state -> .state,
//          .state-header .percentage -> .percentage, .state-header .time-row
//          -> .time-row, .state-header .last-changed -> .last-changed,
//          .favorite-button .button-inner -> .button-inner, .favorite-button
//          .button-inner::before -> .button-inner::before, .favorite-button
//          .button-label -> .button-label. Deliberately NOT flattened:
//          .pressed .slider-track-bar and .favorite-button.active
//          .button-inner::before - these are interaction-state modifiers, not
//          identity qualifiers, and need to stay more specific than their base
//          rules.
// v1.1.27: Brought csc-* editor field helpers to parity with chrono-markdown-card's
//          cm-* equivalents. cscTextField/CscTextfield now forward type/step/min/max
//          (matching cmTextField/CmTextfield); CscTextfield input dimensions matched
//          to CmTextfield (height 40px->56px, padding 0 8px->0 12px, font-size
//          14px->16px); .csc-field label gained font-weight:600 to match .text-field
//          label. cscSelectField's native <select> replaced with new chrono-csc-select
//          custom element (CscSelect), ported from chrono-cm-select's CmSelect
//          (styled combobox, dropdown, chevron, keyboard nav, outside-click close) -
//          but NOT a straight port: unlike CmSelect's freeform text-commit behaviour,
//          CscSelect restricts committed value to list options only. Typing filters/
//          narrows the dropdown and moves the keyboard cursor to the best match;
//          value only commits on click, Enter on a highlighted option, or exact-match
//          blur/tab-away. Non-matching text reverts to the last valid value on blur.
//          Affects all three existing combobox fields (Mode, Fill direction, Default
//          control) automatically via the shared cscSelectField() call sites.
// v1.1.26: v1.1.25 dropped text-align:center from .state-header p entirely
//          along with the broken fixed-width-overflow centering it used to
//          (incorrectly) also be responsible for. But text-align had a
//          second, separate job: centering multiple wrapped lines relative
//          to each other within a single paragraph (e.g. "20 hours" / "ago"
//          on last-changed) - flexbox only centers the paragraph's own box,
//          not the lines inside it. Re-added text-align:center to
//          .state-header p. Safe this time: unlike the v1.1.24 bug, these
//          boxes are no longer fixed-width (they shrink-wrap as flex
//          items), so there's no oversized-content-vs-fixed-container
//          mismatch for text-align to mishandle.
// v1.1.25: The v1.1.24 centering fix (text-align:center on .state-header,
//          display:inline-block on its children) was verified incorrect -
//          reproduced in isolation that text-align never shifts oversized
//          content into negative offset, it stays flush to the start edge
//          with all overflow on one side, regardless of the child's
//          display value. Replaced with the same mechanism <ha-card>
//          itself already uses successfully one level up: .state-header is
//          now display:flex; flex-direction:column; align-items:center,
//          confirmed via isolated reproduction to center oversized content
//          with symmetric overflow. display:inline-block removed from
//          .state/.percentage/.last-changed - unnecessary as flex items.
// v1.1.24: (1) Fixed .state/.last-changed text not actually centering when
//          content is wider than the card - verified via isolated
//          reproduction that text-align:center on a fixed-width block does
//          not center oversized unbreakable content, it overflows entirely
//          to one side. Fix: .state-header now centers via text-align, and
//          its child lines (.state/.last-changed/.percentage) are
//          display:inline-block so they shrink-wrap and get positioned by
//          the parent instead of centering themselves. (2) Percentage
//          moved out of the state text into its own always-present-when-
//          enabled line (.percentage), no longer conditional on value
//          extremes - fixes cross-card vertical misalignment caused by
//          inconsistent state-text wrapping. New show_percentage config
//          option (default true) controls it, mirroring the existing
//          show_label pattern. (3) Renamed show_label -> show_last_changed
//          (breaking - old key no longer recognized, falls back to
//          default). (4) "Open" -> "Opened". (5) .state font-size
//          36px -> 32px.
// v1.1.23: Implemented the styles: YAML->CSS feature. config.styles is a flat
//          object of { class_name: { property: value } } blocks - class_name
//          uses underscores (matches devtools with dashes swapped for
//          underscores), converted to a kebab-case CSS selector; each
//          property is likewise converted from snake_case to kebab-case.
//          Built once in setConfig() into a single CSS text block (no
//          per-render rebuild, no DOM lookups, no target whitelist - any
//          class name and any property is accepted and injected as-is,
//          unvalidated). Injected via a <style> tag in render(), placed
//          after the card's own static styling so cascade tie-breaking
//          naturally lets user overrides win. To make individual elements
//          addressable where more than one instance of the same element
//          exists, added a second, specific class alongside the existing
//          shared one: control-btn-close/-stop/-open on the directional
//          buttons, icon-toggle-button-position/-button on the mode-toggle
//          buttons, and a dynamic favorite-button-<value> per favorite
//          position. <ha-card> also gained a plain "ha-card" class, since
//          it previously had none.
// v1.0.22: Fixed two issues found via a console-measured element-rect dump
//          comparing against vertical-slider-card side-by-side: (1)
//          .state-header (the "Closed" / relative-time block) was
//          shrink-wrapping to its own text width instead of filling the
//          card - <ha-card>'s align-items: center gives flex children no
//          width unless told otherwise, and .state-header was missed when
//          that override was added to .controls/.favorites-groups/
//          .card-title; added width: 100% to .state-header. (2) Reverted
//          the v1.0.21 favorite-button margin bump (12px) back to the
//          original 8px - the "buttons touching the slider" problem that
//          bump was meant to fix was actually already solved by
//          restoring .controls:not(:last-child)'s margin-bottom in the
//          same v1.0.21 release, so the margin increase was unnecessary
//          and only made single-column gaps look oversized.
// v1.0.21: Fixed four rendering discrepancies found by comparing against
//          vertical-slider-card side-by-side on a real dashboard: (1)
//          slider/track color was falling back to generic theme colors
//          instead of the entity-state color, because .control-slider-host's
//          own --control-slider-color/--control-slider-background
//          declarations clobbered the value set higher up on <ha-card> -
//          the three color custom properties are now set directly on
//          .control-slider-host instead. (2) :host had no margin (original
//          has margin: 8px) - card touched the dashboard edge; restored.
//          (3) .controls:not(:last-child) { margin-bottom: ... } was
//          dropped during the port (only the inner .controls > * variant
//          was kept) - the favorites row had no gap above it; restored.
//          (4) Favorite-button margin increased 8px -> 12px to give the
//          2x2 wrap (kept intentionally - narrower padding than the
//          original's dialog-derived 24px is a deliberate choice here)
//          proper breathing room instead of a cramped grid.
// v1.0.20: Initial release of chrono-slider-card. Ground-up Lit 2.0
//          rewrite of vertical-slider-card v0.0.12, following the
//          chrono-* plugin conventions (csc prefix, generic helpers ->
//          editor -> card file structure). Dialog scaffolding (back
//          button, history/settings/details sub-views and their action
//          icons) dropped entirely - not applicable to a real dashboard
//          card. Slider<->buttons mode-toggle kept, confirmed
//          functional; show_control_switch_buttons now defaults false
//          (was true in vertical-slider-card's source, changed in an
//          unstable 0.0.13 iteration and carried forward here). Pure
//          logic (icon/capability/color/favorite-position/relative-time
//          functions, drag-position math) ported near-verbatim under
//          the csc prefix; rendering layer rebuilt fresh in Lit, with
//          an imperative fast path retained specifically for the
//          slider's drag-update loop. styles: YAML->CSS mechanism
//          deferred to backlog until render structure is settled.
//
// --- vertical-slider-card version history (carried forward for lineage) ---
// v0.0.12: Default show_history_button, show_settings_button, and
//          show_details_button to false in both mode blocks (all header
//          icon buttons except show_name/the title now default hidden).
//          show_close_button was already false.
// v0.0.11: Restructure MODE_DEFAULTS into two complete named blocks
//          ("cover", "awning"), each containing every configurable
//          default as a key/value pair (fill_direction, default_control,
//          show_name, show_label, show_control_switch_buttons,
//          show_favorites, show_close_button, show_history_button,
//          show_settings_button, show_details_button,
//          favorite_positions) - not just fill_direction. Removes the
//          standalone DEFAULT_COVER_FAVORITE_POSITIONS and
//          DEFAULT_CONTROL consts, folding their values into both mode
//          blocks. setConfig() now reads every default from
//          MODE_DEFAULTS[this._mode].X, with no literal true/false/array
//          fallback values left inline in setConfig() itself.
// v0.0.10: .main-control gets width: 100% and justify-content: center
//          (its own box was shrink-wrapping due to .controls'
//          align-items: center, giving the slider nothing to grow into).
//          .control-slider-host gets width: 100% alongside its existing
//          min-width: 80px / max-width: 130px, so it fills the now-full-
//          width parent, clamped between the two.
// v0.0.9: .control-slider-host: remove the fixed width (was pinning the
//         slider at 130px and preventing any shrink), keep min-width: 80px
//         as the shrink floor, add max-width: 130px as the grow ceiling.
//         Lets the card/slider shrink continuously with available grid
//         width down to 80px before wrapping, instead of staying fixed
//         at 130px until a column-count breakpoint forces a hard wrap.
// v0.0.8: Remove rows/min_rows from getGridOptions() so the section
//         sizes to the card's actual content height instead of a fixed
//         row count (was causing the card to stick out below its
//         section). Remove the fixed left/right margins added in v0.0.7
//         on .control-slider-host/.control-button-group - grid_options
//         in YAML now controls the card's outer width directly, so those
//         margins only got in the way of the slider's own min-width
//         shrink floor at narrow column counts.
// v0.0.7: Revert the ineffective width:100% approach. Instead give
//         .control-slider-host and .control-button-group explicit
//         margin-left/margin-right (real, non-percentage space, which
//         actually influences auto/content-based grid track sizing,
//         unlike a percentage width). Slider width stays 130px preferred,
//         with a new min-width: 80px shrink floor for narrow layouts.
// v0.0.6: Force the card to fill its assigned grid width (:host and
//         ha-card width: 100%) instead of shrink-wrapping to the fixed
//         130px slider. The slider itself stays the same fixed width;
//         .controls' existing align-items: center now centers it within
//         the wider card frame.
// v0.0.5: Add show_close_button (default false), show_history_button,
//         show_settings_button, show_details_button (default true each)
//         config options. Add :host { display: block; margin: 8px; }
//         so cards get spacing from each other and a correct default
//         display type.
// v0.0.4: Add getGridOptions() so the card declares its own default and
//         minimum size in the sections view's 12-column grid, instead of
//         relying on HA's fallback (full 12 columns) when this method is
//         absent.
// v0.0.3: Add browser console version banner.
// v0.0.2: Add show_control_switch_buttons, default_control, and
//         show_favorites config options.
// v0.0.1: Initial release. New project derived from vertical-cover-slider-card:
//         standalone dashboard card registration, mode/fill_direction config
//         (replaces invert), configurable favorite_positions, show_name and
//         show_label toggles, getStubConfig.

// --- MDI icon paths ----------------------------------------------------------
const ICON_MENU =
  'M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z';
const ICON_SWAP_VERTICAL =
  'M9,3L5,7H8V14H10V7H13M16,17V10H14V17H11L15,21L19,17H16Z';
const ICON_ARROW_UP =
  'M13,20H11V8L5.5,13.5L4.08,12.08L12,4.16L19.92,12.08L18.5,13.5L13,8V20Z';
const ICON_ARROW_DOWN =
  'M11,4H13V16L18.5,10.5L19.92,11.92L12,19.84L4.08,11.92L5.5,10.5L11,16V4Z';
const ICON_ARROW_EXPAND_HORIZONTAL =
  'M9,11H15V8L19,12L15,16V13H9V16L5,12L9,8V11Z';
const ICON_ARROW_COLLAPSE_HORIZONTAL =
  'M13,20H11V14H5V16L1,12L5,8V10H11V4H13V10H19V8L23,12L19,16V14H13V20Z';
const ICON_STOP = 'M18,18H6V6H18V18Z';

// --- Console log ---------------------------------------------------------------
console.info(
  `%c CHRONO-%cSLIDER%c-CARD %c v${CARD_VERSION} `,
  'background-color: #101010; color: #FFFFFF; font-weight: bold; padding: 2px 0 2px 4px; border-radius: 3px 0 0 3px;',
  'background-color: #101010; color: #4676d3; font-weight: bold; padding: 2px 0;',
  'background-color: #101010; color: #FFFFFF; font-weight: bold; padding: 2px 4px 2px 0;',
  'background-color: #1E1E1E; color: #FFFFFF; font-weight: bold; padding: 2px 4px; border-radius: 0 3px 3px 0;'
);

// --- Constants -----------------------------------------------------------------
const UNAVAILABLE = 'unavailable';

// These must match the CSS custom properties in static styles below:
// --control-slider-thickness: 130px, --handle-margin: thickness/8, --handle-size: 4px
const HANDLE_MARGIN_PX = 130 / 8;
const HANDLE_SIZE_PX = 4;

// Two complete named default blocks, one per mode. Every configurable
// default lives here as a key/value pair - nothing is hardcoded
// elsewhere in the file. "cover" matches native HA (value 100/OPEN at
// top, fill shrinks as the value increases). "awning" matches the
// "cloth of the awning" model (value 100/OPEN at bottom, fill grows
// top-down as the value increases). Differs from vertical-slider-card's
// MODE_DEFAULTS only in show_control_switch_buttons (false here, was
// true there - explicit v1.0.20 decision, see version history above).
const MODE_DEFAULTS = {
  cover: {
    fill_direction: 'retracts',
    default_control: 'slider',
    show_name: true,
    show_state: true,
    show_last_changed: true,
    show_percentage: true,
    show_control_switch_buttons: false,
    show_favorites: true,
    favorite_positions: [0, 25, 75, 100],
  },
  awning: {
    fill_direction: 'extends',
    default_control: 'slider',
    show_name: true,
    show_state: true,
    show_last_changed: true,
    show_percentage: true,
    show_control_switch_buttons: false,
    show_favorites: true,
    favorite_positions: [0, 25, 75, 100],
  },
};

// --- Generic csc-prefixed helper functions (pure, DOM-free) --------------------
// Ported near-verbatim from vertical-slider-card - no dependency on the
// old rendering approach, so no rewrite needed.

function cscComputeOpenIcon(entity) {
  switch (entity.attributes.device_class) {
    case 'awning':
    case 'door':
    case 'gate':
    case 'curtain':
      return ICON_ARROW_EXPAND_HORIZONTAL;
    default:
      return ICON_ARROW_UP;
  }
}
function cscComputeCloseIcon(entity) {
  switch (entity.attributes.device_class) {
    case 'awning':
    case 'door':
    case 'gate':
    case 'curtain':
      return ICON_ARROW_COLLAPSE_HORIZONTAL;
    default:
      return ICON_ARROW_DOWN;
  }
}

function cscIsFullyOpenCover(entity) {
  if (entity.attributes.current_position !== undefined) {
    return entity.attributes.current_position === 100;
  }
  return entity.state === 'open';
}
function cscIsFullyClosedCover(entity) {
  if (entity.attributes.current_position !== undefined) {
    return entity.attributes.current_position === 0;
  }
  return entity.state === 'closed';
}
function cscIsOpeningCover(entity) {
  return entity.state === 'opening';
}
function cscIsClosingCover(entity) {
  return entity.state === 'closing';
}
function cscCanOpenCover(entity) {
  if (entity.state === UNAVAILABLE) return false;
  const assumedState = entity.attributes.assumed_state === true;
  return assumedState || (!cscIsFullyOpenCover(entity) && !cscIsOpeningCover(entity));
}
function cscCanCloseCover(entity) {
  if (entity.state === UNAVAILABLE) return false;
  const assumedState = entity.attributes.assumed_state === true;
  return assumedState || (!cscIsFullyClosedCover(entity) && !cscIsClosingCover(entity));
}
function cscCanStopCover(entity) {
  return entity.state !== UNAVAILABLE;
}

function cscStateActiveCover(compareState) {
  if (compareState === 'unavailable' || compareState === 'unknown') return false;
  if (compareState === 'off') return false;
  return compareState !== 'closed';
}

function cscSlugifyState(state) {
  return String(state).toLowerCase();
}

function cscDomainColorPropertiesCover(deviceClass, compareState, active) {
  const properties = [];
  const stateKey = cscSlugifyState(compareState);
  const activeKey = active ? 'active' : 'inactive';
  if (deviceClass) {
    properties.push(`--state-cover-${deviceClass}-${stateKey}-color`);
  }
  properties.push(
    `--state-cover-${stateKey}-color`,
    `--state-cover-${activeKey}-color`,
    `--state-${activeKey}-color`
  );
  return properties;
}

function cscComputeCssVariable(props) {
  return props.reduceRight((str, v) => `var(${v}${str ? `, ${str}` : ''})`, undefined);
}

function cscStateColorCssCover(entityState, deviceClass, forcedState) {
  const compareState = forcedState !== undefined ? forcedState : entityState;
  if (compareState === 'unavailable') return 'var(--state-unavailable-color)';
  const active = cscStateActiveCover(compareState);
  return cscComputeCssVariable(cscDomainColorPropertiesCover(deviceClass, compareState, active));
}

function cscNormalizeFavoritePositions(positions) {
  if (!positions) return [];
  const unique = new Set();
  const normalized = [];
  for (const position of positions) {
    const value = Number(position);
    if (isNaN(value)) continue;
    const clamped = Math.max(0, Math.min(100, value));
    if (unique.has(clamped)) continue;
    unique.add(clamped);
    normalized.push(clamped);
  }
  return normalized;
}

function cscRelativeTimeText(dateString) {
  const then = new Date(dateString).getTime();
  const now = Date.now();
  const diffSeconds = Math.round((now - then) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const table = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];
  for (const [unit, secondsInUnit] of table) {
    if (Math.abs(diffSeconds) >= secondsInUnit || unit === 'second') {
      const value = Math.round(diffSeconds / secondsInUnit);
      return rtf.format(-value, unit);
    }
  }
  return '';
}

// --- Editor field helper functions --------------------------------------------

// Converts a snake_case string to kebab-case. Used for both class names and
// CSS property names coming from config.styles, since CSS text treats them
// identically syntactically.
function cscToKebab(str) {
  return String(str).replace(/_/g, '-');
}

// Converts config.styles (a flat { class_name: { property: value } } object)
// into a single ready-to-inject CSS text block. No validation of class names
// or property names against anything - any key the user writes is accepted
// and converted as-is; this is a literal YAML->CSS translation, not a
// filtered one.
function cscBuildUserStylesCss(stylesConfig) {
  let css = '';
  for (const [className, props] of Object.entries(stylesConfig)) {
    if (!props || typeof props !== 'object' || Array.isArray(props)) continue;
    const declarations = Object.entries(props)
      .map(([prop, value]) => `${cscToKebab(prop)}: ${value};`)
      .join(' ');
    css += `.${cscToKebab(className)} { ${declarations} }\n`;
  }
  return css;
}

function cscTextField(label, value, onChange, opts = {}) {
  return html`
    <div class="csc-field">
      <label>${label}</label>
      <chrono-csc-textfield
        .value=${String(value ?? '')}
        type=${opts.type ?? 'text'}
        step=${opts.step ?? ''}
        min=${opts.min ?? ''}
        max=${opts.max ?? ''}
        placeholder=${opts.placeholder ?? ''}
        @input=${onChange}
      ></chrono-csc-textfield>
    </div>
  `;
}

function cscToggleField(label, checked, onChange) {
  return html`
    <div class="csc-toggle-field">
      <label>${label}</label>
      <ha-switch .checked=${checked} @change=${onChange}></ha-switch>
    </div>
  `;
}

function cscSelectField(label, value, options, onChange) {
  return html`
    <div class="csc-field">
      <label>${label}</label>
      <chrono-csc-select
        .value=${value ?? ''}
        .options=${options}
        @change=${onChange}
      ></chrono-csc-select>
    </div>
  `;
}

// --- chrono-csc-textfield component ---------------------------------------------
// Shadow-DOM text input wrapper. Uses the live() directive so a
// reactive re-render never resets the cursor position mid-typing - a
// previously-solved bug in the chrono-* family (see
// chrono-markdown-card v0.1.24), deliberately kept here rather than
// reintroduced.
class CscTextfield extends LitElement {
  static properties = {
    value: { type: String },
    type: { type: String },
    step: { type: String },
    min: { type: String },
    max: { type: String },
    placeholder: { type: String },
  };

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }
    input {
      display: block;
      width: 100%;
      box-sizing: border-box;
      height: 56px;
      padding: 0 12px;
      background: var(--input-fill-color, rgba(0, 0, 0, 0.06));
      border: none;
      border-bottom: 1px solid var(--secondary-text-color, #888);
      border-radius: 4px 4px 0 0;
      color: var(--primary-text-color);
      font-size: 16px;
      font-family: inherit;
      outline: none;
      transition: border-bottom-color 0.2s;
    }
    input:focus {
      border-bottom: 2px solid var(--primary-color);
    }
  `;

  render() {
    return html`
      <input
        .value=${live(this.value ?? '')}
        type=${this.type ?? 'text'}
        step=${this.step ?? ''}
        min=${this.min ?? ''}
        max=${this.max ?? ''}
        placeholder=${this.placeholder ?? ''}
        @input=${(e) => {
          this.value = e.target.value;
          this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        }}
      >
    `;
  }
}
customElements.define('chrono-csc-textfield', CscTextfield);

// --- chrono-csc-select component ------------------------------------------------
// Shadow-DOM styled combobox, ported from chrono-markdown-card's
// chrono-cm-select (CmSelect): dropdown, chevron, keyboard nav
// (Arrow/Enter/Escape), outside-click close. Deliberately NOT a
// straight port: CmSelect commits raw typed text as the value on every
// keystroke (freeform). This component restricts the committed value
// to the supplied options list only - typing filters/narrows the
// dropdown and moves the keyboard cursor to the best match; the value
// only commits via click, Enter on a highlighted option, or an exact
// (case-insensitive) label match on blur/tab-away/outside-click.
// Non-matching typed text reverts the display back to the last
// committed value.
class CscSelect extends LitElement {
  static properties = {
    value: { type: String },
    options: { type: Array },
    _open: { state: true },
    _cursor: { state: true },
    _filterText: { state: true },
  };

  static styles = css`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      position: relative;
    }

    .combobox {
      display: flex;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
      height: 56px;
      background: var(--input-fill-color, rgba(0, 0, 0, 0.06));
      border: none;
      border-bottom: 1px solid var(--secondary-text-color, #888);
      border-radius: 4px 4px 0 0;
      transition: border-bottom-color 0.2s;
    }

    .combobox:focus-within,
    .combobox-open {
      border-bottom: 2px solid var(--primary-color);
    }

    .combobox-input {
      flex: 1;
      height: 100%;
      padding: 0 8px 0 12px;
      background: transparent;
      border: none;
      color: var(--primary-text-color);
      font-size: 16px;
      font-family: inherit;
      outline: none;
      min-width: 0;
      box-sizing: border-box;
    }

    .combobox-chevron {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 100%;
      cursor: pointer;
      color: var(--secondary-text-color);
      font-size: 12px;
      flex-shrink: 0;
      user-select: none;
    }

    .combobox-chevron:hover {
      color: var(--primary-text-color);
    }

    .combobox-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 9999;
      background: var(--card-background-color, #1c1c1c);
      border: 1px solid var(--divider-color, #444);
      border-radius: 0 0 4px 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      max-height: 240px;
      overflow-y: auto;
      margin-top: 1px;
    }

    .combobox-option {
      padding: 10px 12px;
      font-size: 14px;
      font-family: inherit;
      color: var(--primary-text-color);
      cursor: pointer;
      transition: background 0.1s;
    }

    .combobox-option:hover {
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.08));
    }

    .combobox-option-selected {
      color: var(--primary-color);
    }

    .combobox-option-cursor {
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.08));
    }

    .combobox-option-empty {
      color: var(--secondary-text-color);
      cursor: default;
    }

    .combobox-option-empty:hover {
      background: transparent;
    }
  `;

  constructor() {
    super();
    this.value = '';
    this.options = [];
    this._open = false;
    this._cursor = -1;
    this._filterText = null;
    this._onOutsideClick = this._onOutsideClick.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._onOutsideClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onOutsideClick);
  }

  get _displayText() {
    if (this._filterText !== null) return this._filterText;
    const match = (this.options ?? []).find((o) => o.value === this.value);
    return match ? match.label : (this.value ?? '');
  }

  _filteredOptions() {
    const opts = this.options ?? [];
    if (this._filterText === null || this._filterText === '') return opts;
    const q = this._filterText.toLowerCase();
    return opts.filter((o) => o.label.toLowerCase().includes(q));
  }

  _onOutsideClick(e) {
    if (!this.shadowRoot.contains(e.composedPath()[0]) && e.composedPath()[0] !== this) {
      this._revertOrExactMatch();
    }
  }

  _commit(value) {
    this.value = value;
    this._filterText = null;
    this._open = false;
    this._cursor = -1;
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value },
      bubbles: true,
      composed: true,
    }));
  }

  _revertOrExactMatch() {
    if (this._filterText === null) {
      this._open = false;
      this._cursor = -1;
      return;
    }
    const q = this._filterText.toLowerCase();
    const exact = (this.options ?? []).find((o) => o.label.toLowerCase() === q);
    if (exact) {
      this._commit(exact.value);
    } else {
      this._filterText = null;
      this._open = false;
      this._cursor = -1;
    }
  }

  _toggleOpen() {
    if (this._open) {
      this._revertOrExactMatch();
    } else {
      this._open = true;
      this._cursor = -1;
      this.shadowRoot.querySelector('.combobox-input').focus();
    }
  }

  _handleInput(e) {
    this._filterText = e.target.value;
    this._open = true;
    const filtered = this._filteredOptions();
    this._cursor = filtered.length ? 0 : -1;
  }

  _handleKeyDown(e) {
    const filtered = this._filteredOptions();

    if (!this._open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        this._open = true;
        this._cursor = filtered.length ? 0 : -1;
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      this._cursor = Math.min(this._cursor + 1, filtered.length - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      this._cursor = Math.max(this._cursor - 1, 0);
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (this._cursor >= 0 && this._cursor < filtered.length) {
        this._commit(filtered[this._cursor].value);
      } else {
        this._revertOrExactMatch();
      }
      e.preventDefault();
    } else if (e.key === 'Escape') {
      this._filterText = null;
      this._open = false;
      this._cursor = -1;
      e.preventDefault();
    }
  }

  render() {
    const filtered = this._filteredOptions();

    return html`
      <div class="combobox ${this._open ? 'combobox-open' : ''}">
        <input
          class="combobox-input"
          .value=${live(this._displayText)}
          @input=${this._handleInput}
          @blur=${() => this._revertOrExactMatch()}
          @keydown=${this._handleKeyDown}
        >
        <div
          class="combobox-chevron"
          @click=${() => this._toggleOpen()}
          aria-hidden="true"
        >${this._open ? '▴' : '▾'}</div>
      </div>

      ${this._open ? html`
        <div class="combobox-dropdown">
          ${filtered.length ? filtered.map((opt, i) => html`
            <div
              class="combobox-option
                     ${opt.value === this.value ? 'combobox-option-selected' : ''}
                     ${i === this._cursor       ? 'combobox-option-cursor'   : ''}"
              @mousedown=${(e) => { e.preventDefault(); this._commit(opt.value); }}
            >${opt.label}</div>
          `) : html`<div class="combobox-option combobox-option-empty">No matches</div>`}
        </div>
      ` : ''}
    `;
  }
}
customElements.define('chrono-csc-select', CscSelect);

// --- Editor --------------------------------------------------------------------
class ChronoSliderCardEditor extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  setConfig(config) {
    this._config = config;
  }

  _emit() {
    this.dispatchEvent(
      new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true })
    );
  }

  _entityChanged(e) {
    if (!this._config) return;
    this._config = { ...this._config, entity: e.detail.value };
    this._emit();
  }

  _valueChanged(key, e) {
    if (!this._config) return;
    const raw = e.target.value ?? e.detail?.value;
    const next = { ...this._config };
    // Empty selection on fill_direction means "use the mode default" -
    // stored as an absent key, not a literal empty string, so
    // setConfig()'s MODE_DEFAULTS fallback applies cleanly.
    if (key === 'fill_direction' && raw === '') {
      delete next.fill_direction;
    } else {
      next[key] = raw;
    }
    this._config = next;
    this._emit();
  }

  _toggleChanged(key, e) {
    if (!this._config) return;
    this._config = { ...this._config, [key]: e.target.checked };
    this._emit();
  }

  _favoritePositionsChanged(e) {
    if (!this._config) return;
    const raw = e.target.value ?? '';
    const parsed = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '');
    this._config = { ...this._config, favorite_positions: cscNormalizeFavoritePositions(parsed) };
    this._emit();
  }

  static styles = css`
    .csc-field {
      margin-bottom: 16px;
    }
    .csc-field label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--secondary-text-color);
      margin-bottom: 4px;
    }
    .csc-toggle-field {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .csc-select-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      align-items: end;
    }
  `;

  render() {
    if (!this._config) return html``;
    const c = this._config;

    return html`
      <div class="csc-field">
        <label>Entity</label>
        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: 'cover' } }}
          .value=${c.entity ?? ''}
          @value-changed=${(e) => this._entityChanged(e)}
        ></ha-selector>
      </div>

      ${cscTextField('Name (optional)', c.name, (e) => this._valueChanged('name', e))}

      <div class="csc-select-row">
        ${cscSelectField(
          'Mode',
          c.mode ?? 'cover',
          [
            { value: 'cover', label: 'Cover' },
            { value: 'awning', label: 'Awning' },
          ],
          (e) => this._valueChanged('mode', e)
        )}
        ${cscSelectField(
          'Fill direction',
          c.fill_direction ?? '',
          [
            { value: '', label: '(mode default)' },
            { value: 'extends', label: 'Extends' },
            { value: 'retracts', label: 'Retracts' },
          ],
          (e) => this._valueChanged('fill_direction', e)
        )}
        ${cscSelectField(
          'Default control',
          c.default_control ?? 'slider',
          [
            { value: 'slider', label: 'Slider' },
            { value: 'buttons', label: 'Buttons' },
          ],
          (e) => this._valueChanged('default_control', e)
        )}
      </div>

      ${cscToggleField('Show name', c.show_name !== false, (e) => this._toggleChanged('show_name', e))}
      ${cscToggleField('Show state', c.show_state !== false, (e) => this._toggleChanged('show_state', e))}
      ${cscToggleField('Show percentage', c.show_percentage !== false, (e) =>
        this._toggleChanged('show_percentage', e)
      )}
      ${cscToggleField('Show last changed', c.show_last_changed !== false, (e) =>
        this._toggleChanged('show_last_changed', e)
      )}
      ${cscToggleField(
        'Show control switch buttons',
        c.show_control_switch_buttons === true,
        (e) => this._toggleChanged('show_control_switch_buttons', e)
      )}
      ${cscToggleField('Show favorites', c.show_favorites !== false, (e) => this._toggleChanged('show_favorites', e))}
      ${cscTextField(
        'Favorite positions (comma-separated %)',
        (c.favorite_positions ?? []).join(', '),
        (e) => this._favoritePositionsChanged(e)
      )}
    `;
  }
}
customElements.define('chrono-slider-card-editor', ChronoSliderCardEditor);

// --- Card ------------------------------------------------------------------------
class ChronoSliderCard extends LitElement {
  static properties = {
    _config: { state: true },
    _entity: { state: true },
    _relativeTime: { state: true },
    _toggleMode: { state: true },
  };

  static getStubConfig(hass) {
    const entities = hass && hass.states ? Object.keys(hass.states) : [];
    const firstCover = entities.find((id) => id.startsWith('cover.'));
    return {
      type: 'custom:chrono-slider-card',
      entity: firstCover || '',
    };
  }

  static getConfigElement() {
    return document.createElement('chrono-slider-card-editor');
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('You need to define an entity');
    }
    this._config = config;

    // mode selects the full default block below; each individual key,
    // if given explicitly in config, always overrides its mode default.
    this._mode = config.mode === 'awning' ? 'awning' : 'cover';
    const defaults = MODE_DEFAULTS[this._mode];

    this._fillDirection =
      config.fill_direction === 'extends' || config.fill_direction === 'retracts'
        ? config.fill_direction
        : defaults.fill_direction;

    this._showName = config.show_name !== undefined ? config.show_name === true : defaults.show_name;
    this._showState = config.show_state !== undefined ? config.show_state === true : defaults.show_state;
    this._showLastChanged =
      config.show_last_changed !== undefined ? config.show_last_changed === true : defaults.show_last_changed;
    this._showPercentage =
      config.show_percentage !== undefined ? config.show_percentage === true : defaults.show_percentage;

    this._favoritePositions = cscNormalizeFavoritePositions(
      Array.isArray(config.favorite_positions) && config.favorite_positions.length
        ? config.favorite_positions
        : defaults.favorite_positions
    );

    this._showControlSwitchButtons =
      config.show_control_switch_buttons !== undefined
        ? config.show_control_switch_buttons === true
        : defaults.show_control_switch_buttons;
    this._showFavorites =
      config.show_favorites !== undefined ? config.show_favorites === true : defaults.show_favorites;
    this._defaultControl =
      config.default_control === 'buttons' || config.default_control === 'slider'
        ? config.default_control
        : defaults.default_control;

    this._toggleMode = this._defaultControl === 'buttons' ? 'button' : 'position';
    this._dragging = false;
    this._dragValue = null;

    let stylesConfig = config.styles;
    if (stylesConfig !== undefined && (typeof stylesConfig !== 'object' || Array.isArray(stylesConfig))) {
      console.warn('chrono-slider-card: "styles" must be an object, ignoring.');
      stylesConfig = {};
    }
    this._userStylesCss = cscBuildUserStylesCss(stylesConfig || {});
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    const entity = hass.states[this._config.entity];
    if (!entity) return;
    this._entity = entity;
    if (!this._dragging) {
      this._relativeTime = cscRelativeTimeText(entity.last_changed);
    }
  }
  get hass() {
    return this._hass;
  }

  getCardSize() {
    return 6;
  }

  // Declares this card's default/min/max size in the sections view's
  // 12-column-per-section grid. rows/min_rows intentionally omitted -
  // hard-won lesson from vertical-slider-card v0.0.8: omitting them lets
  // the section size to the card's actual rendered height instead of a
  // fixed row count, which otherwise causes the card to stick out below
  // its section.
  getGridOptions() {
    return {
      columns: 4,
      min_columns: 3,
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._relativeTimeInterval = setInterval(() => {
      if (this._entity && !this._dragging) {
        this._relativeTime = cscRelativeTimeText(this._entity.last_changed);
      }
    }, 30000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._relativeTimeInterval) clearInterval(this._relativeTimeInterval);
    this._teardownDragListeners();
  }

  firstUpdated() {
    this._containerEl = this.renderRoot.querySelector('.container');
    this._sliderEl = this.renderRoot.querySelector('#slider');
    this._tooltipEl = this.renderRoot.querySelector('.tooltip');
  }

  _currentValue() {
    if (!this._entity) return null;
    const rawPosition =
      this._entity.attributes.current_position != null
        ? this._entity.attributes.current_position
        : this._entity.state === 'open'
        ? 100
        : 0;
    return this._fillDirection === 'retracts' ? 100 - rawPosition : rawPosition;
  }

  // ---- Slider drag handling ----
  // Imperative fast path: during an active drag, _paint() writes
  // directly to cached element refs (style.setProperty / textContent),
  // bypassing Lit's render/diff cycle entirely. Ported from
  // vertical-slider-card's _paint()/_valueFromEvent() - the position
  // math has no DOM dependency and needed no rewrite; only the
  // element-ref source changed (Lit's renderRoot instead of a raw
  // shadowRoot built from an HTML string).
  _valueFromEvent(e) {
    const rect = this._sliderEl.getBoundingClientRect();
    const sliderSize = rect.height - 2 * HANDLE_MARGIN_PX - HANDLE_SIZE_PX;
    const y = e.clientY - rect.top;
    const value = ((y - HANDLE_MARGIN_PX - HANDLE_SIZE_PX / 2) / sliderSize) * 100;
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  _paint(value) {
    const fraction = value / 100;
    if (this._containerEl) this._containerEl.style.setProperty('--value', fraction.toString());
    if (this._tooltipEl) this._tooltipEl.textContent = `${value}%`;
  }

  _onSliderPointerDown(e) {
    e.preventDefault();
    this._dragging = true;
    this._containerEl?.classList.add('pressed');
    this._tooltipEl?.classList.add('visible');
    this._dragValue = this._valueFromEvent(e);
    this._paint(this._dragValue);
    this._boundPointerMove = this._boundPointerMove || ((ev) => this._onPointerMove(ev));
    this._boundPointerUp = this._boundPointerUp || ((ev) => this._onPointerUp(ev));
    window.addEventListener('pointermove', this._boundPointerMove);
    window.addEventListener('pointerup', this._boundPointerUp);
    window.addEventListener('pointercancel', this._boundPointerUp);
  }

  _onPointerMove(e) {
    if (!this._dragging) return;
    this._dragValue = this._valueFromEvent(e);
    this._paint(this._dragValue);
  }

  _onPointerUp() {
    if (!this._dragging) return;
    this._dragging = false;
    this._containerEl?.classList.remove('pressed');
    this._tooltipEl?.classList.remove('visible');
    this._teardownDragListeners();
    const value = this._dragValue;
    this._dragValue = null;
    if (this._hass && this._config?.entity != null && value != null) {
      const rawValue = this._fillDirection === 'retracts' ? 100 - value : value;
      this._hass.callService('cover', 'set_cover_position', {
        entity_id: this._config.entity,
        position: rawValue,
      });
    }
    // No explicit re-render forced here: the last imperative _paint()
    // call already shows the correct value on screen, and the next
    // natural hass push (once HA confirms the new position) will
    // reconcile the declarative render - matching vertical-slider-card's
    // own behavior of not fighting the just-completed drag.
  }

  _teardownDragListeners() {
    if (this._boundPointerMove) window.removeEventListener('pointermove', this._boundPointerMove);
    if (this._boundPointerUp) {
      window.removeEventListener('pointerup', this._boundPointerUp);
      window.removeEventListener('pointercancel', this._boundPointerUp);
    }
  }

  // ---- Control actions ----
  _callDirectional(ourAction) {
    if (!this._hass || !this._entity) return;
    const rawAction = this._fillDirection === 'retracts' ? (ourAction === 'open' ? 'close' : 'open') : ourAction;
    const disabled = rawAction === 'open' ? !cscCanOpenCover(this._entity) : !cscCanCloseCover(this._entity);
    if (disabled) return;
    this._hass.callService('cover', `${rawAction}_cover`, { entity_id: this._config.entity });
  }

  _stopCover() {
    if (!this._hass || !this._entity) return;
    this._hass.callService('cover', 'stop_cover', { entity_id: this._config.entity });
  }

  _applyFavorite(pos) {
    if (!this._hass || !this._config?.entity) return;
    const rawValue = this._fillDirection === 'retracts' ? 100 - pos : pos;
    this._hass.callService('cover', 'set_cover_position', { entity_id: this._config.entity, position: rawValue });
  }

  _setToggleMode(mode) {
    this._toggleMode = mode;
  }

  // ---- Render ----
  render() {
    if (!this._config || !this._entity) return html``;
    const entity = this._entity;
    const value = this._currentValue();

    let stateWord = '';
    switch (entity.state) {
      case 'open':
        stateWord = 'Opened';
        break;
      case 'closed':
        stateWord = 'Closed';
        break;
      case 'opening':
        stateWord = 'Opening';
        break;
      case 'closing':
        stateWord = 'Closing';
        break;
      default:
        stateWord = entity.state;
    }
    const deviceClass = entity.attributes.device_class;
    const openColor = cscStateColorCssCover(entity.state, deviceClass, 'open');
    const color = cscStateColorCssCover(entity.state, deviceClass);

    const rawOpenAction = this._fillDirection === 'retracts' ? 'close' : 'open';
    const rawCloseAction = this._fillDirection === 'retracts' ? 'open' : 'close';
    const openDisabled = rawOpenAction === 'open' ? !cscCanOpenCover(entity) : !cscCanCloseCover(entity);
    const closeDisabled = rawCloseAction === 'open' ? !cscCanOpenCover(entity) : !cscCanCloseCover(entity);
    const stopDisabled = !cscCanStopCover(entity);

    // Our "open" means extend/block-sun - the opposite of what
    // computeOpenIcon assumes (native's "open" = retract = up-arrow), so
    // the glyph shown on our open/close buttons is intentionally swapped,
    // matching the same inversion applied everywhere else in this card.
    const openIconPath = cscComputeCloseIcon(entity);
    const closeIconPath = cscComputeOpenIcon(entity);

    const title = this._showName
      ? this._config.name || entity.attributes.friendly_name || this._config.entity
      : '';

    return html`
      <ha-card class="ha-card">
        <style>${this._userStylesCss}</style>
        ${this._showName ? html`<p class="card-title">${title}</p>` : ''}

        <div class="state-header">
          ${this._showState ? html`<p class="state">${stateWord}</p>` : ''}
          ${this._showPercentage ? html`<p class="percentage">${value}%</p>` : ''}
          ${this._showLastChanged
            ? html`
                <div class="time-row">
                  <p class="last-changed">${this._relativeTime ?? ''}</p>
                </div>
              `
            : ''}
        </div>

        <div class="controls">
          <div class="main-control">
            <div
              class=${classMap({ 'control-slider-host': true, active: this._toggleMode === 'position' })}
              style=${styleMap({
                '--state-cover-inactive-color': openColor,
                '--control-slider-color': color,
                '--control-slider-background': color,
              })}
            >
              <div
                class="container"
                style=${styleMap({ '--value': (value / 100).toString() })}
                @pointerdown=${(e) => this._onSliderPointerDown(e)}
              >
                <div id="slider" class="slider" role="slider" tabindex="0" aria-orientation="vertical">
                  <div class="slider-track-background"></div>
                  <div class="slider-track-bar show-handle"></div>
                </div>
                <span class="tooltip"></span>
              </div>
            </div>
            <div class=${classMap({ 'control-button-group': true, active: this._toggleMode === 'button' })}>
              <button
                class=${classMap({ 'control-btn': true, 'control-btn-close': true, disabled: closeDisabled })}
                @click=${() => this._callDirectional('close')}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24"><path d=${closeIconPath}></path></svg>
              </button>
              <button
                class=${classMap({ 'control-btn': true, 'control-btn-stop': true, disabled: stopDisabled })}
                @click=${() => this._stopCover()}
                aria-label="Stop"
              >
                <svg viewBox="0 0 24 24"><path d=${ICON_STOP}></path></svg>
              </button>
              <button
                class=${classMap({ 'control-btn': true, 'control-btn-open': true, disabled: openDisabled })}
                @click=${() => this._callDirectional('open')}
                aria-label="Open"
              >
                <svg viewBox="0 0 24 24"><path d=${openIconPath}></path></svg>
              </button>
            </div>
          </div>
          ${this._showControlSwitchButtons
            ? html`
                <div class="icon-button-group">
                  <button
                    class=${classMap({
                      'icon-toggle-button': true,
                      'icon-toggle-button-position': true,
                      selected: this._toggleMode === 'position',
                    })}
                    @click=${() => this._setToggleMode('position')}
                    aria-label="Position mode"
                  >
                    <svg viewBox="0 0 24 24"><path d=${ICON_MENU}></path></svg>
                  </button>
                  <button
                    class=${classMap({
                      'icon-toggle-button': true,
                      'icon-toggle-button-button': true,
                      selected: this._toggleMode === 'button',
                    })}
                    @click=${() => this._setToggleMode('button')}
                    aria-label="Button mode"
                  >
                    <svg viewBox="0 0 24 24"><path d=${ICON_SWAP_VERTICAL}></path></svg>
                  </button>
                </div>
              `
            : ''}
        </div>

        ${this._showFavorites
          ? html`
              <div class="favorites-groups">
                <div class="favorites-group">
                  <section class="favorites-container">
                    ${this._favoritePositions.map(
                      (pos) => html`
                        <div
                          class=${classMap({
                            'favorite-button': true,
                            [`favorite-button-${pos}`]: true,
                            active: pos === value,
                          })}
                          @click=${() => this._applyFavorite(pos)}
                        >
                          <div class="button-inner"><span class="button-label">${pos}%</span></div>
                        </div>
                      `
                    )}
                  </section>
                </div>
              </div>
            `
          : ''}
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      display: block;
      margin: 8px;
    }
    ha-card {
      box-sizing: border-box;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* ---- Title ---- */
    .card-title {
      align-self: flex-start;
      margin: 0 0 var(--ha-space-4, 16px) 0;
      font-size: var(--ha-font-size-xl, 1.25rem);
      line-height: var(--ha-line-height-condensed, 1.2);
      font-weight: var(--ha-font-weight-medium, 500);
      color: var(--primary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 100%;
    }

    /* ---- State + relative-time label ---- */
    .state-header {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .state-header p {
      margin: 0;
      text-align: center;
    }
    .state {
      font-style: normal;
      font-weight: var(--ha-font-weight-normal, 400);
      font-size: 32px;
      line-height: var(--ha-line-height-condensed, 1.2);
    }
    .percentage {
      font-style: normal;
      font-size: var(--ha-font-size-l, 16px);
      font-weight: var(--ha-font-weight-medium, 500);
      line-height: var(--ha-line-height-normal, 1.5);
      padding: var(--ha-space-1, 4px) 0;
    }
    .time-row {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--ha-space-5, 20px);
    }
    .last-changed {
      font-style: normal;
      font-size: var(--ha-font-size-l, 16px);
      font-weight: var(--ha-font-weight-medium, 500);
      line-height: var(--ha-line-height-normal, 1.5);
      letter-spacing: 0.1px;
      padding: var(--ha-space-1, 4px) 0;
    }

    /* ---- Controls layout ---- */
    .controls {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      width: 100%;
    }
    .controls:not(:last-child) {
      margin-bottom: var(--ha-space-6, 24px);
    }
    .controls > *:not(:last-child) {
      margin-bottom: var(--ha-space-6, 24px);
    }
    .main-control {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      width: 100%;
    }
    .main-control > * {
      margin: 0 var(--ha-space-2, 8px);
    }

    /* ---- Directional button group (close/stop/open) ---- */
    .control-button-group {
      height: 45vh;
      max-height: 320px;
      min-height: 200px;
      width: 100px;
      display: none;
      flex-direction: column;
    }
    .control-button-group.active {
      display: flex;
    }
    .control-button-group > *:not(:last-child) {
      margin-bottom: 10px;
    }
    .control-btn {
      position: relative;
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      border-radius: var(--ha-border-radius-6xl, 9999px);
      overflow: hidden;
      cursor: pointer;
      color: var(--primary-text-color);
      -webkit-tap-highlight-color: transparent;
      border: none;
      padding: var(--control-button-padding, 8px);
      background: none;
      font: inherit;
    }
    .control-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      background-color: var(--disabled-color);
      opacity: 0.2;
      transition: background-color 180ms ease-in-out, opacity 180ms ease-in-out;
      pointer-events: none;
    }
    .control-btn svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
      position: relative;
      z-index: 1;
    }
    .control-btn:focus-visible {
      box-shadow: 0 0 0 2px var(--secondary-text-color);
    }
    .control-btn.disabled {
      cursor: not-allowed;
      color: var(--disabled-text-color, #6f6f6f);
    }
    .control-btn.disabled::before {
      opacity: 0.2;
    }

    /* ---- Slider ---- */
    .control-slider-host {
      display: none;
      --control-slider-color: var(--primary-color);
      --control-slider-background: var(--disabled-color);
      --control-slider-background-opacity: 0.2;
      --control-slider-thickness: 130px;
      --control-slider-border-radius: var(--ha-border-radius-6xl, 9999px);
      height: 45vh;
      max-height: 320px;
      min-height: 200px;
      width: 100%;
      min-width: 80px;
      max-width: var(--control-slider-thickness);
    }
    .control-slider-host.active {
      display: block;
    }
    .container {
      position: relative;
      height: 100%;
      width: 100%;
      --handle-size: 4px;
      --handle-margin: calc(var(--control-slider-thickness) / 8);
    }
    .slider {
      position: relative;
      height: 100%;
      width: 100%;
      border-radius: var(--control-slider-border-radius);
      transform: translateZ(0);
      transition: box-shadow 180ms ease-in-out;
      outline: none;
      overflow: hidden;
      cursor: pointer;
      touch-action: none;
    }
    .slider:focus-visible {
      box-shadow: 0 0 0 2px var(--control-slider-color);
    }
    .slider-track-background {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      background: var(--control-slider-background);
      opacity: var(--control-slider-background-opacity);
    }
    .slider-track-bar {
      --slider-size: 100%;
      position: absolute;
      height: 100%;
      width: 100%;
      background-color: var(--control-slider-color);
      transition: transform 180ms ease-in-out, background-color 180ms ease-in-out;
    }
    .slider-track-bar.show-handle {
      --slider-size: calc(100% - 2 * var(--handle-margin) - var(--handle-size));
    }
    .slider-track-bar {
      --slider-track-bar-border-radius: min(
        var(--control-slider-border-radius),
        var(--ha-border-radius-md, 12px)
      );
      top: 0;
      left: 0;
      border-radius: var(--slider-track-bar-border-radius);
      /* Fill grows top-down as value increases, so the visible boundary
         moves the same direction as the drag (down = more open). */
      transform: translate3d(0, calc((var(--value, 0) - 1) * var(--slider-size)), 0);
    }
    .slider-track-bar::after {
      display: block;
      content: '';
      position: absolute;
      margin: auto;
      border-radius: var(--handle-size);
      background-color: white;
      bottom: var(--handle-margin);
      top: initial;
      right: 0;
      left: 0;
      width: 50%;
      height: var(--handle-size);
    }
    .pressed .slider-track-bar {
      transition: none;
    }
    .tooltip {
      pointer-events: none;
      user-select: none;
      position: absolute;
      background-color: var(--clear-background-color, #212121);
      color: var(--primary-text-color);
      font-size: var(--ha-font-size-xl, 20px);
      border-radius: var(--ha-border-radius-lg, 12px);
      padding: 0.2em 0.4em;
      opacity: 0;
      white-space: nowrap;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      transition: opacity 180ms ease-in-out, top 180ms ease-in-out;
      left: -4px;
      transform: translate3d(-100%, -50%, 0);
      --handle-spacing: calc(2 * var(--handle-margin) + var(--handle-size));
      --slider-tooltip-range: calc(100% - var(--handle-spacing));
      --slider-tooltip-offset: calc(0.5 * var(--handle-spacing));
      --slider-tooltip-position: calc(
        min(max(var(--value, 0) * var(--slider-tooltip-range) + var(--slider-tooltip-offset), 0%), 100%)
      );
      top: var(--slider-tooltip-position);
    }
    .tooltip.visible {
      opacity: 1;
    }

    /* ---- Slider<->buttons mode-toggle icons ---- */
    .icon-button-group {
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: center;
      height: 48px;
      border-radius: var(--ha-border-radius-4xl, 9999px);
      background-color: rgba(139, 145, 151, 0.1);
      box-sizing: border-box;
      width: auto;
      padding: 0;
    }
    .icon-toggle-button {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      margin: 4px;
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      color: var(--primary-text-color);
      -webkit-tap-highlight-color: transparent;
    }
    .icon-toggle-button svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
      position: relative;
      z-index: 1;
    }
    .icon-toggle-button::before {
      content: '';
      opacity: 0;
      transition: opacity 180ms ease-in-out;
      background-color: var(--primary-text-color);
      border-radius: var(--ha-border-radius-2xl, 16px);
      height: 40px;
      width: 40px;
      position: absolute;
      top: -10px;
      left: -10px;
      bottom: -10px;
      right: -10px;
      margin: auto;
      box-sizing: border-box;
    }
    .icon-toggle-button.selected {
      color: var(--primary-background-color);
    }
    .icon-toggle-button.selected::before {
      opacity: 1;
    }
    @media (hover: hover) {
      .icon-toggle-button:not(.selected):hover::before {
        opacity: 0.1;
      }
    }

    /* ---- Favorite-position buttons ---- */
    .favorites-groups {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ha-space-3, 12px);
      width: 100%;
    }
    .favorites-group {
      width: 100%;
      max-width: 384px;
      margin: 0;
    }
    .favorites-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: -8px;
      flex-wrap: wrap;
      max-width: 384px;
      user-select: none;
    }
    .favorites-container > * {
      margin: 8px;
    }
    .favorite-button {
      display: block;
      position: relative;
      width: 72px;
      height: 36px;
      box-sizing: border-box;
      color: var(--primary-text-color);
      -webkit-tap-highlight-color: transparent;
      cursor: pointer;
    }
    .button-inner {
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      text-align: center;
      width: 100%;
      height: 100%;
      border-radius: var(--ha-border-radius-pill, 9999px);
      border: none;
      margin: 0;
      padding: 8px;
      box-sizing: border-box;
      font-family: var(--ha-font-family-body, inherit);
      font-weight: var(--ha-font-weight-medium, 500);
      font-size: inherit;
      outline: none;
      background: none;
      z-index: 0;
      color: inherit;
      transition: box-shadow 180ms ease-in-out, color 180ms ease-in-out;
    }
    .button-inner::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      background-color: var(--disabled-color);
      transition: background-color 180ms ease-in-out, opacity 180ms ease-in-out;
      opacity: 0.2;
      pointer-events: none;
    }
    .button-label {
      position: relative;
      z-index: 1;
      opacity: 0.95;
    }
    .favorite-button.active .button-inner::before {
      background-color: var(--state-cover-active-color, var(--primary-color));
    }
  `;
}
customElements.define('chrono-slider-card', ChronoSliderCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'chrono-slider-card',
  name: 'Chrono Slider Card',
  description:
    'Standalone dashboard card for cover-domain entities (blinds, shades, screens, awnings) with configurable mode (cover/awning) and fill_direction (extends/retracts).',
  preview: true,
});

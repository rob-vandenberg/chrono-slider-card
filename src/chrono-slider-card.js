/**
 * chrono-slider-card
 *
 * Home Assistant Lovelace dashboard card for controlling a single
 * cover-domain entity (blind, shade, screen, awning, etc.) via a
 * vertical slider, directional buttons, and configurable favorite
 * positions. Handles the mismatch between HA's raw open/closed axis
 * and each device's own physical "open" direction through a 3-way
 * device_type preset, and supports per-element visual overrides via
 * the styles: config block.
 */

import { LitElement, html, css } from 'https://unpkg.com/lit@2.0.0/index.js?module';
import { styleMap }              from 'https://unpkg.com/lit@2.0.0/directives/style-map.js?module';
import { classMap }              from 'https://unpkg.com/lit@2.0.0/directives/class-map.js?module';
import { live }                  from 'https://unpkg.com/lit@2.0.0/directives/live.js?module';
import { unsafeHTML }            from 'https://unpkg.com/lit@2.0.0/directives/unsafe-html.js?module';

// --- Version ---------------------------------------------------------------
const CARD_VERSION = '1.7.63';

// --- Version History ---------------------------------------------------------
// v1.7.63: Fixed handle-margin drift - _valueFromEvent() used a fixed
//          HANDLE_MARGIN_PX literal for drag math, which went stale
//          whenever --slider-min-width/--slider-max-width were overridden
//          via styles: (the CSS side already tracked them live since
//          v1.6.61). Now reads both live at drag start instead. Also
//          renamed _containerEl/_sliderEl/_tooltipEl to
//          _sliderContainerElement/_sliderElement/_tooltipElement.
// v1.6.62: Full CSS naming overhaul. Every remaining --ha-* theme-token
//          reference replaced with our own named, literal-default variable
//          (title/state/percentage/last-changed/controls/tooltip/icon-toggle/
//          control-button/favorite-button). control-btn renamed to
//          control-button throughout for btn/button consistency. The three
//          ::before overlay pseudo-elements (control button, icon-toggle,
//          favorite button) replaced with real child elements
//          (control-button-overlay, icon-toggle-overlay,
//          favorite-button-overlay), making them addressable via styles:.
// v1.6.61: --slider-thickness renamed to --slider-max-width, paired with new
//          --slider-min-width (both now real, addressable variables instead
//          of one variable + a hardcoded 80px literal). --handle-margin now
//          derived from whichever of the two actually wins the width
//          tug-of-war, fixing the handle-margin mismatch when
//          --slider-max-width is configured below --slider-min-width.
// v1.6.60: Header comment block cut down to a short description; version
//          history condensed to 1-2 lines per entry, all v1.2.x and older
//          entries (including the vertical-slider-card lineage section)
//          removed entirely.
// v1.5.59: Missing/not-found entity now shows HA's hui-warning box instead of
//          collapsing to zero height.
// v1.5.58: Removed legacy HA-native border-radius clamp on .slider-track-bar;
//          now follows --slider-border-radius directly.
// v1.5.57: Fixed directional buttons calling the wrong service for
//          device_open_state:true entities; each button now has one fixed identity.
// v1.5.56: Slider/buttons toggle choice now persists per entity per browser via
//          localStorage.
// v1.5.55: Fixed directional buttons calling the wrong HA service - open_cover/
//          close_cover now called unconditionally by button position.
// v1.5.54: Fixed directional button icons - top always up, bottom always down,
//          unconditionally.
// v1.5.53: Opened/Closed text now switches near the closed extreme (threshold-
//          based), not only at the exact extreme.
// v1.4.52: Literal \n in the name field now forces a title line break; spaces no
//          longer auto-wrap.
// v1.4.51: .title no longer hard-truncates - reworked to shrink-wrap and center
//          like .state-header.
// v1.4.50: styles: gained a reserved 'host' key to target the card's own :host
//          element.
// v1.4.49: Fixed Opened/Closed text for partial positions - now derived from
//          current_position, not entity.state.
// v1.4.48: Removed the internal favorite_positions fallback; config is now the
//          only source of truth.
// v1.4.47: Title is now centered by default.
// v1.4.46: Renamed the title element's classname from card-title to title.
// v1.3.45: Removed the unused getGridOptions() default columns value; min_columns:3
//          stays.
// v1.3.44: Moved remaining hardcoded literals out of method bodies into the
//          Constants section.
// v1.3.43: Corrected v1.3.42 - restored --state-cover-inactive-color/openColor,
//          mistakenly removed as dead code.
// v1.3.42: Renamed --control-slider-* properties to --slider-*; moved state-driven
//          color off inline style so styles: can override it. Handle is now a
//          real, addressable element.
// v1.3.41: Fixed styles: at its actual cause - user CSS now uses an adopted
//          stylesheet instead of a losing inline <style> tag.
// v1.3.40: Corrected the awning preset's device_open_state so "Open" shows at
//          the physically correct extreme.
// v1.3.39: Removed invert_position; corrected device-type presets; slider fill
//          now driven independently from the displayed percentage.

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

// How often the relative-time label ("3 hours ago") re-renders itself -
// see connectedCallback(). Not tied to any config option.
const RELATIVE_TIME_REFRESH_INTERVAL_MS = 30000;

// Must match .slider-container's --handle-size: 4px in static styles below
// (a fixed literal, not exposed as an overridable variable the way
// --slider-min-width/--slider-max-width are).
const HANDLE_SIZE_PX = 4;

// Device-type preset table. Each of the 3 device-behavior booleans is
// defined relative to the device being fully retracted (raw HA
// current_position === 100, verified platform-wide, independent of
// device_class). "cover" matches native HA's own unmodified
// convention. Any of the 3 keys can be overridden individually via a
// raw YAML key in the card config - never exposed in the visual
// editor, which only ever offers the 3-way device_type picker.
const DEVICE_TYPE_DEFAULTS = {
  cover: {
    device_open_state: true,
    device_open_percentage: true,
    device_open_slider: true,
  },
  screen: {
    device_open_state: true,
    device_open_percentage: false,
    device_open_slider: false,
  },
  awning: {
    device_open_state: false,
    device_open_percentage: false,
    device_open_slider: false,
  },
};

// Standalone config defaults, fully decoupled from device_type - each
// resolves to its own independent value in setConfig() regardless of
// which device type is selected. Values unchanged from the old
// MODE_DEFAULTS bundle (which happened to be identical between cover
// and awning for all of these already).
const DEFAULT_SHOW_NAME = true;
const DEFAULT_SHOW_STATE = true;
const DEFAULT_SHOW_LAST_CHANGED = true;
const DEFAULT_SHOW_PERCENTAGE = true;
const DEFAULT_SHOW_CONTROL_SWITCH_BUTTONS = false;
const DEFAULT_SHOW_FAVORITES = true;
const DEFAULT_CONTROL = 'slider';
const DEFAULT_FAVORITE_POSITIONS = [0, 25, 75, 100];

// Remembers the user's last-picked slider/buttons toggle across page
// reloads, per entity, per browser - via localStorage, not the card's own
// config. Deliberately NOT written back to config: this is UI state for
// the person currently looking at the dashboard, not a config change that
// should apply to everyone viewing the same dashboard. Keyed by entity so
// multiple chrono-slider-card instances don't collide.
const TOGGLE_MODE_STORAGE_PREFIX = 'chrono-slider-card-control-';
function cscToggleModeStorageKey(entityId) {
  return `${TOGGLE_MODE_STORAGE_PREFIX}${entityId}`;
}

// The Opened/Closed state text switches at this distance (in raw HA
// position points) from the closed extreme, rather than only at the
// exact extreme itself - see cscIsCoverStateClosed(). Only the state
// text uses this; button enable/disable (cscCanOpenCover) always uses
// the exact extreme, unaffected by this constant.
const OPEN_CLOSE_THRESHOLD = 10;

// Card sizing within the dashboard view - see getCardSize()/
// getGridOptions(). Not currently exposed as config options (no YAML
// key reads these yet), unlike the DEFAULT_* values above.
const CARD_SIZE_HINT = 6;
const GRID_MIN_COLUMNS_DEFAULT = 3;

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

// deviceOpenState: true if raw HA current_position===100 (fully
// retracted) is this device's "open" end - see DEVICE_TYPE_DEFAULTS.
function cscIsOpeningCover(entity, deviceOpenState) {
  return entity.state === (deviceOpenState ? 'opening' : 'closing');
}

// Can the entity still move further open? Used for both directions:
// the close-button case calls this with deviceOpenState negated
// (cscCanOpenCover(entity, !deviceOpenState) is exactly "can it still
// move further closed" - the two questions are the same question with
// the open/closed convention flipped, which is exactly what negating
// deviceOpenState already means everywhere else in this file).
function cscCanOpenCover(entity, deviceOpenState) {
  if (entity.state === UNAVAILABLE) return false;
  const assumedState = entity.attributes.assumed_state === true;
  let isFullyOpen;
  if (entity.attributes.current_position !== undefined) {
    isFullyOpen = entity.attributes.current_position === (deviceOpenState ? 100 : 0);
  } else {
    isFullyOpen = entity.state === (deviceOpenState ? 'open' : 'closed');
  }
  return assumedState || (!isFullyOpen && !cscIsOpeningCover(entity, deviceOpenState));
}

// Generic: is value below threshold? No knowledge of covers, positions,
// or open/closed - purely a comparison, like min()/max(). The equal
// case is deliberately undefined by design (callers don't need to
// distinguish it) - see cscIsCoverStateClosed() for how a caller uses
// this asymmetry.
function cscIsBelowThreshold(value, threshold) {
  if (value < threshold) return true;
  return false;
}

// Is the entity within OPEN_CLOSE_THRESHOLD raw position points of the
// closed extreme? State-text use only (Opened/Closed) - not used for
// button enable/disable, which always needs the exact extreme
// (cscCanOpenCover), not a band.
function cscIsCoverStateClosed(entity, deviceOpenState) {
  if (entity.attributes.current_position !== undefined) {
    const pos = entity.attributes.current_position;
    if (deviceOpenState) return cscIsBelowThreshold(pos, OPEN_CLOSE_THRESHOLD);
    return !cscIsBelowThreshold(pos, 100 - OPEN_CLOSE_THRESHOLD);
  }
  return entity.state === (deviceOpenState ? 'closed' : 'open');
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

// Converts a literal backslash-n (two characters, as typed - not an actual
// newline) into a real newline character. Used wherever a user-typed config
// text value (e.g. name) is displayed as card content, so the user can force
// a line break at a specific point. Not applied to config.styles or any
// editor input value - this is a display-time transform, not a config
// transform: the config keeps the literal characters the user typed, so it
// round-trips through YAML unambiguously regardless of quoting style.
function cscExpandEscapedNewlines(text) {
  return String(text).replace(/\\n/g, '\n');
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
// filtered one. One reserved key: 'host' targets the card's own :host
// element (a pseudo-class, not a real class) instead of .host - there is
// no class="host" anywhere in this card's markup, so this can't collide.
function cscBuildUserStylesCss(stylesConfig) {
  let css = '';
  for (const [className, props] of Object.entries(stylesConfig)) {
    if (!props || typeof props !== 'object' || Array.isArray(props)) continue;
    const declarations = Object.entries(props)
      .map(([prop, value]) => `${cscToKebab(prop)}: ${value};`)
      .join(' ');
    const selector = className === 'host' ? ':host' : `.${cscToKebab(className)}`;
    css += `${selector} { ${declarations} }\n`;
  }
  return css;
}

function cscTextField(label, value, onChange, opts = {}) {
  return html`
    <div class="text-field">
      <label>${unsafeHTML(label)}</label>
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

function cscToggleField(label, checked, onChange, extraClass = '') {
  return html`
    <div class="toggle-field ${extraClass}">
      <label>${unsafeHTML(label)}</label>
      <ha-switch .checked=${checked} @change=${onChange}></ha-switch>
    </div>
  `;
}

function cscSelectField(label, value, options, onChange) {
  return html`
    <div class="text-field">
      <label>${unsafeHTML(label)}</label>
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
    this._config = { ...this._config, [key]: raw };
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
    /* Verbatim from chrono-markdown-card's .text-field / .toggle-field
       (cm/CmSelect prefix -> csc/CscSelect only - see v1.1.30 history). */
    .text-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .text-field label {
      font-size: 12px;
      font-weight: 600;
      color: var(--secondary-text-color);
      white-space: pre-line;
    }
    .toggle-field {
      display: flex;
      flex-direction: row;
      gap: 12px;
      align-items: center;
    }
    .toggle-field label {
      font-size: 12px;
      font-weight: 600;
      color: var(--secondary-text-color);
    }

    /* csc-specific: no cm equivalent - layout modifiers for .toggle-field,
       chosen per call site via cscToggleField()'s extraClass argument, not
       hardcoded in the field itself. Base .toggle-field (no modifier) stays
       verbatim cm: label first, tight gap.
       - toggle-field-narrow: switch first then label, tight gap - for
         multiple toggles side by side in one row, switches align to the
         left edge when stacked.
       - toggle-field-wide: label first, switch pushed to the right edge -
         for one toggle per row, switches align to the right edge when
         stacked. */
    .toggle-field-narrow {
      flex-direction: row-reverse;
    }
    .toggle-field-wide {
      justify-content: space-between;
    }

    /* csc-specific: cm lays multiple fields per row out in a CSS grid, whose
       row/gap rules also supply spacing between rows. This card's editor is a
       flat single-column list instead, so .text-field/.toggle-field/.select-row
       carry no margin of their own (kept verbatim) - this generic rule supplies
       the equivalent spacing between consecutive top-level field rows. */
    .text-field + .text-field,
    .text-field + .toggle-field,
    .text-field + .select-row,
    .toggle-field + .text-field,
    .toggle-field + .toggle-field,
    .toggle-field + .select-row,
    .select-row + .text-field,
    .select-row + .toggle-field {
      margin-top: 16px;
    }

    /* csc-specific: no cm equivalent - the Device type/Control row,
       using cm's own grid-row technique. */
    .select-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      align-items: end;
    }
  `;

  render() {
    if (!this._config) return html``;
    const c = this._config;

    return html`
      <div class="text-field">
        <label>Entity</label>
        <ha-selector
          .hass=${this.hass}
          .selector=${{ entity: { domain: 'cover' } }}
          .value=${c.entity ?? ''}
          @value-changed=${(e) => this._entityChanged(e)}
        ></ha-selector>
      </div>

      ${cscTextField('Name (optional)', c.name, (e) => this._valueChanged('name', e))}

      <div class="select-row">
        ${cscSelectField(
          'Device type',
          c.device_type ?? 'cover',
          [
            { value: 'cover', label: 'Cover' },
            { value: 'screen', label: 'Screen' },
            { value: 'awning', label: 'Awning' },
          ],
          (e) => this._valueChanged('device_type', e)
        )}
        ${cscSelectField(
          'Control',
          c.default_control ?? 'slider',
          [
            { value: 'slider', label: 'Slider' },
            { value: 'buttons', label: 'Buttons' },
          ],
          (e) => this._valueChanged('default_control', e)
        )}
      </div>

      ${cscToggleField('Show name', c.show_name !== false, (e) => this._toggleChanged('show_name', e), 'toggle-field-wide')}
      ${cscToggleField('Show state', c.show_state !== false, (e) => this._toggleChanged('show_state', e), 'toggle-field-wide')}
      ${cscToggleField('Show percentage', c.show_percentage !== false, (e) =>
        this._toggleChanged('show_percentage', e), 'toggle-field-wide'
      )}
      ${cscToggleField('Show last changed', c.show_last_changed !== false, (e) =>
        this._toggleChanged('show_last_changed', e), 'toggle-field-wide'
      )}
      ${cscToggleField(
        'Show control switch buttons',
        c.show_control_switch_buttons === true,
        (e) => this._toggleChanged('show_control_switch_buttons', e),
        'toggle-field-wide'
      )}
      ${cscToggleField('Show favorites', c.show_favorites !== false, (e) => this._toggleChanged('show_favorites', e), 'toggle-field-wide')}
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

  constructor() {
    super();
    // Two constructed sheets, adopted in firstUpdated() in this fixed
    // order (later = wins ties): _stateStyleSheet first, _userStyleSheet
    // last. _stateStyleSheet carries the entity-state-driven slider color
    // (updated via replaceSync() on every render() - it changes whenever
    // the entity's state does, unlike _userStyleSheet which only changes
    // on setConfig()). Neither is ever replaced as an object, only
    // mutated in place, so the adoptedStyleSheets push in firstUpdated()
    // stays valid for the component's lifetime.
    this._stateStyleSheet = new CSSStyleSheet();
    this._userStyleSheet = new CSSStyleSheet();
  }

  static getStubConfig(hass) {
    const entities = hass && hass.states ? Object.keys(hass.states) : [];
    const firstCover = entities.find((id) => id.startsWith('cover.'));
    return {
      type: 'custom:chrono-slider-card',
      entity: firstCover || '',
      favorite_positions: DEFAULT_FAVORITE_POSITIONS,
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

    // device_type selects the 3-boolean preset row below; each of the 3
    // keys, if given explicitly in config, always overrides its preset
    // default individually - the other 1-2 keys still come from the
    // preset untouched.
    this._deviceType =
      config.device_type === 'screen' || config.device_type === 'awning' ? config.device_type : 'cover';
    const devicePreset = DEVICE_TYPE_DEFAULTS[this._deviceType];

    this._deviceOpenState =
      config.device_open_state !== undefined ? config.device_open_state === true : devicePreset.device_open_state;
    this._deviceOpenPercentage =
      config.device_open_percentage !== undefined
        ? config.device_open_percentage === true
        : devicePreset.device_open_percentage;
    this._deviceOpenSlider =
      config.device_open_slider !== undefined ? config.device_open_slider === true : devicePreset.device_open_slider;

    // Standalone settings - independent of device_type entirely.
    this._showName = config.show_name !== undefined ? config.show_name === true : DEFAULT_SHOW_NAME;
    this._showState = config.show_state !== undefined ? config.show_state === true : DEFAULT_SHOW_STATE;
    this._showLastChanged =
      config.show_last_changed !== undefined ? config.show_last_changed === true : DEFAULT_SHOW_LAST_CHANGED;
    this._showPercentage =
      config.show_percentage !== undefined ? config.show_percentage === true : DEFAULT_SHOW_PERCENTAGE;

    this._favoritePositions = cscNormalizeFavoritePositions(config.favorite_positions);

    this._showControlSwitchButtons =
      config.show_control_switch_buttons !== undefined
        ? config.show_control_switch_buttons === true
        : DEFAULT_SHOW_CONTROL_SWITCH_BUTTONS;
    this._showFavorites =
      config.show_favorites !== undefined ? config.show_favorites === true : DEFAULT_SHOW_FAVORITES;
    this._defaultControl =
      config.default_control === 'buttons' || config.default_control === 'slider'
        ? config.default_control
        : DEFAULT_CONTROL;

    let storedControl = null;
    try {
      storedControl = window.localStorage.getItem(cscToggleModeStorageKey(config.entity));
    } catch (e) {
      storedControl = null;
    }
    const effectiveControl =
      storedControl === 'buttons' || storedControl === 'slider' ? storedControl : this._defaultControl;
    this._toggleMode = effectiveControl === 'buttons' ? 'button' : 'position';
    this._dragging = false;
    this._dragValue = null;

    let stylesConfig = config.styles;
    if (stylesConfig !== undefined && (typeof stylesConfig !== 'object' || Array.isArray(stylesConfig))) {
      console.warn('chrono-slider-card: "styles" must be an object, ignoring.');
      stylesConfig = {};
    }
    // Written into the adoptedStyleSheets-based sheet (see constructor/
    // firstUpdated), not injected as an inline <style> element - inline
    // <style> tags always lose cascade ties against adoptedStyleSheets
    // (platform default styleOrder is "inner adopted": adopted sheets are
    // evaluated after, and so win over, inline style elements regardless
    // of DOM position), which made the styles: feature unable to override
    // any property this component's own static styles already declared
    // on the same element. Adopting our sheet the same way, after Lit's
    // own static-style sheets, fixes that at the cause.
    this._userStyleSheet.replaceSync(cscBuildUserStylesCss(stylesConfig || {}));
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
    return CARD_SIZE_HINT;
  }

  // Declares this card's default/min/max size in the sections view's
  // 12-column-per-section grid. rows/min_rows intentionally omitted -
  // hard-won lesson from vertical-slider-card v0.0.8: omitting them lets
  // the section size to the card's actual rendered height instead of a
  // fixed row count, which otherwise causes the card to stick out below
  // its section.
  getGridOptions() {
    return {
      min_columns: GRID_MIN_COLUMNS_DEFAULT,
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._relativeTimeInterval = setInterval(() => {
      if (this._entity && !this._dragging) {
        this._relativeTime = cscRelativeTimeText(this._entity.last_changed);
      }
    }, RELATIVE_TIME_REFRESH_INTERVAL_MS);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._relativeTimeInterval) clearInterval(this._relativeTimeInterval);
    this._teardownDragListeners();
  }

  firstUpdated() {
    this._sliderContainerElement = this.renderRoot.querySelector('.slider-container');
    this._sliderElement = this.renderRoot.querySelector('#slider');
    this._tooltipElement = this.renderRoot.querySelector('.tooltip');
    // Appended after Lit's own static-style sheets (already present in
    // adoptedStyleSheets by this point) so both win cascade ties against
    // them, on any property, not just ones the built-in styles leave
    // undeclared. _stateStyleSheet before _userStyleSheet, so a user
    // override can in turn win against the entity-state-driven color.
    this.renderRoot.adoptedStyleSheets = [
      ...this.renderRoot.adoptedStyleSheets,
      this._stateStyleSheet,
      this._userStyleSheet,
    ];
  }

  // Raw HA current_position (0-100, verified platform-wide: 100 = fully
  // retracted, independent of device_class). Shared source of truth -
  // percentage and slider fill are two independent conversions of the
  // same raw number, since device_open_percentage and device_open_slider
  // can disagree (that's exactly what distinguishes Cover from Screen).
  _rawPosition() {
    if (!this._entity) return null;
    const raw =
      this._entity.attributes.current_position != null
        ? this._entity.attributes.current_position
        : this._entity.state === 'open'
        ? 100
        : 0;
    return raw;
  }

  _displayPercentage(rawPosition) {
    return this._deviceOpenPercentage ? rawPosition : 100 - rawPosition;
  }

  _currentValue() {
    const rawPosition = this._rawPosition();
    return rawPosition == null ? null : this._displayPercentage(rawPosition);
  }

  // Slider-fill-space is a separate, independently-derived view of the
  // same raw position - see device_open_slider. Self-inverse formula
  // (identical shape both directions: raw->slider and slider->raw),
  // so this same function is reused in both directions below.
  _sliderFraction(rawPosition) {
    return this._deviceOpenSlider ? rawPosition : 100 - rawPosition;
  }

  _currentSliderValue() {
    const rawPosition = this._rawPosition();
    return rawPosition == null ? null : this._sliderFraction(rawPosition);
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
    const rect = this._sliderElement.getBoundingClientRect();
    const sliderSize = rect.height - 2 * this._dragHandleMarginPx - HANDLE_SIZE_PX;
    const y = e.clientY - rect.top;
    const value = ((y - this._dragHandleMarginPx - HANDLE_SIZE_PX / 2) / sliderSize) * 100;
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  // sliderValue is in slider-fill space (direct pixel mapping of where
  // the user dragged) - written straight to --value. The tooltip shows
  // the displayed percentage instead, which is a second, independent
  // conversion: slider value -> raw position (via device_open_slider) ->
  // displayed percentage (via device_open_percentage).
  _paint(sliderValue) {
    const fraction = sliderValue / 100;
    if (this._sliderContainerElement) this._sliderContainerElement.style.setProperty('--value', fraction.toString());
    if (this._tooltipElement) {
      // sliderValue is in slider-fill-space; convert to raw position via
      // device_open_slider, then to the displayed percentage via
      // device_open_percentage - two independent, single-step conversions.
      const rawPosition = this._sliderFraction(sliderValue);
      this._tooltipElement.textContent = `${this._displayPercentage(rawPosition)}%`;
    }
  }

  _onSliderPointerDown(e) {
    e.preventDefault();
    this._dragging = true;
    this._sliderContainerElement?.classList.add('pressed');
    this._tooltipElement?.classList.add('visible');
    // Read the live --slider-min-width/--slider-max-width once per drag (not
    // per pointermove) and derive the handle margin the same way the CSS
    // does (see .slider-container's --handle-margin, fixed in v1.6.61) - so
    // drag math never goes stale if either is overridden via styles:.
    const computedStyle = getComputedStyle(this._sliderContainerElement);
    const minWidthPx = parseFloat(computedStyle.getPropertyValue('--slider-min-width'));
    const maxWidthPx = parseFloat(computedStyle.getPropertyValue('--slider-max-width'));
    this._dragHandleMarginPx = Math.max(minWidthPx, maxWidthPx) / 8;
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
    this._sliderContainerElement?.classList.remove('pressed');
    this._tooltipElement?.classList.remove('visible');
    this._teardownDragListeners();
    const value = this._dragValue;
    this._dragValue = null;
    if (this._hass && this._config?.entity != null && value != null) {
      // value is the slider-fill-space position the user dragged to;
      // convert to raw HA current_position via device_open_slider.
      const rawValue = this._sliderFraction(value);
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
  // ourAction is purely positional: 'open' (top button) always calls
  // open_cover and always targets raw position 100; 'close' (bottom
  // button) always calls close_cover and always targets raw position 0.
  // HA's open_cover/close_cover services are fixed platform-wide (a
  // cover's current_position is always 0=closed/100=open, independent of
  // device_class - verified against HA's own documentation), so
  // device_open_state must never be consulted here - it's a display-only
  // concern (state text, percentage, slider fill), never a button/
  // service-call concern.
  _callDirectional(ourAction) {
    if (!this._hass || !this._entity) return;
    if (!cscCanOpenCover(this._entity, ourAction === 'open')) return;
    this._hass.callService('cover', `${ourAction}_cover`, { entity_id: this._config.entity });
  }

  _stopCover() {
    if (!this._hass || !this._entity) return;
    this._hass.callService('cover', 'stop_cover', { entity_id: this._config.entity });
  }

  _applyFavorite(pos) {
    if (!this._hass || !this._config?.entity) return;
    // favorite_positions are displayed percentages, so convert via
    // device_open_percentage (not device_open_slider).
    const rawValue = this._deviceOpenPercentage ? pos : 100 - pos;
    this._hass.callService('cover', 'set_cover_position', { entity_id: this._config.entity, position: rawValue });
  }

  _setToggleMode(mode) {
    this._toggleMode = mode;
    try {
      window.localStorage.setItem(cscToggleModeStorageKey(this._config.entity), mode === 'button' ? 'buttons' : 'slider');
    } catch (e) {
      // localStorage unavailable (privacy mode, disabled, quota) - the
      // toggle still works for this session, it just won't persist.
    }
  }

  // ---- Render ----
  render() {
    if (!this._config) return html``;
    if (!this._entity) {
      return html`<hui-warning>Entity not available: ${this._config.entity}</hui-warning>`;
    }
    const entity = this._entity;
    const value = this._currentValue();
    const sliderValue = this._currentSliderValue();

    // Raw entity.state, swapped when this device's "open" isn't HA's
    // native "open" (device_open_state===false) - open<->closed and
    // opening<->closing both swap, so the word stays internally
    // consistent with itself mid-transition. Used below only for the
    // state color (cscStateColorCssCover) - the Opened/Closed/Opening/
    // Closing text itself is derived separately, from current_position,
    // so it's correct for partial positions too (see stateWord below).
    const STATE_SWAP = { open: 'closed', closed: 'open', opening: 'closing', closing: 'opening' };
    const effectiveState = this._deviceOpenState ? entity.state : STATE_SWAP[entity.state] ?? entity.state;

    // stateWord: Opening/Closing come from entity.state via
    // cscIsOpeningCover (Closing is just "opening" with deviceOpenState
    // negated - closing is opening with the convention flipped, same as
    // everywhere else deviceOpenState is negated in this file). Opened/
    // Closed are derived from current_position via
    // cscIsCoverStateClosed - a threshold band near the closed extreme
    // (OPEN_CLOSE_THRESHOLD), not the exact-match cscCanOpenCover uses
    // for button enable/disable - so it's correct for partial positions
    // too, and distinguishes "barely open" from "fully open" the way a
    // binary word-swap of entity.state never could. Anything else (e.g.
    // unavailable, unknown) passes through unchanged.
    let stateWord = '';
    if (cscIsOpeningCover(entity, this._deviceOpenState)) {
      stateWord = 'Opening';
    } else if (cscIsOpeningCover(entity, !this._deviceOpenState)) {
      stateWord = 'Closing';
    } else if (entity.state === 'open' || entity.state === 'closed') {
      stateWord = cscIsCoverStateClosed(entity, this._deviceOpenState) ? 'Closed' : 'Opened';
    } else {
      stateWord = entity.state;
    }
    const deviceClass = entity.attributes.device_class;
    // openColor intentionally stays keyed to the literal raw 'open'
    // color regardless of device_open_state - a fixed style reference,
    // not tied to this device's actual current state. Sits ahead of
    // HA's own generic --state-inactive-color in the fallback chain
    // cscComputeCssVariable() builds inside cscStateColorCssCover() (see
    // that function - the chain is assembled as a nested var() string at
    // runtime, not written out literally anywhere, easy to miss with a
    // literal-text search), so a closed device shows a muted tint of its
    // own color rather than HA's plain generic gray. Name matches HA's
    // own --state-{active|inactive}-color convention deliberately, not
    // renamed alongside --slider-* - it's slotting into HA's own
    // fallback chain, not an end-user override point.
    const openColor = cscStateColorCssCover(entity.state, deviceClass, 'open');
    const color = cscStateColorCssCover(effectiveState, deviceClass);
    // Entity-state-driven, so it changes on every state update - written
    // into _stateStyleSheet (see constructor/firstUpdated) rather than
    // the inline style attribute, so a styles: override can still win
    // against it. Kept in sync with every render(), same as the template
    // itself.
    this._stateStyleSheet.replaceSync(
      `.control-slider-host { --state-cover-inactive-color: ${openColor}; --slider-color: ${color}; --slider-background: ${color}; }`
    );

    const openDisabled = !cscCanOpenCover(entity, true);
    const closeDisabled = !cscCanOpenCover(entity, false);
    const stopDisabled = entity.state === UNAVAILABLE;

    // Top button is permanently "open" (up icon, open_cover, targets raw
    // 100/retract) and bottom is permanently "close" (down icon,
    // close_cover, targets raw 0/extend) - fixed, unconditional, matching
    // _callDirectional and openDisabled/closeDisabled (see there). No
    // swap, no device_open_state involvement anywhere in this - it's a
    // display-only concept (state text/percentage/slider fill).
    const openIconPath = cscComputeOpenIcon(entity);
    const closeIconPath = cscComputeCloseIcon(entity);

    const title = this._showName
      ? cscExpandEscapedNewlines(this._config.name || entity.attributes.friendly_name || this._config.entity)
      : '';

    return html`
      <ha-card class="ha-card">
        ${this._showName ? html`<p class="title">${title}</p>` : ''}

        <div class="state-header">
          ${this._showState ? html`<p class="state">${stateWord}</p>` : ''}
          ${this._showPercentage ? html`<p class="percentage">${value}%</p>` : ''}
          ${this._showLastChanged ? html`<p class="last-changed">${this._relativeTime ?? ''}</p>` : ''}
        </div>

        <div class="controls">
          <div class="main-control">
            <div
              class=${classMap({ 'control-slider-host': true, active: this._toggleMode === 'position' })}
            >
              <div
                class="slider-container"
                style=${styleMap({ '--value': (sliderValue / 100).toString() })}
                @pointerdown=${(e) => this._onSliderPointerDown(e)}
              >
                <div id="slider" class="slider" role="slider" tabindex="0" aria-orientation="vertical">
                  <div class="slider-track-background"></div>
                  <div class="slider-track-bar">
                    <div class="handle"></div>
                  </div>
                </div>
                <span class="tooltip"></span>
              </div>
            </div>
            <div class=${classMap({ 'control-button-group': true, active: this._toggleMode === 'button' })}>
              <button
                class=${classMap({ 'control-button': true, 'control-button-open': true, disabled: openDisabled })}
                @click=${() => this._callDirectional('open')}
                aria-label="Open"
              >
                <div class="control-button-overlay"></div>
                <svg viewBox="0 0 24 24"><path d=${openIconPath}></path></svg>
              </button>
              <button
                class=${classMap({ 'control-button': true, 'control-button-stop': true, disabled: stopDisabled })}
                @click=${() => this._stopCover()}
                aria-label="Stop"
              >
                <div class="control-button-overlay"></div>
                <svg viewBox="0 0 24 24"><path d=${ICON_STOP}></path></svg>
              </button>
              <button
                class=${classMap({ 'control-button': true, 'control-button-close': true, disabled: closeDisabled })}
                @click=${() => this._callDirectional('close')}
                aria-label="Close"
              >
                <div class="control-button-overlay"></div>
                <svg viewBox="0 0 24 24"><path d=${closeIconPath}></path></svg>
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
                    <div class="icon-toggle-overlay"></div>
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
                    <div class="icon-toggle-overlay"></div>
                    <svg viewBox="0 0 24 24"><path d=${ICON_SWAP_VERTICAL}></path></svg>
                  </button>
                </div>
              `
            : ''}
        </div>

        ${this._showFavorites
          ? html`
              <section class="favorites">
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
                      <div class="button-inner">
                        <div class="favorite-button-overlay"></div>
                        <span class="button-label">${pos}%</span>
                      </div>
                    </div>
                  `
                )}
              </section>
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
    .title {
      text-align: center;
      white-space: pre;
      margin: 0 0 var(--title-margin-bottom, 16px) 0;
      font-size: var(--title-font-size, 1.25rem);
      line-height: var(--title-line-height, 1.2);
      font-weight: var(--title-font-weight, 500);
      color: var(--primary-text-color);
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
      font-weight: var(--state-font-weight, 400);
      font-size: 32px;
      line-height: var(--state-line-height, 1.2);
    }
    .percentage {
      font-style: normal;
      font-size: var(--percentage-font-size, 16px);
      font-weight: var(--percentage-font-weight, 500);
      line-height: var(--percentage-line-height, 1.5);
      letter-spacing: 0.1px;
      padding: var(--percentage-padding-y, 4px) 0;
    }
    .last-changed {
      font-style: normal;
      font-size: var(--last-changed-font-size, 16px);
      font-weight: var(--last-changed-font-weight, 500);
      line-height: var(--last-changed-line-height, 1.5);
      letter-spacing: 0.1px;
      padding: var(--last-changed-padding-y, 4px) 0;
    }

    /* ---- Controls layout ---- */
    .controls {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      width: 100%;
      margin-top: var(--controls-margin-top, 20px);
    }
    .controls:not(:last-child) {
      margin-bottom: var(--controls-gap, 24px);
    }
    .controls > *:not(:last-child) {
      margin-bottom: var(--controls-gap, 24px);
    }
    .main-control {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      width: 100%;
    }
    .main-control > * {
      margin: 0 var(--main-control-item-margin, 8px);
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
    .control-button {
      position: relative;
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      border-radius: var(--control-button-border-radius, 9999px);
      overflow: hidden;
      cursor: pointer;
      color: var(--primary-text-color);
      -webkit-tap-highlight-color: transparent;
      border: none;
      padding: var(--control-button-padding, 8px);
      background: none;
      font: inherit;
    }
    .control-button-overlay {
      position: absolute;
      inset: 0;
      background-color: var(--disabled-color);
      opacity: 0.2;
      transition: background-color 180ms ease-in-out, opacity 180ms ease-in-out;
      pointer-events: none;
    }
    .control-button svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
      position: relative;
      z-index: 1;
    }
    .control-button:focus-visible {
      box-shadow: 0 0 0 2px var(--secondary-text-color);
    }
    .control-button.disabled {
      cursor: not-allowed;
      color: var(--disabled-text-color, #6f6f6f);
    }
    .control-button.disabled .control-button-overlay {
      opacity: 0.2;
    }

    /* ---- Slider ---- */
    .control-slider-host {
      display: none;
      --slider-color: var(--primary-color);
      --slider-background: var(--disabled-color);
      --slider-background-opacity: 0.2;
      --slider-max-width: 130px;
      --slider-min-width: 80px;
      --slider-border-radius: 9999px;
      height: 45vh;
      max-height: 320px;
      min-height: 200px;
      width: 100%;
      min-width: var(--slider-min-width);
      max-width: var(--slider-max-width);
    }
    .control-slider-host.active {
      display: block;
    }
    .slider-container {
      position: relative;
      height: 100%;
      width: 100%;
      --handle-size: 4px;
      --handle-margin: calc(max(var(--slider-min-width), var(--slider-max-width)) / 8);
    }
    .slider {
      position: relative;
      height: 100%;
      width: 100%;
      border-radius: var(--slider-border-radius);
      transform: translateZ(0);
      transition: box-shadow 180ms ease-in-out;
      outline: none;
      overflow: hidden;
      cursor: pointer;
      touch-action: none;
    }
    .slider:focus-visible {
      box-shadow: 0 0 0 2px var(--slider-color);
    }
    .slider-track-background {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      background: var(--slider-background);
      opacity: var(--slider-background-opacity);
    }
    .slider-track-bar {
      --slider-size: calc(100% - 2 * var(--handle-margin) - var(--handle-size));
      position: absolute;
      height: 100%;
      width: 100%;
      background-color: var(--slider-color);
      transition: transform 180ms ease-in-out, background-color 180ms ease-in-out;
    }
    .slider-track-bar {
      top: 0;
      left: 0;
      border-radius: var(--slider-border-radius);
      /* Fill grows top-down as value increases, so the visible boundary
         moves the same direction as the drag (down = more open). */
      transform: translate3d(0, calc((var(--value, 0) - 1) * var(--slider-size)), 0);
    }
    .handle {
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
      font-size: var(--tooltip-font-size, 20px);
      border-radius: var(--tooltip-border-radius, 12px);
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
      border-radius: var(--icon-button-group-border-radius, 9999px);
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
    .icon-toggle-overlay {
      opacity: 0;
      transition: opacity 180ms ease-in-out;
      background-color: var(--primary-text-color);
      border-radius: var(--icon-toggle-border-radius, 16px);
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
    .icon-toggle-button.selected .icon-toggle-overlay {
      opacity: 1;
    }
    @media (hover: hover) {
      .icon-toggle-button:not(.selected):hover .icon-toggle-overlay {
        opacity: 0.1;
      }
    }

    /* ---- Favorite-position buttons ---- */
    .favorites {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      width: 100%;
      max-width: 384px;
      margin: -8px;
      user-select: none;
    }
    .favorites > * {
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
      border-radius: var(--favorite-button-border-radius, 9999px);
      border: none;
      margin: 0;
      padding: 8px;
      box-sizing: border-box;
      font-family: var(--favorite-button-font-family, inherit);
      font-weight: var(--favorite-button-font-weight, 500);
      font-size: inherit;
      outline: none;
      background: none;
      z-index: 0;
      color: inherit;
      transition: box-shadow 180ms ease-in-out, color 180ms ease-in-out;
    }
    .favorite-button-overlay {
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
    .favorite-button.active .favorite-button-overlay {
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
    'Standalone dashboard card for cover-domain entities (blinds, shades, screens, awnings) with a configurable device type (cover/screen/awning) defining open/closed, percentage, and slider conventions.',
  preview: true,
});

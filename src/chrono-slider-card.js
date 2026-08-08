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
import { unsafeHTML }            from 'https://unpkg.com/lit@2.0.0/directives/unsafe-html.js?module';

// --- Version ---------------------------------------------------------------
const CARD_VERSION = '1.5.58';

// --- Version History ---------------------------------------------------------
// v1.5.58: Removed legacy HA-native border-radius clamp on .slider-track-bar;
//          now follows --slider-border-radius directly, matching .slider.
// v1.5.57: Fixed directional buttons still moving the wrong way for
//          device_open_state:true entities. v1.5.55 fixed enable/disable
//          but missed that _callDirectional('close')/('open') was still
//          wired to the top/bottom buttons by their old, pre-refactor
//          labels - for a true entity that swap was always a no-op both
//          before and after v1.5.55, so the actual service called never
//          changed even though v1.5.54 had already made the icon
//          positional. Top button and bottom button now each carry a
//          single consistent identity throughout (class, disabled state,
//          click handler, icon, aria-label) - top is permanently "open"
//          (open_cover/retract/up), bottom permanently "close" (close_cover
//          /extend/down). No swapping, no device_open_state, anywhere in
//          this - reverted to plain semantic naming now that the concept
//          really is fixed and unambiguous.
// v1.5.56: The slider/buttons toggle now remembers your last choice across
//          page reloads, per entity, per browser - via localStorage, not
//          the card's own config (a config-side fix would change the
//          toggle for everyone viewing the same dashboard, not just the
//          person who clicked it). default_control is still what a
//          browser with nothing stored yet falls back to.
// v1.5.55: Fixed directional buttons moving the wrong way. open_cover/
//          close_cover are fixed platform-wide HA services (current_position
//          is always 0=closed/100=open, verified against HA's own docs) -
//          the button logic was incorrectly re-deriving which service to
//          call from device_open_state, which is a display-only concept
//          (state text/percentage/slider fill), not a service-call concept.
//          Top button (open icon) now always calls open_cover/checks
//          against raw 100; bottom (close icon) always calls close_cover/
//          checks against raw 0 - unconditionally, matching the fixed
//          icons from v1.5.54.
// v1.5.54: Fixed directional button icons - top button now always shows an
//          up-pointing icon and bottom always down, unconditionally. Was
//          incorrectly swapping icons based on device_open_state, which
//          conflated "which icon is drawn" (a fixed, purely positional
//          visual) with "which HA service a press calls" (correctly
//          device_open_state-dependent, unchanged, still in
//          _callDirectional's rawAction).
// v1.5.53: Opened/Closed state text now switches OPEN_CLOSE_THRESHOLD raw
//          position points before the exact closed extreme, not only at the
//          exact extreme itself - a barely-cracked-open cover now reads as
//          Closed rather than Opened. Button enable/disable is unaffected -
//          still the exact extreme. Removed cscIsFullyOpenCover,
//          cscIsFullyClosedCover, cscCanCloseCover, cscIsClosingCover,
//          cscCanStopCover - each was either inlined into its one real
//          caller or was a pure pass-through with zero logic of its own
//          (e.g. cscCanCloseCover(entity,d) was exactly
//          cscCanOpenCover(entity,!d) and nothing else - "close" is "open"
//          with deviceOpenState negated, same as everywhere else that
//          convention is used in this file). cscCanOpenCover is now
//          self-contained (extreme check inlined) and used directly for
//          both directions by callers negating deviceOpenState themselves.
//          Added the generic cscIsBelowThreshold(value, threshold) - no
//          knowledge of covers or positions, purely a comparison - and
//          cscIsCoverStateClosed(), the one place that actually needs
//          OPEN_CLOSE_THRESHOLD.
// v1.4.52: Typing a literal \n into the name field now forces a line break
//          in the title, and normal spaces no longer wrap automatically -
//          full manual control over breaks instead of automatic wrapping.
//          Added cscExpandEscapedNewlines(), a shared display-time helper
//          (not editor/config-side) that converts a literal backslash-n
//          into a real newline character wherever a text config value is
//          shown as card content; applied to title. .title gained
//          white-space: pre (preserves the real newline as a forced break,
//          disables auto-wrap, preserves literal spaces as typed).
// v1.4.51: .title no longer hard-truncates to a single line with an
//          ellipsis. Reworked to mirror .state-header's proven pattern
//          (see v1.1.24-26): dropped width:100%/align-self:flex-start so
//          .title shrink-wraps as a flex item, letting ha-card's existing
//          align-items:center symmetrically center it even when it's
//          wider than the available space and wraps onto multiple lines -
//          text-align:center on .title itself was, on its own, only
//          correct for content that fit; a fixed-width box can't
//          symmetrically center oversized content via text-align alone.
//          Dropped overflow:hidden/text-overflow:ellipsis/white-space:
//          nowrap, which forced the single-line truncation in the first
//          place.
// v1.4.50: styles: gained a reserved 'host' key that targets the card's own
//          :host element (e.g. styles: { host: { margin: 0 } }) instead of
//          being translated into a regular .host class selector - the only
//          way to reach :host from the styles: block, since it's a
//          pseudo-class, not a real class.
// v1.4.49: Fixed the Opened/Closed state text for partial positions. It was
//          derived from a blind word-swap of entity.state (which is only
//          ever 'open' or 'closed', so any partial position collapsed to
//          whichever word HA's raw state happened to report - wrong
//          whenever device_open_state===false). Now derived from
//          current_position via the existing, already-correct
//          cscIsFullyClosedCover() - the same device_open_state-aware
//          function the open/close buttons already use. Not device-type
//          specific - operates purely on the device_open_state boolean.
// v1.4.48: Removed the card's internal favorite_positions fallback - it was
//          a second, invisible source of truth that desynced from what the
//          editor field showed. favorite_positions in config is now the
//          only place favorite buttons are defined; empty/absent means zero
//          buttons. DEFAULT_FAVORITE_POSITIONS is now only used once, by
//          getStubConfig(), to seed a brand-new card's config with
//          0,25,75,100 so the editor field starts pre-filled with real data.
// v1.4.47: Title is now centered by default (text-align: center on .title).
// v1.4.46: Renamed the title element's classname from card-title to title.
// v1.3.45: Removed the getGridOptions() default columns value (and
//          GRID_COLUMNS_DEFAULT) - verified live that this card's own
//          internal max-width: var(--slider-thickness) already handles
//          wide grid allocations gracefully (extra space just sits
//          empty, nothing looks broken), so unlike min_columns there's
//          no real lower-bound problem a default here is protecting
//          against. Leaving columns unset defers to Home Assistant's own
//          fallback for that value. min_columns: 3 (GRID_MIN_COLUMNS_
//          DEFAULT) stays - verified live as the actual point elements
//          start protruding outside the card at narrower widths, a real
//          floor worth declaring.
// v1.3.44: No hardcoded literal belongs inside a method body - moved the
//          last four still sitting there into the Constants section,
//          placed where a reader would actually look rather than
//          appended at the end: RELATIVE_TIME_REFRESH_INTERVAL_MS
//          (getCardSize()'s return 6 -> CARD_SIZE_HINT,
//          getGridOptions()'s columns:4/min_columns:3 ->
//          GRID_COLUMNS_DEFAULT/GRID_MIN_COLUMNS_DEFAULT) grouped with
//          the card-sizing concern they share; connectedCallback()'s
//          setInterval(...,30000) -> RELATIVE_TIME_REFRESH_INTERVAL_MS
//          grouped with the other fixed internal constants (UNAVAILABLE,
//          HANDLE_MARGIN_PX/HANDLE_SIZE_PX), not the config-default
//          block, since it isn't tied to any config option. Scope
//          deliberately limited to these four JS-level literals; CSS-side
//          defaults inside static styles (--slider-thickness: 130px and
//          similar) are already named via their own custom properties
//          and were left untouched.
// v1.3.43: Corrected v1.3.42: --state-cover-inactive-color was removed as
//          "dead" based on a literal-text search for
//          var(--state-cover-inactive-color) in the file, which never
//          exists as written text - cscComputeCssVariable() assembles the
//          fallback var() chain from an array at runtime, so the search
//          couldn't find what was really a calculated use, not a
//          hardcoded one. Removing it made every closed device fall
//          through to HA's plain generic --state-inactive-color gray
//          instead of a muted tint of its own state color, which was a
//          real, deliberate part of the card's look, not an accidental
//          side effect worth keeping. Restored: openColor and its
//          computation are back, and --state-cover-inactive-color is
//          written into the same _stateStyleSheet.replaceSync() call
//          alongside --slider-color/--slider-background (not the inline
//          style attribute - that was never acceptable, mistake or not).
//          Left unrenamed, matching HA's own --state-{active|inactive}-
//          color convention rather than the card's --slider-* scheme,
//          since it's slotting into HA's own fallback chain, not an
//          end-user override point.
// v1.3.42: Renamed the --control-slider-* CSS custom property family to
//          --slider-* (color/background/background-opacity/thickness/
//          border-radius) - shorter, guessable names for a styles:
//          feature that's designed to be usable from gut feeling alone,
//          matching the same reasoning already applied to class names.
//          Eliminated the last remaining dynamic inline style: entity-
//          state-driven --slider-color/--slider-background were being
//          set via the element's inline style attribute on every render,
//          which - being a higher-priority cascade origin than any
//          stylesheet, including adoptedStyleSheets - made them
//          permanently un-overridable via styles: no matter what class
//          or variable name was targeted, unlike the v1.3.41 border-
//          radius fix which only had to beat a same-origin tie. Moved
//          this into a second constructed stylesheet (_stateStyleSheet),
//          updated via replaceSync() on every render() and adopted in
//          firstUpdated() between Lit's static defaults and the existing
//          user _userStyleSheet, so styles: overrides now work for
//          color/background too. Removed --state-cover-inactive-color
//          and the openColor value that fed it - traced and confirmed
//          dead (nothing in this card's own CSS ever read it, and
//          custom properties don't inherit upward out of the shadow
//          root to affect anything else); the entity-unavailable
//          graying users see comes entirely from cscStateColorCssCover's
//          own 'var(--state-unavailable-color)' return feeding
//          --slider-color/--slider-background, unrelated to the removed
//          variable. Converted the slider handle from a
//          .slider-track-bar::after pseudo-element to a real .handle
//          element, addressable via styles: like every other visible
//          part of the card. --value intentionally stays on the inline
//          style/imperative setProperty() path (both the static render
//          default and the drag-time fast path) - functional per-frame
//          drag state, not a look, and the imperative path exists
//          specifically to bypass Lit's render cycle for performance.
// v1.3.41: styles: config feature was fixed at its actual cause instead of
//          worked around: user CSS was being injected as an inline <style>
//          element, which per the platform's default styleOrder ("inner
//          adopted") always loses cascade ties against adoptedStyleSheets
//          (verified against the CSSWG spec discussion, not assumed) -
//          meaning it could never override any property already declared
//          by this component's own static styles on the same element,
//          regardless of DOM/template order. The v1.1.28 changelog's claim
//          that a specificity audit made this "reliably win via source
//          order alone" was therefore never actually true. Fixed by
//          building the user CSS into a constructed CSSStyleSheet (owned
//          for the component's lifetime, updated in place via
//          replaceSync() on every setConfig()) and appending it to
//          renderRoot.adoptedStyleSheets after Lit's own static-style
//          sheets in firstUpdated() - same mechanism, same category,
//          appended after, so it now wins ties by platform design rather
//          than by accident. Inline <style> tag removed from the render
//          template. DOM/naming audit of the card (not the editor) per
//          the project's DOM-minimalism and naming rules: renamed
//          .container -> .slider-container (former name gave no
//          indication of purpose or scope). Removed the show-handle
//          modifier on .slider-track-bar - it was hardcoded permanently
//          present in the template with no conditional ever toggling it
//          off, making the unmodified .slider-track-bar rule's own
//          --slider-size dead code; merged the two into one rule.
//          Flattened .favorites-groups/.favorites-group/.favorites-
//          container (three nested wrapper levels for what only ever
//          renders as one group) into a single .favorites element with
//          the exact same effective layout. .slider-track-background
//          examined and deliberately left as its own element - collapsing
//          it onto .slider would require switching from the opacity
//          property to an alpha-blended background color, since opacity
//          cascades to children and would incorrectly dim the fill bar
//          too; a real behavior change, not a free simplification, so
//          left untouched per instruction.
// v1.3.40: Corrected DEVICE_TYPE_DEFAULTS.awning.device_open_state true->false.
//          Awning's "open" is fully extended (raw position 0), so the "Open"
//          word must show at raw 0, not raw 100 - true was the leftover
//          hand-compensated value from a prior session's quick-fix, no
//          longer needed now that device_open_percentage and
//          device_open_slider are both corrected too. Awning is now
//          false/false/false (fully inverted from native in all three
//          respects), matching Cover's clean true/true/true.
// v1.3.39: Removed invert_position entirely (setConfig() assignment and its
//          use in _rawPosition()) - was introduced unilaterally in a prior
//          session without being agreed as a design decision; per-entity
//          raw-axis quirks are no longer special-cased. Corrected
//          DEVICE_TYPE_DEFAULTS: awning device_open_percentage true->false,
//          screen device_open_slider true->false - both derived from the
//          device's own open/closed definition (percentage and slider fill
//          both track extension amount, inverted from raw HA position, for
//          every device type except native "cover"). Restored
//          device_open_slider to actually drive the visual slider fill:
//          added _sliderFraction()/_currentSliderValue(), independent from
//          _displayPercentage()/_currentValue() - both are now separate,
//          single-step conversions from the same raw position, not one
//          derived from the other. render()'s --value binding now uses
//          _currentSliderValue() instead of the displayed percentage.
//          _paint()'s drag tooltip and _onPointerUp()'s HA service call now
//          correctly convert dragged slider-fill-space value -> raw
//          position (via device_open_slider) -> displayed percentage (via
//          device_open_percentage, tooltip only) instead of treating
//          slider-space and percentage-space as identical. Fixed
//          _callDirectional()'s disabled check and render()'s
//          openDisabled/closeDisabled to key off the human-facing action
//          (ourAction) instead of the derived raw HA verb -
//          cscCanOpenCover/cscCanCloseCover already translate via
//          device_open_state internally, so branching on the raw verb
//          asked the wrong question. Removed the now-unused
//          rawOpenAction/rawCloseAction locals in render() that this bug
//          depended on.
// v1.2.36: Removed _sliderFraction/_currentSliderValue - slider fill always
//          mirrors the displayed percentage directly. Bottom=100% universally.
//          _onPointerUp now converts drag value via device_open_percentage.
//          _paint tooltip now shows drag value directly as percentage.
// v1.2.35: Corrected DEVICE_TYPE_DEFAULTS presets based on live device testing.
//          Awning: device_open_state=true, device_open_percentage=true,
//          device_open_slider=false. Screen: unchanged. Cover: unchanged.
//          Fixed _onPointerUp() rawValue conversion: device_open_slider=true
//          now correctly inverts the drag value before sending to HA
//          (rawValue = device_open_slider ? 100-value : value).
//          Removed debug console.log from setConfig().
// v1.2.34: Fixed two related bugs. (1) _sliderFraction formula had true/false
//          meaning backwards - true now correctly means 'use raw unchanged',
//          false means 'invert', consistent with device_open_percentage and
//          device_open_state. (2) Awning preset had device_open_slider=true
//          which with the corrected formula means raw unchanged - but extended
//          awning at raw=0 must show slider DOWN, requiring inversion, so
//          device_open_slider must be false for Awning.
// v1.2.33: Two fixes, both confirmed against live device data rather than
//          assumed. (1) _sliderFraction() had device_open_slider's effect
//          backwards - true now correctly returns 100-rawPosition (mirrors
//          extension) instead of rawPosition unchanged. Confirmed via 3
//          independent live cases (Zijraam/Oprit/Logeerkamer, all raw=0
//          pinned exactly via their 'closed' state word) where the slider
//          rendered empty/handle-up for a fully-closed screen instead of
//          full/handle-down. (2) Added invert_position, a 4th raw-YAML-only
//          override (not part of any device_type preset, default false,
//          same hidden/rare-escape-hatch pattern as the existing 3
//          booleans) - applied once in _rawPosition(), before every
//          existing (unchanged) formula runs. Needed because
//          cover.terras_luifel_relais confirmed live to report
//          current_position on the opposite raw axis from every other
//          checked cover (100 while physically fully extended, not
//          retracted) - a standalone device-level fact, not a card bug.
//          Scope note: only current_position is inverted; entity.state
//          (the raw open/closed/opening/closing word) is untouched by this
//          key - if that also reads backwards for an inverted device, it
//          is a separate, not-yet-implemented piece.
// v1.2.32: Greenfield redesign of device-type/orientation handling (no back-compat -
//          card not yet publicly released). Removed `mode`, `fill_direction`, and
//          MODE_DEFAULTS entirely. Replaced with `device_type` (cover/screen/awning)
//          selecting a small preset table of 3 independent booleans -
//          device_open_state, device_open_percentage, device_open_slider - each
//          individually overridable via raw YAML (not exposed in the visual
//          editor). All 3 resolved once in setConfig(), matching the existing
//          resolve-once pattern. Percentage display and slider visual fill are now
//          two independently-computed values (previously shared one formula via
//          fill_direction, which could not express Cover vs. Screen - same slider
//          convention, different percentage convention). The live-drag tooltip and
//          release now correctly derive through device_open_slider (matching the
//          slider's spatial domain) rather than device_open_percentage, then the
//          displayed percentage is a second, separate conversion of that same raw
//          position via device_open_percentage. State word now responds to
//          device_open_state via a raw-state swap (open<->closed, opening<->closing)
//          ahead of the existing, unchanged word switch - previously the word was
//          unmodified raw entity.state with no inversion logic at all. Also fixed:
//          cscIsFullyOpenCover/cscIsFullyClosedCover/cscIsOpeningCover/
//          cscIsClosingCover/cscCanOpenCover/cscCanCloseCover now take
//          device_open_state and key the "fully open/closed" raw position off it,
//          instead of a hardcoded current_position===100/0 that was wrong for
//          Awning. Also fixed: the Open/Close button icon glyphs were previously
//          hardcoded to always show the inverted (Awning-shaped) glyph regardless
//          of device type - now keyed off device_open_state so the icon matches
//          whichever raw action actually fires. Also fixed: render()'s active-state
//          slider color now derives from the same swapped effective state as the
//          state word, so the accent color no longer contradicts the displayed
//          word. show_name/show_state/show_last_changed/show_percentage/
//          show_control_switch_buttons/show_favorites/default_control/
//          favorite_positions are now fully decoupled from device_type - standalone
//          constants, unaffected by this redesign. Editor: "Mode"+"Fill direction"
//          fields replaced by a single "Device type" dropdown (Cover/Screen/
//          Awning); "Default control" label renamed to "Control" (config key
//          default_control unchanged).
// v1.1.31: Added .toggle-field-wide / .toggle-field-narrow modifier classes,
//          selected per call site via cscToggleField()'s existing extraClass
//          argument (not hardcoded in the field) - lets the editor's render()
//          decide toggle+label arrangement per row instead of the field
//          component deciding for it. Base .toggle-field remains untouched,
//          verbatim cm (label-first, tight gap) for any future multi-per-row
//          use. -wide: label left, switch right-aligned - applied to all six
//          of this card's existing toggles (currently one per row). -narrow:
//          switch first then label, tight gap, left-aligned when stacked - not
//          used anywhere yet, added for future multi-per-row toggle groups.
// v1.1.30: Editor field helpers (cscTextField/CscTextfield, cscToggleField,
//          cscSelectField/CscSelect) brought to true verbatim parity with
//          chrono-markdown-card's cm-* equivalents, prefix swapped cm->csc only:
//          - Added unsafeHTML(label) wrapping (was plain ${label}).
//          - cscToggleField gained the extraClass parameter (unused today, kept
//            for parity).
//          - CSS wrapper classes renamed to match cm exactly, unprefixed:
//            .csc-field -> .text-field, .csc-toggle-field -> .toggle-field.
//            .text-field/.toggle-field CSS bodies now verbatim-identical to cm's
//            (this also fixes .toggle-field label previously having no font
//            styling at all, and .text-field gaining min-width:0, which fixes
//            the Mode/Fill direction/Default control row overflowing its column
//            in a CSS grid - grid items default to min-width:auto and won't
//            shrink below content size without it).
//          - Deliberate, confirmed exception to verbatim: CscSelect's restricted
//            (list-only) combobox behaviour from v1.1.27 is KEPT, not reverted to
//            CmSelect's freeform text-commit - this is an intentional forward
//            fix, not a gap, and is slated to be ported back into
//            chrono-markdown-card separately later.
//          - cm's cmColorPicker/cmButtonPicker/cmTextArea were NOT ported -
//            chrono-slider-card has no config fields of those types, so there
//            would be no call site. [Assumption, unconfirmed - flagged for
//            review.]
//          - cm has no equivalent of the Mode/Fill direction/Default control
//            grid row, so its wrapper class .select-row (renamed from
//            .csc-select-row for naming consistency, not because cm has this
//            class) and the flat-list inter-row spacing rule are csc-specific
//            additions layered on top of the verbatim cm classes, since this
//            editor is a single-column stacked list rather than cm's grid-of-
//            rows layout.
//          Also: .percentage gained letter-spacing:0.1px to match .last-changed
//          exactly [default choice made without explicit confirmation - flagged
//          for review]. .time-row wrapper removed entirely - .last-changed is now
//          a direct <p> sibling of .state/.percentage inside .state-header,
//          matching their structure exactly (its flex-centering was redundant,
//          .state-header already centers its children). The 20px gap that used
//          to be .time-row's margin-bottom is now margin-top on .controls
//          instead, so it applies after whichever of state/percentage/
//          last-changed is last visible (or none), instead of being hard-tied to
//          last-changed specifically.
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

// How often the relative-time label ("3 hours ago") re-renders itself -
// see connectedCallback(). Not tied to any config option.
const RELATIVE_TIME_REFRESH_INTERVAL_MS = 30000;

// These must match the CSS custom properties in static styles below:
// --slider-thickness: 130px, --handle-margin: thickness/8, --handle-size: 4px
const HANDLE_MARGIN_PX = 130 / 8;
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
    this._containerEl = this.renderRoot.querySelector('.slider-container');
    this._sliderEl = this.renderRoot.querySelector('#slider');
    this._tooltipEl = this.renderRoot.querySelector('.tooltip');
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
    const rect = this._sliderEl.getBoundingClientRect();
    const sliderSize = rect.height - 2 * HANDLE_MARGIN_PX - HANDLE_SIZE_PX;
    const y = e.clientY - rect.top;
    const value = ((y - HANDLE_MARGIN_PX - HANDLE_SIZE_PX / 2) / sliderSize) * 100;
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  // sliderValue is in slider-fill space (direct pixel mapping of where
  // the user dragged) - written straight to --value. The tooltip shows
  // the displayed percentage instead, which is a second, independent
  // conversion: slider value -> raw position (via device_open_slider) ->
  // displayed percentage (via device_open_percentage).
  _paint(sliderValue) {
    const fraction = sliderValue / 100;
    if (this._containerEl) this._containerEl.style.setProperty('--value', fraction.toString());
    if (this._tooltipEl) {
      // sliderValue is in slider-fill-space; convert to raw position via
      // device_open_slider, then to the displayed percentage via
      // device_open_percentage - two independent, single-step conversions.
      const rawPosition = this._sliderFraction(sliderValue);
      this._tooltipEl.textContent = `${this._displayPercentage(rawPosition)}%`;
    }
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
    if (!this._config || !this._entity) return html``;
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
                class=${classMap({ 'control-btn': true, 'control-btn-open': true, disabled: openDisabled })}
                @click=${() => this._callDirectional('open')}
                aria-label="Open"
              >
                <svg viewBox="0 0 24 24"><path d=${openIconPath}></path></svg>
              </button>
              <button
                class=${classMap({ 'control-btn': true, 'control-btn-stop': true, disabled: stopDisabled })}
                @click=${() => this._stopCover()}
                aria-label="Stop"
              >
                <svg viewBox="0 0 24 24"><path d=${ICON_STOP}></path></svg>
              </button>
              <button
                class=${classMap({ 'control-btn': true, 'control-btn-close': true, disabled: closeDisabled })}
                @click=${() => this._callDirectional('close')}
                aria-label="Close"
              >
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
                      <div class="button-inner"><span class="button-label">${pos}%</span></div>
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
      margin: 0 0 var(--ha-space-4, 16px) 0;
      font-size: var(--ha-font-size-xl, 1.25rem);
      line-height: var(--ha-line-height-condensed, 1.2);
      font-weight: var(--ha-font-weight-medium, 500);
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
      font-weight: var(--ha-font-weight-normal, 400);
      font-size: 32px;
      line-height: var(--ha-line-height-condensed, 1.2);
    }
    .percentage {
      font-style: normal;
      font-size: var(--ha-font-size-l, 16px);
      font-weight: var(--ha-font-weight-medium, 500);
      line-height: var(--ha-line-height-normal, 1.5);
      letter-spacing: 0.1px;
      padding: var(--ha-space-1, 4px) 0;
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
      margin-top: var(--ha-space-5, 20px);
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
      --slider-color: var(--primary-color);
      --slider-background: var(--disabled-color);
      --slider-background-opacity: 0.2;
      --slider-thickness: 130px;
      --slider-border-radius: var(--ha-border-radius-6xl, 9999px);
      height: 45vh;
      max-height: 320px;
      min-height: 200px;
      width: 100%;
      min-width: 80px;
      max-width: var(--slider-thickness);
    }
    .control-slider-host.active {
      display: block;
    }
    .slider-container {
      position: relative;
      height: 100%;
      width: 100%;
      --handle-size: 4px;
      --handle-margin: calc(var(--slider-thickness) / 8);
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
    'Standalone dashboard card for cover-domain entities (blinds, shades, screens, awnings) with a configurable device type (cover/screen/awning) defining open/closed, percentage, and slider conventions.',
  preview: true,
});

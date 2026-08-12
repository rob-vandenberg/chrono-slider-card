import{LitElement,html,css}from"https://unpkg.com/lit@2.0.0/index.js?module";import{styleMap}from"https://unpkg.com/lit@2.0.0/directives/style-map.js?module";import{classMap}from"https://unpkg.com/lit@2.0.0/directives/class-map.js?module";import{live}from"https://unpkg.com/lit@2.0.0/directives/live.js?module";import{unsafeHTML}from"https://unpkg.com/lit@2.0.0/directives/unsafe-html.js?module";const CARD_VERSION="1.9.91",ICON_MENU="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",ICON_SWAP_VERTICAL="M9,3L5,7H8V14H10V7H13M16,17V10H14V17H11L15,21L19,17H16Z",ICON_ARROW_UP="M13,20H11V8L5.5,13.5L4.08,12.08L12,4.16L19.92,12.08L18.5,13.5L13,8V20Z",ICON_ARROW_DOWN="M11,4H13V16L18.5,10.5L19.92,11.92L12,19.84L4.08,11.92L5.5,10.5L11,16V4Z",ICON_ARROW_EXPAND_HORIZONTAL="M9,11H15V8L19,12L15,16V13H9V16L5,12L9,8V11Z",ICON_ARROW_COLLAPSE_HORIZONTAL="M13,20H11V14H5V16L1,12L5,8V10H11V4H13V10H19V8L23,12L19,16V14H13V20Z",ICON_STOP="M18,18H6V6H18V18Z";console.info("%c CHRONO-%cSLIDER%c-CARD %c v1.9.91 ","background-color: #101010; color: #FFFFFF; font-weight: bold; padding: 2px 0 2px 4px; border-radius: 3px 0 0 3px;","background-color: #101010; color: #4676d3; font-weight: bold; padding: 2px 0;","background-color: #101010; color: #FFFFFF; font-weight: bold; padding: 2px 4px 2px 0;","background-color: #1E1E1E; color: #FFFFFF; font-weight: bold; padding: 2px 4px; border-radius: 0 3px 3px 0;");const UNAVAILABLE="unavailable",RELATIVE_TIME_REFRESH_INTERVAL_MS=3e4,HANDLE_SIZE_PX=4,HANDLE_MARGIN_DIVISOR=8,DEVICE_TYPE_DEFAULTS={cover:{device_open_state:!0,device_open_percentage:!0,device_open_slider:!0},screen:{device_open_state:!0,device_open_percentage:!1,device_open_slider:!1},awning:{device_open_state:!1,device_open_percentage:!1,device_open_slider:!1}},DEFAULT_SHOW_NAME=!0,DEFAULT_SHOW_STATE=!0,DEFAULT_SHOW_LAST_CHANGED=!0,DEFAULT_SHOW_PERCENTAGE=!0,DEFAULT_SHOW_CONTROL_SWITCH_BUTTONS=!1,DEFAULT_SHOW_CONTROLS=!0,DEFAULT_SHOW_FAVORITES=!0,DEFAULT_CONTROL="slider",DEFAULT_FAVORITE_POSITIONS=[0,25,75,100],TOGGLE_MODE_STORAGE_PREFIX="chrono-slider-card-control-";function cscToggleModeStorageKey(t){return`${TOGGLE_MODE_STORAGE_PREFIX}${t}`}const OPEN_CLOSE_THRESHOLD=10,CARD_SIZE_HINT=6,GRID_MIN_COLUMNS_DEFAULT=3;function cscComputeOpenIcon(t){switch(t.attributes.device_class){case"awning":case"door":case"gate":case"curtain":return ICON_ARROW_EXPAND_HORIZONTAL;default:return ICON_ARROW_UP}}function cscComputeCloseIcon(t){switch(t.attributes.device_class){case"awning":case"door":case"gate":case"curtain":return ICON_ARROW_COLLAPSE_HORIZONTAL;default:return ICON_ARROW_DOWN}}function cscIsOpeningCover(t,e){return t.state===(e?"opening":"closing")}function cscCanOpenCover(t,e){if(t.state===UNAVAILABLE)return!1;const o=!0===t.attributes.assumed_state;let i;return i=void 0!==t.attributes.current_position?t.attributes.current_position===(e?100:0):t.state===(e?"open":"closed"),o||!i&&!cscIsOpeningCover(t,e)}function cscIsBelowThreshold(t,e){return t<e}function cscIsCoverStateClosed(t,e){if(void 0!==t.attributes.current_position){const o=t.attributes.current_position;return e?cscIsBelowThreshold(o,10):!cscIsBelowThreshold(o,90)}return t.state===(e?"closed":"open")}function cscStateActiveCover(t){return"unavailable"!==t&&"unknown"!==t&&("off"!==t&&"closed"!==t)}function cscSlugifyState(t){return String(t).toLowerCase()}function cscDomainColorPropertiesCover(t,e,o){const i=[],n=cscSlugifyState(e),r=o?"active":"inactive";return t&&i.push(`--state-cover-${t}-${n}-color`),i.push(`--state-cover-${n}-color`,`--state-cover-${r}-color`,`--state-${r}-color`),i}function cscComputeCssVariable(t){return t.reduceRight((t,e)=>`var(${e}${t?`, ${t}`:""})`,void 0)}function cscStateColorCssCover(t,e,o){const i=void 0!==o?o:t;if("unavailable"===i)return"var(--state-unavailable-color)";return cscComputeCssVariable(cscDomainColorPropertiesCover(e,i,cscStateActiveCover(i)))}function cscNormalizeFavoritePositions(t){if(!t)return[];const e="string"==typeof t?t.split(",").map(t=>t.trim()).filter(t=>""!==t):t,o=[];for(const t of e){const e=Number(t);if(isNaN(e))continue;const i=Math.max(0,Math.min(100,e));o.push(i)}return o}function cscRelativeTimeText(t){const e=new Date(t).getTime(),o=Date.now(),i=Math.round((o-e)/1e3),n=new Intl.RelativeTimeFormat(void 0,{numeric:"auto"}),r=[["year",31536e3],["month",2592e3],["day",86400],["hour",3600],["minute",60],["second",1]];for(const[t,e]of r)if(Math.abs(i)>=e||"second"===t){const o=Math.round(i/e);return n.format(-o,t)}return""}function cscExpandEscapedNewlines(t){return String(t).replace(/\\n/g,"\n")}function cscToKebab(t){return String(t).replace(/_/g,"-")}function cscBuildUserStylesCss(t){let e="";for(const[o,i]of Object.entries(t)){if(!i||"object"!=typeof i||Array.isArray(i))continue;const t=Object.entries(i).map(([t,e])=>`${cscToKebab(t)}: ${e};`).join(" ");e+=`${"host"===o?":host":`.${cscToKebab(o)}`} { ${t} }\n`}return e}function cscTextField(t,e,o,i={}){return html`
    <div class="text-field">
      <label>${unsafeHTML(t)}</label>
      <chrono-csc-textfield
        .value=${String(e??"")}
        type=${i.type??"text"}
        step=${i.step??""}
        min=${i.min??""}
        max=${i.max??""}
        placeholder=${i.placeholder??""}
        @input=${o}
      ></chrono-csc-textfield>
    </div>
  `}function cscToggleField(t,e,o,i=""){return html`
    <div class="toggle-field ${i}">
      <label>${unsafeHTML(t)}</label>
      <ha-switch .checked=${e} @change=${o}></ha-switch>
    </div>
  `}function cscSelectField(t,e,o,i){return html`
    <div class="text-field">
      <label>${unsafeHTML(t)}</label>
      <chrono-csc-select
        .value=${e??""}
        .options=${o}
        @change=${i}
      ></chrono-csc-select>
    </div>
  `}class CscTextfield extends LitElement{static properties={value:{type:String},type:{type:String},step:{type:String},min:{type:String},max:{type:String},placeholder:{type:String}};static styles=css`
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
  `;render(){return html`
      <input
        .value=${live(this.value??"")}
        type=${this.type??"text"}
        step=${this.step??""}
        min=${this.min??""}
        max=${this.max??""}
        placeholder=${this.placeholder??""}
        @input=${t=>{this.value=t.target.value,this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0}))}}
      >
    `}}customElements.define("chrono-csc-textfield",CscTextfield);class CscSelect extends LitElement{static properties={value:{type:String},options:{type:Array},_open:{state:!0},_cursor:{state:!0},_filterText:{state:!0}};static styles=css`
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
  `;constructor(){super(),this.value="",this.options=[],this._open=!1,this._cursor=-1,this._filterText=null,this._onOutsideClick=this._onOutsideClick.bind(this)}connectedCallback(){super.connectedCallback(),document.addEventListener("click",this._onOutsideClick)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this._onOutsideClick)}get _displayText(){if(null!==this._filterText)return this._filterText;const t=(this.options??[]).find(t=>t.value===this.value);return t?t.label:this.value??""}_filteredOptions(){const t=this.options??[];if(null===this._filterText||""===this._filterText)return t;const e=this._filterText.toLowerCase();return t.filter(t=>t.label.toLowerCase().includes(e))}_onOutsideClick(t){this.shadowRoot.contains(t.composedPath()[0])||t.composedPath()[0]===this||this._revertOrExactMatch()}_commit(t){this.value=t,this._filterText=null,this._open=!1,this._cursor=-1,this.dispatchEvent(new CustomEvent("change",{detail:{value:t},bubbles:!0,composed:!0}))}_revertOrExactMatch(){if(null===this._filterText)return this._open=!1,void(this._cursor=-1);const t=this._filterText.toLowerCase(),e=(this.options??[]).find(e=>e.label.toLowerCase()===t);e?this._commit(e.value):(this._filterText=null,this._open=!1,this._cursor=-1)}_toggleOpen(){this._open?this._revertOrExactMatch():(this._open=!0,this._cursor=-1,this.shadowRoot.querySelector(".combobox-input").focus())}_handleInput(t){this._filterText=t.target.value,this._open=!0;const e=this._filteredOptions();this._cursor=e.length?0:-1}_handleKeyDown(t){const e=this._filteredOptions();this._open?"ArrowDown"===t.key?(this._cursor=Math.min(this._cursor+1,e.length-1),t.preventDefault()):"ArrowUp"===t.key?(this._cursor=Math.max(this._cursor-1,0),t.preventDefault()):"Enter"===t.key?(this._cursor>=0&&this._cursor<e.length?this._commit(e[this._cursor].value):this._revertOrExactMatch(),t.preventDefault()):"Escape"===t.key&&(this._filterText=null,this._open=!1,this._cursor=-1,t.preventDefault()):"ArrowDown"!==t.key&&"ArrowUp"!==t.key||(this._open=!0,this._cursor=e.length?0:-1,t.preventDefault())}render(){const t=this._filteredOptions();return html`
      <div class="combobox ${this._open?"combobox-open":""}">
        <input
          class="combobox-input"
          .value=${live(this._displayText)}
          @input=${this._handleInput}
          @blur=${()=>this._revertOrExactMatch()}
          @keydown=${this._handleKeyDown}
        >
        <div
          class="combobox-chevron"
          @click=${()=>this._toggleOpen()}
          aria-hidden="true"
        >${this._open?"▴":"▾"}</div>
      </div>

      ${this._open?html`
        <div class="combobox-dropdown">
          ${t.length?t.map((t,e)=>html`
            <div
              class="combobox-option
                     ${t.value===this.value?"combobox-option-selected":""}
                     ${e===this._cursor?"combobox-option-cursor":""}"
              @mousedown=${e=>{e.preventDefault(),this._commit(t.value)}}
            >${t.label}</div>
          `):html`<div class="combobox-option combobox-option-empty">No matches</div>`}
        </div>
      `:""}
    `}}customElements.define("chrono-csc-select",CscSelect);class ChronoSliderCardEditor extends LitElement{static properties={hass:{attribute:!1},_config:{state:!0}};setConfig(t){this._config=t}_emit(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}_entityChanged(t){this._config&&(this._config={...this._config,entity:t.detail.value},this._emit())}_valueChanged(t,e){if(!this._config)return;const o=e.target.value??e.detail?.value;this._config={...this._config,[t]:o},this._emit()}_toggleChanged(t,e){this._config&&(this._config={...this._config,[t]:e.target.checked},this._emit())}_favoritePositionsChanged(t){this._config&&(this._config={...this._config,favorite_positions:t.target.value??""},this._emit())}static styles=css`
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
  `;render(){if(!this._config)return html``;const t=this._config;return html`
      <div class="text-field">
        <label>Entity</label>
        <ha-selector
          .hass=${this.hass}
          .selector=${{entity:{domain:"cover"}}}
          .value=${t.entity??""}
          @value-changed=${t=>this._entityChanged(t)}
        ></ha-selector>
      </div>

      ${cscTextField("Name (optional)",t.name,t=>this._valueChanged("name",t))}

      <div class="select-row">
        ${cscSelectField("Device type",t.device_type??"cover",[{value:"cover",label:"Cover"},{value:"screen",label:"Screen"},{value:"awning",label:"Awning"}],t=>this._valueChanged("device_type",t))}
        ${cscSelectField("Control",t.default_control??"slider",[{value:"slider",label:"Slider"},{value:"buttons",label:"Buttons"}],t=>this._valueChanged("default_control",t))}
      </div>

      ${cscToggleField("Show name",!1!==t.show_name,t=>this._toggleChanged("show_name",t),"toggle-field-wide")}
      ${cscToggleField("Show state",!1!==t.show_state,t=>this._toggleChanged("show_state",t),"toggle-field-wide")}
      ${cscToggleField("Show percentage",!1!==t.show_percentage,t=>this._toggleChanged("show_percentage",t),"toggle-field-wide")}
      ${cscToggleField("Show last changed",!1!==t.show_last_changed,t=>this._toggleChanged("show_last_changed",t),"toggle-field-wide")}
      ${cscToggleField("Show controls",!1!==t.show_controls,t=>this._toggleChanged("show_controls",t),"toggle-field-wide")}
      ${cscToggleField("Show control switch buttons",!0===t.show_control_switch_buttons,t=>this._toggleChanged("show_control_switch_buttons",t),"toggle-field-wide")}
      ${cscToggleField("Show favorites",!1!==t.show_favorites,t=>this._toggleChanged("show_favorites",t),"toggle-field-wide")}
      ${cscTextField("Favorite positions (comma-separated %)",Array.isArray(t.favorite_positions)?t.favorite_positions.join(", "):t.favorite_positions??"",t=>this._favoritePositionsChanged(t))}
    `}}customElements.define("chrono-slider-card-editor",ChronoSliderCardEditor);class ChronoSliderCard extends LitElement{static properties={_config:{state:!0},_entity:{state:!0},_relativeTime:{state:!0},_toggleMode:{state:!0}};constructor(){super(),this._stateStyleSheet=new CSSStyleSheet,this._userStyleSheet=new CSSStyleSheet}static getStubConfig(t){return{type:"custom:chrono-slider-card",entity:(t&&t.states?Object.keys(t.states):[]).find(t=>t.startsWith("cover."))||"",favorite_positions:DEFAULT_FAVORITE_POSITIONS}}static getConfigElement(){return document.createElement("chrono-slider-card-editor")}setConfig(t){if(!t.entity)throw new Error("You need to define an entity");this._config=t,this._deviceType="screen"===t.device_type||"awning"===t.device_type?t.device_type:"cover";const e=DEVICE_TYPE_DEFAULTS[this._deviceType];this._deviceOpenState=void 0!==t.device_open_state?!0===t.device_open_state:e.device_open_state,this._deviceOpenPercentage=void 0!==t.device_open_percentage?!0===t.device_open_percentage:e.device_open_percentage,this._deviceOpenSlider=void 0!==t.device_open_slider?!0===t.device_open_slider:e.device_open_slider,this._showName=void 0===t.show_name||!0===t.show_name,this._showState=void 0===t.show_state||!0===t.show_state,this._showLastChanged=void 0===t.show_last_changed||!0===t.show_last_changed,this._showPercentage=void 0===t.show_percentage||!0===t.show_percentage,this._favoritePositions=cscNormalizeFavoritePositions(t.favorite_positions),this._showControlSwitchButtons=void 0!==t.show_control_switch_buttons&&!0===t.show_control_switch_buttons,this._showControls=void 0===t.show_controls||!0===t.show_controls,this._showFavorites=void 0===t.show_favorites||!0===t.show_favorites,this._defaultControl="buttons"===t.default_control||"slider"===t.default_control?t.default_control:"slider";let o=null;try{o=window.localStorage.getItem(cscToggleModeStorageKey(t.entity))}catch(t){o=null}const i="buttons"===o||"slider"===o?o:this._defaultControl;this._toggleMode="buttons"===i?"button":"position",this._dragging=!1,this._dragValue=null;let n=t.styles;void 0===n||"object"==typeof n&&!Array.isArray(n)||(console.warn('chrono-slider-card: "styles" must be an object, ignoring.'),n={}),this._userStyleSheet.replaceSync(cscBuildUserStylesCss(n||{}))}set hass(t){if(this._hass=t,!this._config)return;const e=t.states[this._config.entity];e&&(this._entity=e,this._dragging||(this._relativeTime=cscRelativeTimeText(e.last_changed)))}get hass(){return this._hass}getCardSize(){return 6}getGridOptions(){return{min_columns:3}}connectedCallback(){super.connectedCallback(),this._relativeTimeInterval=setInterval(()=>{this._entity&&!this._dragging&&(this._relativeTime=cscRelativeTimeText(this._entity.last_changed))},3e4)}disconnectedCallback(){super.disconnectedCallback(),this._relativeTimeInterval&&clearInterval(this._relativeTimeInterval),this._teardownDragListeners()}firstUpdated(){this._sliderContainerElement=this.renderRoot.querySelector(".slider-container"),this._sliderElement=this.renderRoot.querySelector("#slider"),this._tooltipElement=this.renderRoot.querySelector(".tooltip"),this.renderRoot.adoptedStyleSheets=[...this.renderRoot.adoptedStyleSheets,this._stateStyleSheet,this._userStyleSheet]}_rawPosition(){if(!this._entity)return null;return null!=this._entity.attributes.current_position?this._entity.attributes.current_position:"open"===this._entity.state?100:0}_displayPercentage(t){return this._deviceOpenPercentage?t:100-t}_currentValue(){const t=this._rawPosition();return null==t?null:this._displayPercentage(t)}_sliderFraction(t){return this._deviceOpenSlider?t:100-t}_currentSliderValue(){const t=this._rawPosition();return null==t?null:this._sliderFraction(t)}_valueFromEvent(t){const e=this._sliderElement.getBoundingClientRect(),o=e.height-2*this._dragHandleMarginPx-4,i=(t.clientY-e.top-this._dragHandleMarginPx-2)/o*100;return Math.max(0,Math.min(100,Math.round(i)))}_paint(t){const e=t/100;if(this._sliderContainerElement&&this._sliderContainerElement.style.setProperty("--value",e.toString()),this._tooltipElement){const e=this._sliderFraction(t);this._tooltipElement.textContent=`${this._displayPercentage(e)}%`}}_onSliderPointerDown(t){t.preventDefault(),this._dragging=!0,this._sliderContainerElement?.classList.add("pressed"),this._tooltipElement?.classList.add("visible");const e=getComputedStyle(this._sliderContainerElement),o=parseFloat(e.getPropertyValue("--slider-min-width")),i=parseFloat(e.getPropertyValue("--slider-max-width"));this._dragHandleMarginPx=Math.max(o,i)/8,this._dragValue=this._valueFromEvent(t),this._paint(this._dragValue),this._boundPointerMove=this._boundPointerMove||(t=>this._onPointerMove(t)),this._boundPointerUp=this._boundPointerUp||(t=>this._onPointerUp(t)),window.addEventListener("pointermove",this._boundPointerMove),window.addEventListener("pointerup",this._boundPointerUp),window.addEventListener("pointercancel",this._boundPointerUp)}_onPointerMove(t){this._dragging&&(this._dragValue=this._valueFromEvent(t),this._paint(this._dragValue))}_onPointerUp(){if(!this._dragging)return;this._dragging=!1,this._sliderContainerElement?.classList.remove("pressed"),this._tooltipElement?.classList.remove("visible"),this._teardownDragListeners();const t=this._dragValue;if(this._dragValue=null,this._hass&&null!=this._config?.entity&&null!=t){const e=this._sliderFraction(t);this._hass.callService("cover","set_cover_position",{entity_id:this._config.entity,position:e})}}_teardownDragListeners(){this._boundPointerMove&&window.removeEventListener("pointermove",this._boundPointerMove),this._boundPointerUp&&(window.removeEventListener("pointerup",this._boundPointerUp),window.removeEventListener("pointercancel",this._boundPointerUp))}_callDirectional(t){this._hass&&this._entity&&cscCanOpenCover(this._entity,"open"===t)&&this._hass.callService("cover",`${t}_cover`,{entity_id:this._config.entity})}_stopCover(){this._hass&&this._entity&&this._hass.callService("cover","stop_cover",{entity_id:this._config.entity})}_applyFavorite(t){if(!this._hass||!this._config?.entity)return;const e=this._deviceOpenPercentage?t:100-t;this._hass.callService("cover","set_cover_position",{entity_id:this._config.entity,position:e})}_setToggleMode(t){this._toggleMode=t;try{window.localStorage.setItem(cscToggleModeStorageKey(this._config.entity),"button"===t?"buttons":"slider")}catch(t){}}render(){if(!this._config)return html``;if(!this._entity)return html`<hui-warning>Entity not available: ${this._config.entity}</hui-warning>`;const t=this._entity,e=this._currentValue(),o=this._currentSliderValue(),i=this._deviceOpenState?t.state:{open:"closed",closed:"open",opening:"closing",closing:"opening"}[t.state]??t.state;let n="";n=cscIsOpeningCover(t,this._deviceOpenState)?"Opening":cscIsOpeningCover(t,!this._deviceOpenState)?"Closing":"open"===t.state||"closed"===t.state?cscIsCoverStateClosed(t,this._deviceOpenState)?"Closed":"Opened":t.state;const r=t.attributes.device_class,s=cscStateColorCssCover(t.state,r,"open"),a=cscStateColorCssCover(i,r);this._stateStyleSheet.replaceSync(`.control-slider-host { --state-cover-inactive-color: ${s}; --slider-color: ${a}; --slider-background: ${a}; }`);const l=!cscCanOpenCover(t,!0),c=!cscCanOpenCover(t,!1),d=t.state===UNAVAILABLE,h=cscComputeOpenIcon(t),p=cscComputeCloseIcon(t),g=this._showName?cscExpandEscapedNewlines(this._config.name||t.attributes.friendly_name||this._config.entity):"";return html`
      <ha-card class="ha-card">
        ${this._showName?html`<p class="title">${g}</p>`:""}

        <div class="state-header">
          ${this._showState?html`<p class="state">${n}</p>`:""}
          ${this._showPercentage?html`<p class="percentage">${e}%</p>`:""}
          ${this._showLastChanged?html`<p class="last-changed">${this._relativeTime??""}</p>`:""}
        </div>

        ${this._showControls?html`
        <div class="controls">
          <div class="main-control">
            <div
              class=${classMap({"control-slider-host":!0,active:"position"===this._toggleMode})}
            >
              <div
                class="slider-container"
                style=${styleMap({"--value":(o/100).toString()})}
                @pointerdown=${t=>this._onSliderPointerDown(t)}
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
            <div class=${classMap({"control-button-group":!0,active:"button"===this._toggleMode})}>
              <button
                class=${classMap({"control-button":!0,"control-button-open":!0,disabled:l})}
                @click=${()=>this._callDirectional("open")}
                aria-label="Open"
              >
                <div class="control-button-shade"></div>
                <svg viewBox="0 0 24 24"><path d=${h}></path></svg>
              </button>
              <button
                class=${classMap({"control-button":!0,"control-button-stop":!0,disabled:d})}
                @click=${()=>this._stopCover()}
                aria-label="Stop"
              >
                <div class="control-button-shade"></div>
                <svg viewBox="0 0 24 24"><path d=${ICON_STOP}></path></svg>
              </button>
              <button
                class=${classMap({"control-button":!0,"control-button-close":!0,disabled:c})}
                @click=${()=>this._callDirectional("close")}
                aria-label="Close"
              >
                <div class="control-button-shade"></div>
                <svg viewBox="0 0 24 24"><path d=${p}></path></svg>
              </button>
            </div>
          </div>
          ${this._showControlSwitchButtons?html`
                <div class="icon-button-group">
                  <button
                    class=${classMap({"icon-toggle-button":!0,"icon-toggle-button-position":!0,selected:"position"===this._toggleMode})}
                    @click=${()=>this._setToggleMode("position")}
                    aria-label="Position mode"
                  >
                    <div class="icon-toggle-shade"></div>
                    <svg viewBox="0 0 24 24"><path d=${ICON_MENU}></path></svg>
                  </button>
                  <button
                    class=${classMap({"icon-toggle-button":!0,"icon-toggle-button-button":!0,selected:"button"===this._toggleMode})}
                    @click=${()=>this._setToggleMode("button")}
                    aria-label="Button mode"
                  >
                    <div class="icon-toggle-shade"></div>
                    <svg viewBox="0 0 24 24"><path d=${ICON_SWAP_VERTICAL}></path></svg>
                  </button>
                </div>
              `:""}
        </div>
              `:""}

        ${this._showFavorites?html`
              <section class="favorites">
                ${this._favoritePositions.map(t=>html`
                    <div
                      class=${classMap({"favorite-button":!0,[`favorite-button-${t}`]:!0,active:t===e})}
                      @click=${()=>this._applyFavorite(t)}
                    >
                      <div class="favorite-button-shade"></div>
                      <span class="button-label">${t}%</span>
                    </div>
                  `)}
              </section>
            `:""}
      </ha-card>
    `}static styles=css`
    :host {
      display: block;
      margin: var(--host-margin, 8px);
    }
    ha-card {
      box-sizing: border-box;
      padding: var(--ha-card-padding, 16px 8px 8px 8px);
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* ---- Title ---- */
    .title {
      text-align: center;
      white-space: pre;
      margin: 0 0 var(--title-margin-bottom, 16px) 0;
      font-size: var(--title-font-size, 20px);
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
      font-size: var(--state-font-size, 32px);
      line-height: var(--state-line-height, 1.2);
      padding: var(--state-padding-y, 4px) 0;
    }
    .percentage {
      font-style: normal;
      font-size: var(--percentage-font-size, 16px);
      font-weight: var(--percentage-font-weight, 500);
      line-height: var(--percentage-line-height, 1.5);
      letter-spacing: var(--label-letter-spacing, 0.1px);
      padding: var(--percentage-padding-y, 4px) 0;
    }
    .last-changed {
      font-style: normal;
      font-size: var(--last-changed-font-size, 16px);
      font-weight: var(--last-changed-font-weight, 500);
      line-height: var(--last-changed-line-height, 1.5);
      letter-spacing: var(--label-letter-spacing, 0.1px);
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
      margin-top: var(--controls-margin-top, 16px);
      margin-bottom: var(--controls-margin-bottom, 8px);
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
      height: var(--controls-height, 45vh);
      max-height: var(--controls-max-height, 320px);
      min-height: var(--controls-min-height, 200px);
      width: var(--control-button-group-width, 100px);
      display: none;
      flex-direction: column;
    }
    .control-button-group.active {
      display: flex;
    }
    .control-button-group > *:not(:last-child) {
      margin-bottom: var(--control-button-group-item-gap, 10px);
    }
    .control-button {
      position: relative;
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      border-radius: var(--control-button-border-radius, 36px);
      overflow: hidden;
      cursor: pointer;
      color: var(--primary-text-color);
      -webkit-tap-highlight-color: transparent;
      border: none;
      padding: var(--control-button-padding, 8px);
      background: none;
      font: inherit;
    }
    .control-button-shade {
      position: absolute;
      inset: 0;
      background-color: var(--disabled-color);
      opacity: var(--overlay-opacity, 0.2);
      transition: background-color var(--transition-duration, 180ms) ease-in-out, opacity var(--transition-duration, 180ms) ease-in-out;
      pointer-events: none;
    }
    .control-button svg {
      width: var(--button-icon-size, 24px);
      height: var(--button-icon-size, 24px);
      fill: currentColor;
      position: relative;
      z-index: 1;
    }
    .control-button:focus-visible {
      box-shadow: 0 0 0 var(--focus-ring-width, 2px) var(--secondary-text-color);
    }
    .control-button.disabled {
      cursor: not-allowed;
      color: var(--disabled-text-color, #6f6f6f);
    }
    .control-button.disabled .control-button-shade {
      opacity: var(--overlay-opacity, 0.2);
    }

    /* ---- Slider ---- */
    .control-slider-host {
      display: none;
      --slider-color: var(--primary-color);
      --slider-background: var(--disabled-color);
      --slider-background-opacity: 0.2;
      --slider-max-width: 130px;
      --slider-min-width: 80px;
      --slider-border-radius: 36px;
      height: var(--controls-height, 45vh);
      max-height: var(--controls-max-height, 320px);
      min-height: var(--controls-min-height, 200px);
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
      transition: box-shadow var(--transition-duration, 180ms) ease-in-out;
      outline: none;
      overflow: hidden;
      cursor: pointer;
      touch-action: none;
    }
    .slider:focus-visible {
      box-shadow: 0 0 0 var(--focus-ring-width, 2px) var(--slider-color);
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
      transition: transform var(--transition-duration, 180ms) ease-in-out, background-color var(--transition-duration, 180ms) ease-in-out;
    }
    .slider-track-bar {
      top: 0;
      left: 0;
      border-radius: var(--slider-track-bar-border-radius, 8px);
      /* Fill grows top-down as value increases, so the visible boundary
         moves the same direction as the drag (down = more open). */
      transform: translate3d(0, calc((var(--value, 0) - 1) * var(--slider-size)), 0);
    }
    .handle {
      position: absolute;
      margin: auto;
      border-radius: var(--handle-size);
      background-color: var(--handle-color, white);
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
      padding: var(--tooltip-padding, 0.2em 0.4em);
      opacity: 0;
      white-space: nowrap;
      box-shadow: var(--tooltip-shadow, 0 2px 5px rgba(0, 0, 0, 0.2));
      transition: opacity var(--transition-duration, 180ms) ease-in-out, top var(--transition-duration, 180ms) ease-in-out;
      left: var(--tooltip-offset, -4px);
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
      height: var(--icon-button-group-height, 48px);
      margin-top: var(--controls-gap, 20px);
      border-radius: var(--icon-button-group-border-radius, 9999px);
      background-color: var(--icon-button-group-background, rgba(139, 145, 151, 0.1));
      box-sizing: border-box;
      width: auto;
      padding: 0;
    }
    .icon-toggle-button {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--icon-toggle-button-size, 40px);
      height: var(--icon-toggle-button-size, 40px);
      margin: var(--icon-toggle-button-gap, 4px);
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      color: var(--primary-text-color);
      -webkit-tap-highlight-color: transparent;
    }
    .icon-toggle-button svg {
      width: var(--button-icon-size, 24px);
      height: var(--button-icon-size, 24px);
      fill: currentColor;
      position: relative;
      z-index: 1;
    }
    .icon-toggle-shade {
      opacity: 0;
      transition: opacity var(--transition-duration, 180ms) ease-in-out;
      background-color: var(--primary-text-color);
      border-radius: var(--icon-toggle-border-radius, 9999px);
      height: var(--icon-toggle-button-size, 40px);
      width: var(--icon-toggle-button-size, 40px);
      position: absolute;
      top: var(--icon-toggle-shade-expand, -10px);
      left: var(--icon-toggle-shade-expand, -10px);
      bottom: var(--icon-toggle-shade-expand, -10px);
      right: var(--icon-toggle-shade-expand, -10px);
      margin: auto;
      box-sizing: border-box;
    }
    .icon-toggle-button.selected {
      color: var(--primary-background-color);
    }
    .icon-toggle-button.selected .icon-toggle-shade {
      opacity: 1;
    }
    @media (hover: hover) {
      .icon-toggle-button:not(.selected):hover .icon-toggle-shade {
        opacity: var(--icon-toggle-hover-opacity, 0.1);
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
      max-width: var(--favorites-max-width, 384px);
      gap: var(--favorite-button-gap, 16px);
      margin-top: var(--favorites-gap, 16px);
      margin-bottom: var(--favorites-margin-bottom, 8px);
      user-select: none;
    }
    .favorite-button {
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      text-align: center;
      width: var(--favorite-button-width, 72px);
      height: var(--favorite-button-height, 36px);
      box-sizing: border-box;
      border: none;
      border-radius: var(--favorite-button-border-radius, 9999px);
      margin: 0;
      padding: var(--favorite-button-padding, 8px);
      font-family: var(--favorite-button-font-family, inherit);
      font-weight: var(--favorite-button-font-weight, 500);
      font-size: inherit;
      outline: none;
      background: none;
      color: var(--primary-text-color);
      -webkit-tap-highlight-color: transparent;
      cursor: pointer;
      transition: box-shadow var(--transition-duration, 180ms) ease-in-out, color var(--transition-duration, 180ms) ease-in-out;
    }
    .favorite-button-shade {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      background-color: var(--disabled-color);
      transition: background-color var(--transition-duration, 180ms) ease-in-out, opacity var(--transition-duration, 180ms) ease-in-out;
      opacity: var(--overlay-opacity, 0.2);
      pointer-events: none;
    }
    .button-label {
      position: relative;
      z-index: 1;
      opacity: var(--favorite-button-label-opacity, 0.95);
    }
    .favorite-button.active .favorite-button-shade {
      background-color: var(--state-cover-active-color, var(--primary-color));
    }
  `}customElements.define("chrono-slider-card",ChronoSliderCard),window.customCards=window.customCards||[],window.customCards.push({type:"chrono-slider-card",name:"Chrono Slider Card",description:"Standalone dashboard card for cover-domain entities (blinds, shades, screens, awnings) with a configurable device type (cover/screen/awning) defining open/closed, percentage, and slider conventions.",preview:!0});
import{LitElement,html,css}from"https://unpkg.com/lit@2.0.0/index.js?module";import{styleMap}from"https://unpkg.com/lit@2.0.0/directives/style-map.js?module";import{classMap}from"https://unpkg.com/lit@2.0.0/directives/class-map.js?module";import{live}from"https://unpkg.com/lit@2.0.0/directives/live.js?module";import{unsafeHTML}from"https://unpkg.com/lit@2.0.0/directives/unsafe-html.js?module";const CARD_VERSION="1.3.45",ICON_MENU="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",ICON_SWAP_VERTICAL="M9,3L5,7H8V14H10V7H13M16,17V10H14V17H11L15,21L19,17H16Z",ICON_ARROW_UP="M13,20H11V8L5.5,13.5L4.08,12.08L12,4.16L19.92,12.08L18.5,13.5L13,8V20Z",ICON_ARROW_DOWN="M11,4H13V16L18.5,10.5L19.92,11.92L12,19.84L4.08,11.92L5.5,10.5L11,16V4Z",ICON_ARROW_EXPAND_HORIZONTAL="M9,11H15V8L19,12L15,16V13H9V16L5,12L9,8V11Z",ICON_ARROW_COLLAPSE_HORIZONTAL="M13,20H11V14H5V16L1,12L5,8V10H11V4H13V10H19V8L23,12L19,16V14H13V20Z",ICON_STOP="M18,18H6V6H18V18Z";console.info("%c CHRONO-%cSLIDER%c-CARD %c v1.3.45 ","background-color: #101010; color: #FFFFFF; font-weight: bold; padding: 2px 0 2px 4px; border-radius: 3px 0 0 3px;","background-color: #101010; color: #4676d3; font-weight: bold; padding: 2px 0;","background-color: #101010; color: #FFFFFF; font-weight: bold; padding: 2px 4px 2px 0;","background-color: #1E1E1E; color: #FFFFFF; font-weight: bold; padding: 2px 4px; border-radius: 0 3px 3px 0;");const UNAVAILABLE="unavailable",RELATIVE_TIME_REFRESH_INTERVAL_MS=3e4,HANDLE_MARGIN_PX=16.25,HANDLE_SIZE_PX=4,DEVICE_TYPE_DEFAULTS={cover:{device_open_state:!0,device_open_percentage:!0,device_open_slider:!0},screen:{device_open_state:!0,device_open_percentage:!1,device_open_slider:!1},awning:{device_open_state:!1,device_open_percentage:!1,device_open_slider:!1}},DEFAULT_SHOW_NAME=!0,DEFAULT_SHOW_STATE=!0,DEFAULT_SHOW_LAST_CHANGED=!0,DEFAULT_SHOW_PERCENTAGE=!0,DEFAULT_SHOW_CONTROL_SWITCH_BUTTONS=!1,DEFAULT_SHOW_FAVORITES=!0,DEFAULT_CONTROL="slider",DEFAULT_FAVORITE_POSITIONS=[0,25,75,100],CARD_SIZE_HINT=6,GRID_MIN_COLUMNS_DEFAULT=3;function cscComputeOpenIcon(e){switch(e.attributes.device_class){case"awning":case"door":case"gate":case"curtain":return ICON_ARROW_EXPAND_HORIZONTAL;default:return ICON_ARROW_UP}}function cscComputeCloseIcon(e){switch(e.attributes.device_class){case"awning":case"door":case"gate":case"curtain":return ICON_ARROW_COLLAPSE_HORIZONTAL;default:return ICON_ARROW_DOWN}}function cscIsFullyOpenCover(e,t){return void 0!==e.attributes.current_position?e.attributes.current_position===(t?100:0):e.state===(t?"open":"closed")}function cscIsFullyClosedCover(e,t){return void 0!==e.attributes.current_position?e.attributes.current_position===(t?0:100):e.state===(t?"closed":"open")}function cscIsOpeningCover(e,t){return e.state===(t?"opening":"closing")}function cscIsClosingCover(e,t){return e.state===(t?"closing":"opening")}function cscCanOpenCover(e,t){if(e.state===UNAVAILABLE)return!1;return!0===e.attributes.assumed_state||!cscIsFullyOpenCover(e,t)&&!cscIsOpeningCover(e,t)}function cscCanCloseCover(e,t){if(e.state===UNAVAILABLE)return!1;return!0===e.attributes.assumed_state||!cscIsFullyClosedCover(e,t)&&!cscIsClosingCover(e,t)}function cscCanStopCover(e){return e.state!==UNAVAILABLE}function cscStateActiveCover(e){return"unavailable"!==e&&"unknown"!==e&&("off"!==e&&"closed"!==e)}function cscSlugifyState(e){return String(e).toLowerCase()}function cscDomainColorPropertiesCover(e,t,o){const i=[],s=cscSlugifyState(t),n=o?"active":"inactive";return e&&i.push(`--state-cover-${e}-${s}-color`),i.push(`--state-cover-${s}-color`,`--state-cover-${n}-color`,`--state-${n}-color`),i}function cscComputeCssVariable(e){return e.reduceRight((e,t)=>`var(${t}${e?`, ${e}`:""})`,void 0)}function cscStateColorCssCover(e,t,o){const i=void 0!==o?o:e;if("unavailable"===i)return"var(--state-unavailable-color)";return cscComputeCssVariable(cscDomainColorPropertiesCover(t,i,cscStateActiveCover(i)))}function cscNormalizeFavoritePositions(e){if(!e)return[];const t=new Set,o=[];for(const i of e){const e=Number(i);if(isNaN(e))continue;const s=Math.max(0,Math.min(100,e));t.has(s)||(t.add(s),o.push(s))}return o}function cscRelativeTimeText(e){const t=new Date(e).getTime(),o=Date.now(),i=Math.round((o-t)/1e3),s=new Intl.RelativeTimeFormat(void 0,{numeric:"auto"}),n=[["year",31536e3],["month",2592e3],["day",86400],["hour",3600],["minute",60],["second",1]];for(const[e,t]of n)if(Math.abs(i)>=t||"second"===e){const o=Math.round(i/t);return s.format(-o,e)}return""}function cscToKebab(e){return String(e).replace(/_/g,"-")}function cscBuildUserStylesCss(e){let t="";for(const[o,i]of Object.entries(e)){if(!i||"object"!=typeof i||Array.isArray(i))continue;const e=Object.entries(i).map(([e,t])=>`${cscToKebab(e)}: ${t};`).join(" ");t+=`.${cscToKebab(o)} { ${e} }\n`}return t}function cscTextField(e,t,o,i={}){return html`
    <div class="text-field">
      <label>${unsafeHTML(e)}</label>
      <chrono-csc-textfield
        .value=${String(t??"")}
        type=${i.type??"text"}
        step=${i.step??""}
        min=${i.min??""}
        max=${i.max??""}
        placeholder=${i.placeholder??""}
        @input=${o}
      ></chrono-csc-textfield>
    </div>
  `}function cscToggleField(e,t,o,i=""){return html`
    <div class="toggle-field ${i}">
      <label>${unsafeHTML(e)}</label>
      <ha-switch .checked=${t} @change=${o}></ha-switch>
    </div>
  `}function cscSelectField(e,t,o,i){return html`
    <div class="text-field">
      <label>${unsafeHTML(e)}</label>
      <chrono-csc-select
        .value=${t??""}
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
        @input=${e=>{this.value=e.target.value,this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0}))}}
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
  `;constructor(){super(),this.value="",this.options=[],this._open=!1,this._cursor=-1,this._filterText=null,this._onOutsideClick=this._onOutsideClick.bind(this)}connectedCallback(){super.connectedCallback(),document.addEventListener("click",this._onOutsideClick)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this._onOutsideClick)}get _displayText(){if(null!==this._filterText)return this._filterText;const e=(this.options??[]).find(e=>e.value===this.value);return e?e.label:this.value??""}_filteredOptions(){const e=this.options??[];if(null===this._filterText||""===this._filterText)return e;const t=this._filterText.toLowerCase();return e.filter(e=>e.label.toLowerCase().includes(t))}_onOutsideClick(e){this.shadowRoot.contains(e.composedPath()[0])||e.composedPath()[0]===this||this._revertOrExactMatch()}_commit(e){this.value=e,this._filterText=null,this._open=!1,this._cursor=-1,this.dispatchEvent(new CustomEvent("change",{detail:{value:e},bubbles:!0,composed:!0}))}_revertOrExactMatch(){if(null===this._filterText)return this._open=!1,void(this._cursor=-1);const e=this._filterText.toLowerCase(),t=(this.options??[]).find(t=>t.label.toLowerCase()===e);t?this._commit(t.value):(this._filterText=null,this._open=!1,this._cursor=-1)}_toggleOpen(){this._open?this._revertOrExactMatch():(this._open=!0,this._cursor=-1,this.shadowRoot.querySelector(".combobox-input").focus())}_handleInput(e){this._filterText=e.target.value,this._open=!0;const t=this._filteredOptions();this._cursor=t.length?0:-1}_handleKeyDown(e){const t=this._filteredOptions();this._open?"ArrowDown"===e.key?(this._cursor=Math.min(this._cursor+1,t.length-1),e.preventDefault()):"ArrowUp"===e.key?(this._cursor=Math.max(this._cursor-1,0),e.preventDefault()):"Enter"===e.key?(this._cursor>=0&&this._cursor<t.length?this._commit(t[this._cursor].value):this._revertOrExactMatch(),e.preventDefault()):"Escape"===e.key&&(this._filterText=null,this._open=!1,this._cursor=-1,e.preventDefault()):"ArrowDown"!==e.key&&"ArrowUp"!==e.key||(this._open=!0,this._cursor=t.length?0:-1,e.preventDefault())}render(){const e=this._filteredOptions();return html`
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
          ${e.length?e.map((e,t)=>html`
            <div
              class="combobox-option
                     ${e.value===this.value?"combobox-option-selected":""}
                     ${t===this._cursor?"combobox-option-cursor":""}"
              @mousedown=${t=>{t.preventDefault(),this._commit(e.value)}}
            >${e.label}</div>
          `):html`<div class="combobox-option combobox-option-empty">No matches</div>`}
        </div>
      `:""}
    `}}customElements.define("chrono-csc-select",CscSelect);class ChronoSliderCardEditor extends LitElement{static properties={hass:{attribute:!1},_config:{state:!0}};setConfig(e){this._config=e}_emit(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}_entityChanged(e){this._config&&(this._config={...this._config,entity:e.detail.value},this._emit())}_valueChanged(e,t){if(!this._config)return;const o=t.target.value??t.detail?.value;this._config={...this._config,[e]:o},this._emit()}_toggleChanged(e,t){this._config&&(this._config={...this._config,[e]:t.target.checked},this._emit())}_favoritePositionsChanged(e){if(!this._config)return;const t=(e.target.value??"").split(",").map(e=>e.trim()).filter(e=>""!==e);this._config={...this._config,favorite_positions:cscNormalizeFavoritePositions(t)},this._emit()}static styles=css`
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
  `;render(){if(!this._config)return html``;const e=this._config;return html`
      <div class="text-field">
        <label>Entity</label>
        <ha-selector
          .hass=${this.hass}
          .selector=${{entity:{domain:"cover"}}}
          .value=${e.entity??""}
          @value-changed=${e=>this._entityChanged(e)}
        ></ha-selector>
      </div>

      ${cscTextField("Name (optional)",e.name,e=>this._valueChanged("name",e))}

      <div class="select-row">
        ${cscSelectField("Device type",e.device_type??"cover",[{value:"cover",label:"Cover"},{value:"screen",label:"Screen"},{value:"awning",label:"Awning"}],e=>this._valueChanged("device_type",e))}
        ${cscSelectField("Control",e.default_control??"slider",[{value:"slider",label:"Slider"},{value:"buttons",label:"Buttons"}],e=>this._valueChanged("default_control",e))}
      </div>

      ${cscToggleField("Show name",!1!==e.show_name,e=>this._toggleChanged("show_name",e),"toggle-field-wide")}
      ${cscToggleField("Show state",!1!==e.show_state,e=>this._toggleChanged("show_state",e),"toggle-field-wide")}
      ${cscToggleField("Show percentage",!1!==e.show_percentage,e=>this._toggleChanged("show_percentage",e),"toggle-field-wide")}
      ${cscToggleField("Show last changed",!1!==e.show_last_changed,e=>this._toggleChanged("show_last_changed",e),"toggle-field-wide")}
      ${cscToggleField("Show control switch buttons",!0===e.show_control_switch_buttons,e=>this._toggleChanged("show_control_switch_buttons",e),"toggle-field-wide")}
      ${cscToggleField("Show favorites",!1!==e.show_favorites,e=>this._toggleChanged("show_favorites",e),"toggle-field-wide")}
      ${cscTextField("Favorite positions (comma-separated %)",(e.favorite_positions??[]).join(", "),e=>this._favoritePositionsChanged(e))}
    `}}customElements.define("chrono-slider-card-editor",ChronoSliderCardEditor);class ChronoSliderCard extends LitElement{static properties={_config:{state:!0},_entity:{state:!0},_relativeTime:{state:!0},_toggleMode:{state:!0}};constructor(){super(),this._stateStyleSheet=new CSSStyleSheet,this._userStyleSheet=new CSSStyleSheet}static getStubConfig(e){return{type:"custom:chrono-slider-card",entity:(e&&e.states?Object.keys(e.states):[]).find(e=>e.startsWith("cover."))||""}}static getConfigElement(){return document.createElement("chrono-slider-card-editor")}setConfig(e){if(!e.entity)throw new Error("You need to define an entity");this._config=e,this._deviceType="screen"===e.device_type||"awning"===e.device_type?e.device_type:"cover";const t=DEVICE_TYPE_DEFAULTS[this._deviceType];this._deviceOpenState=void 0!==e.device_open_state?!0===e.device_open_state:t.device_open_state,this._deviceOpenPercentage=void 0!==e.device_open_percentage?!0===e.device_open_percentage:t.device_open_percentage,this._deviceOpenSlider=void 0!==e.device_open_slider?!0===e.device_open_slider:t.device_open_slider,this._showName=void 0===e.show_name||!0===e.show_name,this._showState=void 0===e.show_state||!0===e.show_state,this._showLastChanged=void 0===e.show_last_changed||!0===e.show_last_changed,this._showPercentage=void 0===e.show_percentage||!0===e.show_percentage,this._favoritePositions=cscNormalizeFavoritePositions(Array.isArray(e.favorite_positions)&&e.favorite_positions.length?e.favorite_positions:DEFAULT_FAVORITE_POSITIONS),this._showControlSwitchButtons=void 0!==e.show_control_switch_buttons&&!0===e.show_control_switch_buttons,this._showFavorites=void 0===e.show_favorites||!0===e.show_favorites,this._defaultControl="buttons"===e.default_control||"slider"===e.default_control?e.default_control:"slider",this._toggleMode="buttons"===this._defaultControl?"button":"position",this._dragging=!1,this._dragValue=null;let o=e.styles;void 0===o||"object"==typeof o&&!Array.isArray(o)||(console.warn('chrono-slider-card: "styles" must be an object, ignoring.'),o={}),this._userStyleSheet.replaceSync(cscBuildUserStylesCss(o||{}))}set hass(e){if(this._hass=e,!this._config)return;const t=e.states[this._config.entity];t&&(this._entity=t,this._dragging||(this._relativeTime=cscRelativeTimeText(t.last_changed)))}get hass(){return this._hass}getCardSize(){return 6}getGridOptions(){return{min_columns:3}}connectedCallback(){super.connectedCallback(),this._relativeTimeInterval=setInterval(()=>{this._entity&&!this._dragging&&(this._relativeTime=cscRelativeTimeText(this._entity.last_changed))},3e4)}disconnectedCallback(){super.disconnectedCallback(),this._relativeTimeInterval&&clearInterval(this._relativeTimeInterval),this._teardownDragListeners()}firstUpdated(){this._containerEl=this.renderRoot.querySelector(".slider-container"),this._sliderEl=this.renderRoot.querySelector("#slider"),this._tooltipEl=this.renderRoot.querySelector(".tooltip"),this.renderRoot.adoptedStyleSheets=[...this.renderRoot.adoptedStyleSheets,this._stateStyleSheet,this._userStyleSheet]}_rawPosition(){if(!this._entity)return null;return null!=this._entity.attributes.current_position?this._entity.attributes.current_position:"open"===this._entity.state?100:0}_displayPercentage(e){return this._deviceOpenPercentage?e:100-e}_currentValue(){const e=this._rawPosition();return null==e?null:this._displayPercentage(e)}_sliderFraction(e){return this._deviceOpenSlider?e:100-e}_currentSliderValue(){const e=this._rawPosition();return null==e?null:this._sliderFraction(e)}_valueFromEvent(e){const t=this._sliderEl.getBoundingClientRect(),o=t.height-32.5-4,i=(e.clientY-t.top-16.25-2)/o*100;return Math.max(0,Math.min(100,Math.round(i)))}_paint(e){const t=e/100;if(this._containerEl&&this._containerEl.style.setProperty("--value",t.toString()),this._tooltipEl){const t=this._sliderFraction(e);this._tooltipEl.textContent=`${this._displayPercentage(t)}%`}}_onSliderPointerDown(e){e.preventDefault(),this._dragging=!0,this._containerEl?.classList.add("pressed"),this._tooltipEl?.classList.add("visible"),this._dragValue=this._valueFromEvent(e),this._paint(this._dragValue),this._boundPointerMove=this._boundPointerMove||(e=>this._onPointerMove(e)),this._boundPointerUp=this._boundPointerUp||(e=>this._onPointerUp(e)),window.addEventListener("pointermove",this._boundPointerMove),window.addEventListener("pointerup",this._boundPointerUp),window.addEventListener("pointercancel",this._boundPointerUp)}_onPointerMove(e){this._dragging&&(this._dragValue=this._valueFromEvent(e),this._paint(this._dragValue))}_onPointerUp(){if(!this._dragging)return;this._dragging=!1,this._containerEl?.classList.remove("pressed"),this._tooltipEl?.classList.remove("visible"),this._teardownDragListeners();const e=this._dragValue;if(this._dragValue=null,this._hass&&null!=this._config?.entity&&null!=e){const t=this._sliderFraction(e);this._hass.callService("cover","set_cover_position",{entity_id:this._config.entity,position:t})}}_teardownDragListeners(){this._boundPointerMove&&window.removeEventListener("pointermove",this._boundPointerMove),this._boundPointerUp&&(window.removeEventListener("pointerup",this._boundPointerUp),window.removeEventListener("pointercancel",this._boundPointerUp))}_callDirectional(e){if(!this._hass||!this._entity)return;const t=this._deviceOpenState?e:"open"===e?"close":"open";("open"===e?!cscCanOpenCover(this._entity,this._deviceOpenState):!cscCanCloseCover(this._entity,this._deviceOpenState))||this._hass.callService("cover",`${t}_cover`,{entity_id:this._config.entity})}_stopCover(){this._hass&&this._entity&&this._hass.callService("cover","stop_cover",{entity_id:this._config.entity})}_applyFavorite(e){if(!this._hass||!this._config?.entity)return;const t=this._deviceOpenPercentage?e:100-e;this._hass.callService("cover","set_cover_position",{entity_id:this._config.entity,position:t})}_setToggleMode(e){this._toggleMode=e}render(){if(!this._config||!this._entity)return html``;const e=this._entity,t=this._currentValue(),o=this._currentSliderValue(),i=this._deviceOpenState?e.state:{open:"closed",closed:"open",opening:"closing",closing:"opening"}[e.state]??e.state;let s="";switch(i){case"open":s="Opened";break;case"closed":s="Closed";break;case"opening":s="Opening";break;case"closing":s="Closing";break;default:s=i}const n=e.attributes.device_class,r=cscStateColorCssCover(e.state,n,"open"),a=cscStateColorCssCover(i,n);this._stateStyleSheet.replaceSync(`.control-slider-host { --state-cover-inactive-color: ${r}; --slider-color: ${a}; --slider-background: ${a}; }`);const l=!cscCanOpenCover(e,this._deviceOpenState),c=!cscCanCloseCover(e,this._deviceOpenState),d=!cscCanStopCover(e),h=this._deviceOpenState?cscComputeOpenIcon(e):cscComputeCloseIcon(e),p=this._deviceOpenState?cscComputeCloseIcon(e):cscComputeOpenIcon(e),u=this._showName?this._config.name||e.attributes.friendly_name||this._config.entity:"";return html`
      <ha-card class="ha-card">
        ${this._showName?html`<p class="card-title">${u}</p>`:""}

        <div class="state-header">
          ${this._showState?html`<p class="state">${s}</p>`:""}
          ${this._showPercentage?html`<p class="percentage">${t}%</p>`:""}
          ${this._showLastChanged?html`<p class="last-changed">${this._relativeTime??""}</p>`:""}
        </div>

        <div class="controls">
          <div class="main-control">
            <div
              class=${classMap({"control-slider-host":!0,active:"position"===this._toggleMode})}
            >
              <div
                class="slider-container"
                style=${styleMap({"--value":(o/100).toString()})}
                @pointerdown=${e=>this._onSliderPointerDown(e)}
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
                class=${classMap({"control-btn":!0,"control-btn-close":!0,disabled:c})}
                @click=${()=>this._callDirectional("close")}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24"><path d=${p}></path></svg>
              </button>
              <button
                class=${classMap({"control-btn":!0,"control-btn-stop":!0,disabled:d})}
                @click=${()=>this._stopCover()}
                aria-label="Stop"
              >
                <svg viewBox="0 0 24 24"><path d=${ICON_STOP}></path></svg>
              </button>
              <button
                class=${classMap({"control-btn":!0,"control-btn-open":!0,disabled:l})}
                @click=${()=>this._callDirectional("open")}
                aria-label="Open"
              >
                <svg viewBox="0 0 24 24"><path d=${h}></path></svg>
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
                    <svg viewBox="0 0 24 24"><path d=${ICON_MENU}></path></svg>
                  </button>
                  <button
                    class=${classMap({"icon-toggle-button":!0,"icon-toggle-button-button":!0,selected:"button"===this._toggleMode})}
                    @click=${()=>this._setToggleMode("button")}
                    aria-label="Button mode"
                  >
                    <svg viewBox="0 0 24 24"><path d=${ICON_SWAP_VERTICAL}></path></svg>
                  </button>
                </div>
              `:""}
        </div>

        ${this._showFavorites?html`
              <section class="favorites">
                ${this._favoritePositions.map(e=>html`
                    <div
                      class=${classMap({"favorite-button":!0,[`favorite-button-${e}`]:!0,active:e===t})}
                      @click=${()=>this._applyFavorite(e)}
                    >
                      <div class="button-inner"><span class="button-label">${e}%</span></div>
                    </div>
                  `)}
              </section>
            `:""}
      </ha-card>
    `}static styles=css`
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
      --slider-track-bar-border-radius: min(
        var(--slider-border-radius),
        var(--ha-border-radius-md, 12px)
      );
      top: 0;
      left: 0;
      border-radius: var(--slider-track-bar-border-radius);
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
  `}customElements.define("chrono-slider-card",ChronoSliderCard),window.customCards=window.customCards||[],window.customCards.push({type:"chrono-slider-card",name:"Chrono Slider Card",description:"Standalone dashboard card for cover-domain entities (blinds, shades, screens, awnings) with a configurable device type (cover/screen/awning) defining open/closed, percentage, and slider conventions.",preview:!0});
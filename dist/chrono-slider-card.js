import{LitElement,html,css}from"https://unpkg.com/lit@2.0.0/index.js?module";import{styleMap}from"https://unpkg.com/lit@2.0.0/directives/style-map.js?module";import{classMap}from"https://unpkg.com/lit@2.0.0/directives/class-map.js?module";import{live}from"https://unpkg.com/lit@2.0.0/directives/live.js?module";const CARD_VERSION="1.1.24",ICON_MENU="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",ICON_SWAP_VERTICAL="M9,3L5,7H8V14H10V7H13M16,17V10H14V17H11L15,21L19,17H16Z",ICON_ARROW_UP="M13,20H11V8L5.5,13.5L4.08,12.08L12,4.16L19.92,12.08L18.5,13.5L13,8V20Z",ICON_ARROW_DOWN="M11,4H13V16L18.5,10.5L19.92,11.92L12,19.84L4.08,11.92L5.5,10.5L11,16V4Z",ICON_ARROW_EXPAND_HORIZONTAL="M9,11H15V8L19,12L15,16V13H9V16L5,12L9,8V11Z",ICON_ARROW_COLLAPSE_HORIZONTAL="M13,20H11V14H5V16L1,12L5,8V10H11V4H13V10H19V8L23,12L19,16V14H13V20Z",ICON_STOP="M18,18H6V6H18V18Z";console.info("%c CHRONO-%cSLIDER%c-CARD %c v1.1.24 ","background-color: #101010; color: #FFFFFF; font-weight: bold; padding: 2px 0 2px 4px; border-radius: 3px 0 0 3px;","background-color: #101010; color: #4676d3; font-weight: bold; padding: 2px 0;","background-color: #101010; color: #FFFFFF; font-weight: bold; padding: 2px 4px 2px 0;","background-color: #1E1E1E; color: #FFFFFF; font-weight: bold; padding: 2px 4px; border-radius: 0 3px 3px 0;");const UNAVAILABLE="unavailable",HANDLE_MARGIN_PX=16.25,HANDLE_SIZE_PX=4,MODE_DEFAULTS={cover:{fill_direction:"retracts",default_control:"slider",show_name:!0,show_last_changed:!0,show_percentage:!0,show_control_switch_buttons:!1,show_favorites:!0,favorite_positions:[0,25,75,100]},awning:{fill_direction:"extends",default_control:"slider",show_name:!0,show_last_changed:!0,show_percentage:!0,show_control_switch_buttons:!1,show_favorites:!0,favorite_positions:[0,25,75,100]}};function cscComputeOpenIcon(t){switch(t.attributes.device_class){case"awning":case"door":case"gate":case"curtain":return ICON_ARROW_EXPAND_HORIZONTAL;default:return ICON_ARROW_UP}}function cscComputeCloseIcon(t){switch(t.attributes.device_class){case"awning":case"door":case"gate":case"curtain":return ICON_ARROW_COLLAPSE_HORIZONTAL;default:return ICON_ARROW_DOWN}}function cscIsFullyOpenCover(t){return void 0!==t.attributes.current_position?100===t.attributes.current_position:"open"===t.state}function cscIsFullyClosedCover(t){return void 0!==t.attributes.current_position?0===t.attributes.current_position:"closed"===t.state}function cscIsOpeningCover(t){return"opening"===t.state}function cscIsClosingCover(t){return"closing"===t.state}function cscCanOpenCover(t){if(t.state===UNAVAILABLE)return!1;return!0===t.attributes.assumed_state||!cscIsFullyOpenCover(t)&&!cscIsOpeningCover(t)}function cscCanCloseCover(t){if(t.state===UNAVAILABLE)return!1;return!0===t.attributes.assumed_state||!cscIsFullyClosedCover(t)&&!cscIsClosingCover(t)}function cscCanStopCover(t){return t.state!==UNAVAILABLE}function cscStateActiveCover(t){return"unavailable"!==t&&"unknown"!==t&&("off"!==t&&"closed"!==t)}function cscSlugifyState(t){return String(t).toLowerCase()}function cscDomainColorPropertiesCover(t,e,o){const i=[],n=cscSlugifyState(e),s=o?"active":"inactive";return t&&i.push(`--state-cover-${t}-${n}-color`),i.push(`--state-cover-${n}-color`,`--state-cover-${s}-color`,`--state-${s}-color`),i}function cscComputeCssVariable(t){return t.reduceRight((t,e)=>`var(${e}${t?`, ${t}`:""})`,void 0)}function cscStateColorCssCover(t,e,o){const i=void 0!==o?o:t;if("unavailable"===i)return"var(--state-unavailable-color)";return cscComputeCssVariable(cscDomainColorPropertiesCover(e,i,cscStateActiveCover(i)))}function cscNormalizeFavoritePositions(t){if(!t)return[];const e=new Set,o=[];for(const i of t){const t=Number(i);if(isNaN(t))continue;const n=Math.max(0,Math.min(100,t));e.has(n)||(e.add(n),o.push(n))}return o}function cscRelativeTimeText(t){const e=new Date(t).getTime(),o=Date.now(),i=Math.round((o-e)/1e3),n=new Intl.RelativeTimeFormat(void 0,{numeric:"auto"}),s=[["year",31536e3],["month",2592e3],["day",86400],["hour",3600],["minute",60],["second",1]];for(const[t,e]of s)if(Math.abs(i)>=e||"second"===t){const o=Math.round(i/e);return n.format(-o,t)}return""}function cscToKebab(t){return String(t).replace(/_/g,"-")}function cscBuildUserStylesCss(t){let e="";for(const[o,i]of Object.entries(t)){if(!i||"object"!=typeof i||Array.isArray(i))continue;const t=Object.entries(i).map(([t,e])=>`${cscToKebab(t)}: ${e};`).join(" ");e+=`.${cscToKebab(o)} { ${t} }\n`}return e}function cscTextField(t,e,o,i={}){return html`
    <div class="csc-field">
      <label>${t}</label>
      <chrono-csc-textfield
        .value=${String(e??"")}
        placeholder=${i.placeholder??""}
        @input=${o}
      ></chrono-csc-textfield>
    </div>
  `}function cscToggleField(t,e,o){return html`
    <div class="csc-toggle-field">
      <label>${t}</label>
      <ha-switch .checked=${e} @change=${o}></ha-switch>
    </div>
  `}function cscSelectField(t,e,o,i){return html`
    <div class="csc-field">
      <label>${t}</label>
      <select @change=${i}>
        ${o.map(t=>html`<option value=${t.value} ?selected=${t.value===e}>${t.label}</option>`)}
      </select>
    </div>
  `}class CscTextfield extends LitElement{static properties={value:{type:String},placeholder:{type:String}};static styles=css`
    :host {
      display: block;
      width: 100%;
    }
    input {
      display: block;
      width: 100%;
      box-sizing: border-box;
      height: 40px;
      padding: 0 8px;
      background: var(--input-fill-color, rgba(0, 0, 0, 0.06));
      border: none;
      border-bottom: 1px solid var(--secondary-text-color, #888);
      border-radius: 4px 4px 0 0;
      color: var(--primary-text-color);
      font-size: 14px;
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
        placeholder=${this.placeholder??""}
        @input=${t=>{this.value=t.target.value,this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0}))}}
      >
    `}}customElements.define("chrono-csc-textfield",CscTextfield);class ChronoSliderCardEditor extends LitElement{static properties={hass:{attribute:!1},_config:{state:!0}};setConfig(t){this._config=t}_emit(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}_entityChanged(t){this._config&&(this._config={...this._config,entity:t.detail.value},this._emit())}_valueChanged(t,e){if(!this._config)return;const o=e.target.value??e.detail?.value,i={...this._config};"fill_direction"===t&&""===o?delete i.fill_direction:i[t]=o,this._config=i,this._emit()}_toggleChanged(t,e){this._config&&(this._config={...this._config,[t]:e.target.checked},this._emit())}_favoritePositionsChanged(t){if(!this._config)return;const e=(t.target.value??"").split(",").map(t=>t.trim()).filter(t=>""!==t);this._config={...this._config,favorite_positions:cscNormalizeFavoritePositions(e)},this._emit()}static styles=css`
    .csc-field {
      margin-bottom: 16px;
    }
    .csc-field label {
      display: block;
      font-size: 12px;
      color: var(--secondary-text-color);
      margin-bottom: 4px;
    }
    .csc-toggle-field {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    select {
      width: 100%;
      height: 40px;
      box-sizing: border-box;
      background: var(--input-fill-color, rgba(0, 0, 0, 0.06));
      border: none;
      border-bottom: 1px solid var(--secondary-text-color, #888);
      border-radius: 4px 4px 0 0;
      color: var(--primary-text-color);
      font-family: inherit;
      font-size: 14px;
    }
  `;render(){if(!this._config)return html``;const t=this._config;return html`
      <div class="csc-field">
        <label>Entity</label>
        <ha-selector
          .hass=${this.hass}
          .selector=${{entity:{domain:"cover"}}}
          .value=${t.entity??""}
          @value-changed=${t=>this._entityChanged(t)}
        ></ha-selector>
      </div>

      ${cscTextField("Name (optional)",t.name,t=>this._valueChanged("name",t))}
      ${cscToggleField("Show name",!1!==t.show_name,t=>this._toggleChanged("show_name",t))}
      ${cscToggleField("Show last changed",!1!==t.show_last_changed,t=>this._toggleChanged("show_last_changed",t))}
      ${cscToggleField("Show percentage",!1!==t.show_percentage,t=>this._toggleChanged("show_percentage",t))}

      ${cscSelectField("Mode",t.mode??"cover",[{value:"cover",label:"Cover"},{value:"awning",label:"Awning"}],t=>this._valueChanged("mode",t))}
      ${cscSelectField("Fill direction",t.fill_direction??"",[{value:"",label:"(mode default)"},{value:"extends",label:"Extends"},{value:"retracts",label:"Retracts"}],t=>this._valueChanged("fill_direction",t))}
      ${cscSelectField("Default control",t.default_control??"slider",[{value:"slider",label:"Slider"},{value:"buttons",label:"Buttons"}],t=>this._valueChanged("default_control",t))}

      ${cscToggleField("Show control switch buttons",!0===t.show_control_switch_buttons,t=>this._toggleChanged("show_control_switch_buttons",t))}
      ${cscToggleField("Show favorites",!1!==t.show_favorites,t=>this._toggleChanged("show_favorites",t))}
      ${cscTextField("Favorite positions (comma-separated %)",(t.favorite_positions??[]).join(", "),t=>this._favoritePositionsChanged(t))}
    `}}customElements.define("chrono-slider-card-editor",ChronoSliderCardEditor);class ChronoSliderCard extends LitElement{static properties={_config:{state:!0},_entity:{state:!0},_relativeTime:{state:!0},_toggleMode:{state:!0}};static getStubConfig(t){return{type:"custom:chrono-slider-card",entity:(t&&t.states?Object.keys(t.states):[]).find(t=>t.startsWith("cover."))||""}}static getConfigElement(){return document.createElement("chrono-slider-card-editor")}setConfig(t){if(!t.entity)throw new Error("You need to define an entity");this._config=t,this._mode="awning"===t.mode?"awning":"cover";const e=MODE_DEFAULTS[this._mode];this._fillDirection="extends"===t.fill_direction||"retracts"===t.fill_direction?t.fill_direction:e.fill_direction,this._showName=void 0!==t.show_name?!0===t.show_name:e.show_name,this._showLastChanged=void 0!==t.show_last_changed?!0===t.show_last_changed:e.show_last_changed,this._showPercentage=void 0!==t.show_percentage?!0===t.show_percentage:e.show_percentage,this._favoritePositions=cscNormalizeFavoritePositions(Array.isArray(t.favorite_positions)&&t.favorite_positions.length?t.favorite_positions:e.favorite_positions),this._showControlSwitchButtons=void 0!==t.show_control_switch_buttons?!0===t.show_control_switch_buttons:e.show_control_switch_buttons,this._showFavorites=void 0!==t.show_favorites?!0===t.show_favorites:e.show_favorites,this._defaultControl="buttons"===t.default_control||"slider"===t.default_control?t.default_control:e.default_control,this._toggleMode="buttons"===this._defaultControl?"button":"position",this._dragging=!1,this._dragValue=null;let o=t.styles;void 0===o||"object"==typeof o&&!Array.isArray(o)||(console.warn('chrono-slider-card: "styles" must be an object, ignoring.'),o={}),this._userStylesCss=cscBuildUserStylesCss(o||{})}set hass(t){if(this._hass=t,!this._config)return;const e=t.states[this._config.entity];e&&(this._entity=e,this._dragging||(this._relativeTime=cscRelativeTimeText(e.last_changed)))}get hass(){return this._hass}getCardSize(){return 6}getGridOptions(){return{columns:4,min_columns:3}}connectedCallback(){super.connectedCallback(),this._relativeTimeInterval=setInterval(()=>{this._entity&&!this._dragging&&(this._relativeTime=cscRelativeTimeText(this._entity.last_changed))},3e4)}disconnectedCallback(){super.disconnectedCallback(),this._relativeTimeInterval&&clearInterval(this._relativeTimeInterval),this._teardownDragListeners()}firstUpdated(){this._containerEl=this.renderRoot.querySelector(".container"),this._sliderEl=this.renderRoot.querySelector("#slider"),this._tooltipEl=this.renderRoot.querySelector(".tooltip")}_currentValue(){if(!this._entity)return null;const t=null!=this._entity.attributes.current_position?this._entity.attributes.current_position:"open"===this._entity.state?100:0;return"retracts"===this._fillDirection?100-t:t}_valueFromEvent(t){const e=this._sliderEl.getBoundingClientRect(),o=e.height-32.5-4,i=(t.clientY-e.top-16.25-2)/o*100;return Math.max(0,Math.min(100,Math.round(i)))}_paint(t){const e=t/100;this._containerEl&&this._containerEl.style.setProperty("--value",e.toString()),this._tooltipEl&&(this._tooltipEl.textContent=`${t}%`)}_onSliderPointerDown(t){t.preventDefault(),this._dragging=!0,this._containerEl?.classList.add("pressed"),this._tooltipEl?.classList.add("visible"),this._dragValue=this._valueFromEvent(t),this._paint(this._dragValue),this._boundPointerMove=this._boundPointerMove||(t=>this._onPointerMove(t)),this._boundPointerUp=this._boundPointerUp||(t=>this._onPointerUp(t)),window.addEventListener("pointermove",this._boundPointerMove),window.addEventListener("pointerup",this._boundPointerUp),window.addEventListener("pointercancel",this._boundPointerUp)}_onPointerMove(t){this._dragging&&(this._dragValue=this._valueFromEvent(t),this._paint(this._dragValue))}_onPointerUp(){if(!this._dragging)return;this._dragging=!1,this._containerEl?.classList.remove("pressed"),this._tooltipEl?.classList.remove("visible"),this._teardownDragListeners();const t=this._dragValue;if(this._dragValue=null,this._hass&&null!=this._config?.entity&&null!=t){const e="retracts"===this._fillDirection?100-t:t;this._hass.callService("cover","set_cover_position",{entity_id:this._config.entity,position:e})}}_teardownDragListeners(){this._boundPointerMove&&window.removeEventListener("pointermove",this._boundPointerMove),this._boundPointerUp&&(window.removeEventListener("pointerup",this._boundPointerUp),window.removeEventListener("pointercancel",this._boundPointerUp))}_callDirectional(t){if(!this._hass||!this._entity)return;const e="retracts"===this._fillDirection?"open"===t?"close":"open":t;("open"===e?!cscCanOpenCover(this._entity):!cscCanCloseCover(this._entity))||this._hass.callService("cover",`${e}_cover`,{entity_id:this._config.entity})}_stopCover(){this._hass&&this._entity&&this._hass.callService("cover","stop_cover",{entity_id:this._config.entity})}_applyFavorite(t){if(!this._hass||!this._config?.entity)return;const e="retracts"===this._fillDirection?100-t:t;this._hass.callService("cover","set_cover_position",{entity_id:this._config.entity,position:e})}_setToggleMode(t){this._toggleMode=t}render(){if(!this._config||!this._entity)return html``;const t=this._entity,e=this._currentValue();let o="";switch(t.state){case"open":o="Opened";break;case"closed":o="Closed";break;case"opening":o="Opening";break;case"closing":o="Closing";break;default:o=t.state}const i=t.attributes.device_class,n=cscStateColorCssCover(t.state,i,"open"),s=cscStateColorCssCover(t.state,i),r="retracts"===this._fillDirection?"close":"open",a="retracts"===this._fillDirection?"open":"close",l="open"===r?!cscCanOpenCover(t):!cscCanCloseCover(t),c="open"===a?!cscCanOpenCover(t):!cscCanCloseCover(t),d=!cscCanStopCover(t),h=cscComputeCloseIcon(t),p=cscComputeOpenIcon(t),u=this._showName?this._config.name||t.attributes.friendly_name||this._config.entity:"";return html`
      <ha-card class="ha-card">
        <style>${this._userStylesCss}</style>
        ${this._showName?html`<p class="card-title">${u}</p>`:""}

        <div class="state-header">
          <p class="state">${o}</p>
          ${this._showPercentage?html`<p class="percentage">${e}%</p>`:""}
          ${this._showLastChanged?html`
                <div class="time-row">
                  <p class="last-changed">${this._relativeTime??""}</p>
                </div>
              `:""}
        </div>

        <div class="controls">
          <div class="main-control">
            <div
              class=${classMap({"control-slider-host":!0,active:"position"===this._toggleMode})}
              style=${styleMap({"--state-cover-inactive-color":n,"--control-slider-color":s,"--control-slider-background":s})}
            >
              <div
                class="container"
                style=${styleMap({"--value":(e/100).toString()})}
                @pointerdown=${t=>this._onSliderPointerDown(t)}
              >
                <div id="slider" class="slider" role="slider" tabindex="0" aria-orientation="vertical">
                  <div class="slider-track-background"></div>
                  <div class="slider-track-bar show-handle"></div>
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
              <div class="favorites-groups">
                <div class="favorites-group">
                  <section class="favorites-container">
                    ${this._favoritePositions.map(t=>html`
                        <div
                          class=${classMap({"favorite-button":!0,[`favorite-button-${t}`]:!0,active:t===e})}
                          @click=${()=>this._applyFavorite(t)}
                        >
                          <div class="button-inner"><span class="button-label">${t}%</span></div>
                        </div>
                      `)}
                  </section>
                </div>
              </div>
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
      text-align: center;
    }
    .state-header p {
      margin: 0;
    }
    .state-header .state {
      display: inline-block;
      font-style: normal;
      font-weight: var(--ha-font-weight-normal, 400);
      font-size: 32px;
      line-height: var(--ha-line-height-condensed, 1.2);
    }
    .state-header .percentage {
      display: inline-block;
      font-style: normal;
      font-size: var(--ha-font-size-l, 16px);
      font-weight: var(--ha-font-weight-medium, 500);
      line-height: var(--ha-line-height-normal, 1.5);
    }
    .state-header .time-row {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--ha-space-5, 20px);
    }
    .state-header .last-changed {
      display: inline-block;
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
    .favorite-button .button-inner {
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
    .favorite-button .button-inner::before {
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
    .favorite-button .button-label {
      position: relative;
      z-index: 1;
      opacity: 0.95;
    }
    .favorite-button.active .button-inner::before {
      background-color: var(--state-cover-active-color, var(--primary-color));
    }
  `}customElements.define("chrono-slider-card",ChronoSliderCard),window.customCards=window.customCards||[],window.customCards.push({type:"chrono-slider-card",name:"Chrono Slider Card",description:"Standalone dashboard card for cover-domain entities (blinds, shades, screens, awnings) with configurable mode (cover/awning) and fill_direction (extends/retracts).",preview:!0});
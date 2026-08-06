  
 <div align="center">

  [![](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)
  [![](https://img.shields.io/badge/License-AGPL_3.0-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/agpl-3.0)
  [![](https://img.shields.io/github/v/release/rob-vandenberg/chrono-slider-card?style=for-the-badge&color=brightgreen&label=Version)](https://github.com/rob-vandenberg/chrono-slider-card/releases)

  <img src="art/header.svg" width="780" alt="Chrono Slider Card Banner">

  <img src="art/banner.png" width="800" alt="Chrono Slider Card in action">

  <p align="center">
    <strong>A vertical slider card for your covers, screens, and awnings.<br>
            Open means whatever makes sense for your device - your way.<br>
            Set up entirely with a visual editor - no YAML needed.</strong>
  </p>

  <p align="center">
    <a href="#introduction">Introduction</a> •
    <a href="#key-features">Key Features</a> •
    <a href="#installation">Installation</a> •
    <a href="#usage">Usage</a> •
    <a href="#license">License</a>
  </p>

</div>

---

**Chrono Slider Card** is a dashboard card for any `cover` domain entity - blinds, shades, screens, and awnings. It gives you a full-height vertical slider you drag or tap to set position, directional open/stop/close buttons, and a set of favorite positions you can jump to in one tap. On top of that, it fixes a long-standing Home Assistant limitation: for an awning, "open" should mean extended, not retracted. Choose the convention that matches your device, per entity, right from the editor.

---

## 📋 Table of Contents

- [Introduction](#introduction)
- [Key Features](#key-features)
- [Installation](#installation)
  - [HACS (Recommended)](#hacs-recommended)
  - [Manual Installation](#manual-installation)
- [Uninstallation](#uninstallation)
- [Usage](#usage)
  - [Adding the Card](#adding-the-card)
  - [Options](#options)
  - [Custom Styling](#-custom-styling)
- [Limitations](#limitations)
- [License](#license)
- [Support](#support)

---

## 🚀 Key Features

### 🎯 Awning-Correct, By Choice
Home Assistant's native model treats "open" as retracted - correct for a blind, wrong for an awning. Chrono Slider Card lets each entity independently choose `cover` mode (native HA semantics) or `awning` mode (open = extended, blocking the sun), with the slider fill, the state text, and every button all consistent with whichever convention you pick.

### 🖐️ Drag, Tap, or Click
A full-height vertical slider you can drag to any position, or tap a favorite position for an instant jump. A live percentage tooltip follows your finger while you drag.

### 🔀 Slider or Buttons, Your Call
Switch between the position slider and simple open/stop/close buttons, either as the card's default control or live, on demand, with a toggle right on the card.

### ⭐ Favorite Positions
Set any number of one-tap favorite positions - not just open and closed. The default set is 0%, 25%, 75%, and 100%, fully customizable.

### 👁️ Show or Hide Anything
Turn off the name, the percentage, the relative-time label, the favorites row, or the slider/buttons toggle. Build the exact card you want.

### 🎨 Custom CSS, From YAML
Every element on the card - card, title, state, buttons, slider, favorites, and more - can be restyled directly from your dashboard config with a `styles:` block. No editing the card's source, no browser dev tools required.

### 📐 Fits Any Dashboard
The card sizes itself to its own content and shrinks gracefully with the grid column width. It works the same in masonry, sections, and panel views, with no layout code needed.

### 🎨 Matches Your Theme
Colors come from your Home Assistant theme automatically, the same way the native more-info dialog's cover controls do.

---

## 📦 Installation

### HACS (Recommended)

1. Open **HACS** in your Home Assistant instance.
2. Navigate to **Frontend** and click the three-dot menu in the top right corner.
3. Select **Custom repositories**.
4. Enter `https://github.com/rob-vandenberg/chrono-slider-card` and select **Lovelace** as the category.
5. Click **Add**. The repository will appear in the list.
6. Search for `Chrono Slider Card` and click **Download**.
7. Reload your browser.

### Manual Installation

1. Download `chrono-slider-card.js` from the [latest release](https://github.com/rob-vandenberg/chrono-slider-card/releases/latest).
2. Copy it to your Home Assistant `config/www/` folder.
3. In Home Assistant, go to **Settings → Dashboards → Resources**.
4. Click **Add Resource**.
5. Enter `/local/chrono-slider-card.js` as the URL and select **JavaScript Module**.
6. Click **Create** and reload your browser.

---

## 🗑️ Uninstallation

### Via HACS
1. Open **HACS → Frontend**.
2. Find **Chrono Slider Card** and click the three-dot menu.
3. Select **Remove**.
4. Reload your browser.

### Manual
1. Delete `chrono-slider-card.js` from `config/www/`.
2. Remove the resource entry from **Settings → Dashboards → Resources**.
3. Remove any cards using `chrono-slider-card` from your dashboards.

---

<img src="art/slider-card.png" alt="Chrono Slider Card showing a cover entity">

---

## ⚙️ Usage

### Adding the Card

1. Open a dashboard and click **Edit Dashboard**.
2. Click **Add Card**.
3. Search for **Chrono Slider Card**.
4. Pick a `cover` entity from the dropdown.
5. Use the editor to choose mode, fill direction, and what's shown or hidden.

<img src="art/slider-editor.png" alt="Chrono Slider Card visual editor">

If you'd rather write YAML directly, here's a full example:

```yaml
type: custom:chrono-slider-card
entity: cover.living_room_awning
name: Living Room Awning
mode: awning
show_name: true
show_percentage: true
show_last_changed: true
show_control_switch_buttons: false
show_favorites: true
default_control: slider
favorite_positions:
  - 0
  - 25
  - 75
  - 100
```

### Options

| Key | Type | Default | What it does |
| :--- | :--- | :--- | :--- |
| `entity` | text | required | The `cover` entity to control. |
| `name` | text | (none) | A custom name to show above the card. Leave it out to use the entity's own name. |
| `mode` | `cover`/`awning` | `cover` | Selects the default `fill_direction` below. `cover` matches native Home Assistant (open = retracted). `awning` matches the "cloth of the awning" model (open = extended). |
| `fill_direction` | `extends`/`retracts` | (from `mode`) | Overrides the `mode` default directly, if you need to. `extends` means the fill grows as the cover extends. `retracts` means the fill grows as the cover retracts. |
| `favorite_positions` | list of numbers | `[0, 25, 75, 100]` | The one-tap favorite positions shown below the slider. Any number of entries is supported. |
| `show_name` | `true`/`false` | `true` | Shows the name above the card. |
| `show_percentage` | `true`/`false` | `true` | Shows the position percentage under the state text. |
| `show_last_changed` | `true`/`false` | `true` | Shows the relative-time label under the state text (e.g. "3 hours ago"). |
| `show_control_switch_buttons` | `true`/`false` | `false` | Shows the toggle icons that switch the card between the slider and the open/stop/close buttons. |
| `show_favorites` | `true`/`false` | `true` | Shows the row of favorite-position buttons. |
| `default_control` | `slider`/`buttons` | `slider` | Which control is shown by default when the card loads. |
| `styles` | object | (none) | Advanced: restyle individual elements of the card directly from YAML. See [Custom Styling](#-custom-styling) below. |

Using a top-level key that isn't in this list, or a value that isn't valid, won't break the card - it's just ignored.

### 🎨 Custom Styling

Every visual piece of the card can be restyled directly from your dashboard config, without touching the card's source or your browser's dev tools. Under `styles:`, each entry is a CSS class name (written with underscores instead of dashes) paired with the CSS properties you want to change on it (also written with underscores):

```yaml
type: custom:chrono-slider-card
entity: cover.living_room_blind
styles:
  slider:
    border_width: 2px
    border_style: solid
    border_color: '#ff0000'
  favorite_button:
    border_radius: 4px
```

The class names match exactly what you'd find inspecting the card with your browser's dev tools (underscores instead of dashes). A handful of the most useful ones: `card`, `title`, `state`, `percentage`, `last_changed`, `slider`, `control_button_group`, `control_btn`, `icon_button_group`, `icon_toggle_button`, `favorites_container`, `favorite_button`.

Some elements exist as more than one instance on the card - the three directional buttons, the two mode-toggle buttons, and the favorite-position buttons. Styling their shared class (e.g. `control_btn`, `icon_toggle_button`, `favorite_button`) changes all of them at once. To style just one, use its own specific class instead: `control_btn_close` / `control_btn_stop` / `control_btn_open` for the directional buttons, `icon_toggle_button_position` / `icon_toggle_button_button` for the mode-toggle buttons, and `favorite_button_<value>` (e.g. `favorite_button_30`) for an individual favorite position.

There's no validation on `styles:` - any class name and any CSS property is accepted and applied exactly as written, even if it doesn't match anything on the card or doesn't make visual sense. This gives you full control, but also means a typo will silently do nothing rather than warn you.

---

## ⚠️ Limitations

- Only entities from the `cover` domain are supported.
- One entity per card. Add another card for another entity.
- The card controls a single entity's position directly - it doesn't group or synchronize multiple covers. Grouping is a possible future feature, not currently supported.
- Dragging the slider relies on pointer events; very old browsers without pointer event support aren't tested.

---

## ⚖️ License

**GNU Affero General Public License v3.0 (AGPL-3.0)**

This project is licensed under the AGPL-3.0. You are free to use, modify, and distribute this software, provided that any modifications or derivative works that are made available — including over a network — are also distributed under the same license.

Full license text: [https://www.gnu.org/licenses/agpl-3.0](https://www.gnu.org/licenses/agpl-3.0)

Copyright © 2026 Rob Vandenberg. All rights reserved.

---

## ☕ Support

If you find this project useful and wish to support its continued development, please consider a contribution.

[![](https://img.shields.io/badge/Buy_Me_A_Coffee-Support-yellow.svg?style=for-the-badge)](https://www.buymeacoffee.com/robvandenberg)

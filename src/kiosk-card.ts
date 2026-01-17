import { css, CSSResultGroup, html, LitElement } from "lit";
import { state } from "lit/decorators.js";
import { querySelectorDeep } from "query-selector-shadow-dom";
import { type HomeAssistant, type LovelaceCardConfig, type LovelaceCard } from 'custom-card-helpers';
import { UtilityCard } from "./utils/utility-card";

const NAME = 'kiosk-card';
const EDITOR_NAME = `${NAME}-editor`;

export const card = {
  type: NAME,
  name: 'Catdad: Kiosk Card',
  description: 'Hide the navigation UI for the dashboard where this card is rendered'
};

class KioskCard extends UtilityCard implements LovelaceCard {
  @state() private _config?: LovelaceCardConfig;
  @state() private _editMode: boolean = false;

  protected readonly name: string = NAME;

  private _hass?: HomeAssistant;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  set editMode(editMode: boolean) {
    this._editMode = editMode;

    if (editMode) {
      this.disable();
    } else {
      this.enable();
    }
  }

  public async getCardSize(): Promise<number> {
    return this._editMode ? 4 : 0;
  }

  public setConfig(config: LovelaceCardConfig): void {
    this._config = Object.assign({}, KioskCard.getStubConfig(), config);
  }

  private enable(): void {
    try {
      const header = querySelectorDeep('ha-panel-lovelace .header');
      const view = querySelectorDeep('ha-panel-lovelace hui-view-container');
      const thisCard = querySelectorDeep('kiosk-card');

      this.logger.debug('kiosk mode got elements:', { header, view, thisCard });

      // when this card is not being rendered, it should not apply kiosk mode
      if (!thisCard) {
        return;
      }

      if (!header || !view) {
        throw new Error('could not find necessary elements to apply kiosk mode');
      }

      if (this._editMode) {
        header.style.removeProperty('display');
        view.style.removeProperty('padding-top');
      } else {
        header.style.display = 'none';
        view.style.paddingTop = '0px';
      }
    } catch (e) {
      this.logger.error('failed to connect kiosk mode', e);
    }
  }

  private disable(): void {
    try {
      const header = querySelectorDeep('ha-panel-lovelace .header');
      const view = querySelectorDeep('ha-panel-lovelace hui-view-container');

      this.logger.debug('kiosk mode got elements:', { header, view });

      if (!header || !view) {
        throw new Error('could not find necessary elements to disconnect kiosk mode');
      }

      header.style.removeProperty('display');
      view.style.removeProperty('padding-top');
    } catch (e) {
      this.logger.error('failed to disconnect kiosk mode', e);
    }
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.logger.debug('Kiosk card connected', this._editMode);
    this.enable();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.logger.debug('Kiosk card disconnected');
    this.disable();
  }

  protected render() {
    const styles = [
      'padding: var(--spacing, 12px)',
      'display: flex',
      'align-items: center',
      'justify-content: center',
    ];

    return html`
      <ha-card style=${`${this._editMode ? '' : 'display: none'}`}>
        <div class="catdad-kiosk-card" style=${styles.join(';')}>Kiosk mode card placeholder</div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        overflow: hidden;
      }
    `;
  }

  public static getConfigElement() {
    return document.createElement(EDITOR_NAME);
  }

  static getStubConfig() {
    return {
      type: `custom:${NAME}`,
    };
  }
}

class KioskCardEditor extends LitElement {
  setConfig() {}
  configChanged() {}

  render() {
    return html`<div style="max-width: 80ch;">
      <p>
        When this card is used, it will remove the navigation header from the dashboard it is on.
        The card itself will never actually show in your dashboard, but will display a placeholder
        when in edit more, so you can edit or remove it easily.
      </p>
      <p>
        While it has no configuration opions on this screen, you can use the "Visibility" tab to
        configure rules for when this card will take effect. This card will only work when it is
        "rendered" on the page. Meaning, if you define visibility rules, kiosk mode will only be
        applied when the card is deemed "visible".
      </p>
      <p>
        Consider using something like
        <a href="https://github.com/joseluis9595/lovelace-navbar-card" rel="noopener noreferrer" target="_blank">
          navbar card
        </a>
        to create a custom navigation experience.
      </p>
    </div>`;
  }
}

customElements.define(NAME, KioskCard);
customElements.define(EDITOR_NAME, KioskCardEditor);

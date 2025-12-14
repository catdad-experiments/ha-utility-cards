import { css, CSSResultGroup, html, LitElement } from "lit";
import { state } from "lit/decorators.js";
import { querySelectorDeep } from "query-selector-shadow-dom";
import { type HomeAssistant, type LovelaceCardConfig, type LovelaceCard } from 'custom-card-helpers';
import { type Interval, type Timer, LOG, isDate, isNumber, sleep } from './utils';

const NAME = 'catdad-auto-light-dark-mode-card' as const;

type Config = LovelaceCardConfig & {
  type: `custom:${typeof NAME}`;
  // HA doesn't seem to assert the `required` properties
  debug?: boolean;
};

const second = 1000;
const minute = second * 60;

export const card = {
  type: NAME,
  name: 'Catdad: Auto Light/Dark Mode Card',
  description: 'Automatically switch between light and dark mode for your dashboard'
};

class AutoReloadCard extends LitElement implements LovelaceCard {
  @state() private _config?: Config;
  @state() private _editMode: boolean = false;
  @state() private _debug: boolean = false;

  private _hass?: HomeAssistant;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  set editMode(editMode: boolean) {
    this._editMode = editMode;
  }

  public getCardSize(): number {
    return this.showCard() ? 4 : 0;
  }

  public setConfig(config: Config): void {
    this._config = Object.assign({}, AutoReloadCard.getStubConfig(), config);
    this._debug = !!this._config?.debug;
  }

  private showCard(): boolean {
    return this._debug || this._editMode;
  }

  connectedCallback(): void {
    super.connectedCallback();
    LOG('light/dark mode card mounted');
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    LOG('light/dark mode card unmounted');
  }

  protected render() {
    const styles = [
      'padding: var(--spacing, 12px)',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'flex-direction: column',
      'gap: calc(var(--spacing, 12px) / 4)',
    ];

    const placeholder = this._debug
      ? 'Set theme mode:'
      : this._editMode
        ? 'Auto light/dark mode card placeholder'
        : '👋';

    const debugElem = this._debug
      ? html`
          <ha-control-button style="width: 100%" @click="${() => {
            console.log('click');
          }}">
            <button type="button" class="button">Button</button>
          </ha-control-button>
        `
      : null;

    return html`
      <ha-card style=${`${this.showCard() ? '' : 'display: none'}`}>
        <div style=${styles.join(';')}>
          <div>${placeholder}</div>
          ${debugElem}
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        overflow: hidden;
      }

      .button {
        position: relative;
        display: block;
        height: var(--feature-height, 42px);
        width: 100%;
        margin: 0;
        padding: var(--control-button-padding);
        outline: 0;
        border: none;
        border-radius: var(--control-button-border-radius);
        cursor: pointer;

        font-family: var(--ha-font-family-body);
        font-weight: var(--ha-font-weight-medium);
        background: 0 0;
        font-size: inherit;
        transition: box-shadow 180ms ease-in-out, color 180ms ease-in-out;
        color: var(--control-button-icon-color);
      }
    `;
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'debug', selector: { boolean: {} } },
      ],
      computeLabel: (schema) => {
        switch (schema.name) {
          case 'debug':
            return 'Render card with manual controls over theme mode';
          default:
            return undefined;
        }
      },
      computeHelper: (schema) => {
        switch (schema.name){
          default:
            return undefined;
        }

      }
    };
  }

  static getStubConfig(): Partial<Config> & Pick<Config, 'type'> {
    return {
      type: `custom:${NAME}`,
    };
  }
}

customElements.define(NAME, AutoReloadCard);

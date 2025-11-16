import { css, CSSResultGroup, html, LitElement } from "lit";
import { state } from "lit/decorators.js";
import { type HomeAssistant, type LovelaceCardConfig, type LovelaceCard } from 'custom-card-helpers';
import { resolveColor } from './utils';

const NAME = 'catdad-back-button-card';

export const card = {
  type: NAME,
  name: 'Catdad: Back Button Card',
  description: 'Add a back button anywhere on your dashboard'
};

class BackButtonCard extends LitElement implements LovelaceCard {
  @state() private _config: LovelaceCardConfig = BackButtonCard.getStubConfig();
  @state() private _editMode: boolean = false;

  private _hass?: HomeAssistant;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  set editMode(editMode: boolean) {
    this._editMode = editMode;
  }

  public async getCardSize(): Promise<number> {
    return 1;
  }

  public getGridOptions() {
    return {
      columns: 6,
      rows: 1,
      min_columns: 3,
      min_rows: 1
    };
  }

  public setConfig(config: LovelaceCardConfig): void {
    this._config = Object.assign({}, BackButtonCard.getStubConfig(), config);
  }

  protected render() {
    const icon = this._config.icon;
    const text = this._config.text;
    const color = this._config.color;

    return html`
      <ha-card style="--tile-color: ${resolveColor(color)}" @click=${() => {
        window.history.back();
      }}>
        ${icon && html`
          <div class="icon-container">
            <ha-state-icon
              slot="icon"
              .icon=${icon}
              .stateObj=${undefined}
              .hass=${this._hass}
            ></ha-state-icon>
          </div>
        `}
        ${text && html`
          <ha-tile-info
            id="info"
            .primary=${text}
            .secondary=${undefined}
          ></ha-tile-info>
        `}
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        overflow: hidden;
        padding: var(--spacing, 12px);
        display: flex;
        align-items: center;
        height: 100%;
      }

      .icon-container {
        position: relative;
        flex: none;
        margin-right: 10px;
        margin-inline-start: initial;
        margin-inline-end: 10px;
        direction: var(--direction);
        transition: transform 180ms ease-in-out;
      }

      .icon-container ha-state-icon {
        --tile-icon-color: var(--tile-color);
        --icon-primary-color: var(--tile-color);
        padding: 6px;
        user-select: none;
      }
    `;
  }

  static getConfigForm() {
    return {
      schema: [
        { name: "text", selector: { text: {} } },
        {
          type: "grid",
          name: "",
          schema: [
            {
              name: "icon",
              selector: {
                icon: {},
              },
            },
            {
              name: "color",
              selector: {
                ui_color: {
                  default_color: "state",
                  include_state: true,
                },
              },
            },
          ],
        },
      ],
    };
  }

  static getStubConfig() {
    return {
      type: `custom:${NAME}`,
      text: 'Back',
      icon: 'mdi:arrow-left',
      color: 'white',
    };
  }
}

customElements.define(NAME, BackButtonCard);

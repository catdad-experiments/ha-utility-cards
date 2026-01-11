import { css, CSSResultGroup, html, LitElement } from "lit";
import { state } from "lit/decorators.js";
import { type HomeAssistant, type LovelaceCardConfig, type LovelaceCard } from 'custom-card-helpers';
import { LOG } from './utils';

const NAME = 'catdad-homepage-card';

type Config = LovelaceCardConfig & {
  type: `custom:${typeof NAME}`;
  url: string;
};

export const card = {
  type: NAME,
  name: 'Catdad: Homepage Card',
  description: 'Automatically navigate back to the page where the card is rendered if a dashboard is left idle'
};

class HomepageCard extends LitElement implements LovelaceCard {
  @state() private _config?: Config;
  @state() private _editMode: boolean = false;

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

  private showCard(): boolean {
    return this._editMode;
  }

  public getCardSize(): number {
    return this.showCard() ? 4 : 0;
  }

  public setConfig(config: Config): void {
    this._config = Object.assign({}, HomepageCard.getStubConfig(), config);
  }

  private enable(): void {
    try {
      const url = this._config?.url;

      if (!url) {
        LOG(`homepage card did not get a url`);
        return;
      }

      LOG(`homepage card using url "${url}"`);
    } catch (e) {
      LOG('failed to initialize homepage card', e);
    }
  }

  private disable(): void {
    try {

    } catch (e) {
      LOG('failed to disconnect homepage card', e);
    }
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.enable();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.disable();
  }

  protected render() {
    return html`
      <ha-card style=${`${this.showCard() ? '' : 'display: none'}`}>
        <div class="root">
          Homepage card placeholder
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        overflow: hidden;
      }

      .root {
        padding: var(--spacing, 12px);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: calc(var(--spacing, 12px) / 4);
      }
    `;
  }

  public static getConfigForm() {
    return {
      schema: [
        {
          name: 'url',
          required: true,
          selector: { template: {} }
        },
      ],
      computeLabel: (schema: { name: keyof Config }) => {
        switch (schema.name) {
          case 'url':
            return 'Where to navigate to ';
          default:
            return undefined;
        }
      },
      computeHelper: (schema: { name: keyof Config }) => {
        switch (schema.name) {
          default:
            return undefined;
        }
      },
      assertConfig: (config: Config) => {
        if (!config.url) {
          // throw new Error('a url is required for this card');
        }
      },
    };
  }

  static getStubConfig(): Partial<Config> & Pick<Config, 'type'> {
    return {
      type: `custom:${NAME}`,
    };
  }
}

customElements.define(NAME, HomepageCard);

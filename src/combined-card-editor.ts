import { html, LitElement } from "lit";
import { state } from 'lit/decorators.js';
import { type HomeAssistant, type LovelaceCardConfig, type LovelaceCardEditor, type LovelaceConfig } from 'custom-card-helpers';
import { createLogger } from "./utils/log";
import { match } from 'ts-pattern';

export type Config = LovelaceCardConfig & {
  // this is handled by the card stack editor, don't know what its actual tyep is
  cards: any[],
  size?: number,
  sizeAlgorithm?: 'temp' | 'render' | 'component'
};

const tabs = ['cards', 'settings'] as const;

export const editorFactory = (NAME: string, stubConfig: Config) => {
  class CombinedCardEditor extends LitElement implements LovelaceCardEditor {
    private _hass?: HomeAssistant;
    private _lovelace?: LovelaceConfig;

    private logger = createLogger({ name: `${NAME}-editor` });

    @state() private _config: Config = stubConfig;
    @state() private selectedTab: (typeof tabs)[number] = tabs[0];

    setConfig(config: Config): void {
      this._config = {
        // I think this won't allow removing the hidden values
        // ...this._config,
        ...config
      };
    }

    configChanged(newConfig: Config): void {
      const event = new Event('config-changed', {
        bubbles: true,
        composed: true
      });

      // @ts-ignore
      event.detail = { config: newConfig };

      this.dispatchEvent(event);
    }

    protected render() {
      return html`<div>
        <ha-tab-group @wa-tab-show=${(ev) => {
          // ev.detail.name seems to always be blank
        }}>
          ${tabs.map(value => html`
            <ha-tab-group-tab
              slot="nav"
              .id=${value}
              .panel=${value}
              .active=${this.selectedTab === value}
              @click=${() => { this.selectedTab = value; }}
            >
              ${value}
            </ha-tab-group-tab>`
        )}
        </ha-tab-group>

        <div style="margin: 1rem 0;" />

        ${
          match(this.selectedTab)
            .with('cards', () => html`
              <hui-stack-card-editor
                @config-changed=${(ev) => {
                ev.stopPropagation();

                this.configChanged({
                  ...this._config,
                  ...ev.detail.config,
                  type: stubConfig.type,
                });
              }}
                ._config=${{
                cards: this._config.cards || [],
                type: 'vertical-stack'
              }}
                .hass=${this._hass}
                .lovelace=${this._lovelace}
              />
            `)
            .with('settings', () => html`
              <div>settings go in here</div>
            `)
            .exhaustive()
        }
      </div>`;
    }

    set hass(hass: HomeAssistant) {
      this._hass = hass;
    }

    set lovelace(ll: LovelaceConfig) {
      this._lovelace = ll;
    }
  }

  return CombinedCardEditor;
};

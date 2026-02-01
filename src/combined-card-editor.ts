import { type CSSResultGroup, LitElement, html, css } from "lit";
import { state, property } from 'lit/decorators.js';
import { type HomeAssistant, type LovelaceCardConfig, type LovelaceCardEditor, type LovelaceConfig } from 'custom-card-helpers';
import { createLogger } from "./utils/log";
import { match } from 'ts-pattern';

export type Config = LovelaceCardConfig & {
  // this is handled by the card stack editor, don't know what its actual tyep is
  cards: any[];
  title?: string;
  size?: number;
  sizeAlgorithm?: 'temp' | 'render' | 'component';
};

const tabs = ['cards', 'settings'] as const;

export const editorFactory = (NAME: string, stubConfig: Config) => {
  class CombinedCardEditor extends LitElement implements LovelaceCardEditor {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @property({ attribute: false }) public lovelace?: LovelaceConfig;

    @state() private _config: Config = stubConfig;
    @state() private selectedTab: (typeof tabs)[number] = tabs[0];

    private logger = createLogger({ name: `${NAME}-editor` });

    setConfig(config: Config): void {
      this._config = {
        // I think this won't allow removing the hidden values
        // ...this._config,
        ...config
      };
    }

    private configChanged(newConfig: Config): void {
      this.dispatchEvent(new CustomEvent('config-changed', {
        bubbles: true,
        composed: true,
        detail: { config: newConfig }
      }));
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
                  title: this._config.title,
                  type: 'vertical-stack'
                }}
                .hass=${this.hass}
                .lovelace=${this.lovelace}
              />
            `)
            .with('settings', () => html`
              <div>settings go in here</div>
            `)
            .exhaustive()
        }
      </div>`;
    }

    static get styles(): CSSResultGroup {
      return css``;
    }
  }

  return CombinedCardEditor;
};

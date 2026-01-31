import { html, LitElement } from "lit";
import { state } from 'lit/decorators.js';
import { type HomeAssistant, type LovelaceCardConfig, type LovelaceCardEditor, type LovelaceConfig } from 'custom-card-helpers';
import { createLogger } from "./utils/log";

export type Config = LovelaceCardConfig & {
  // this is handled by the card stack editor, don't know what its actual tyep is
  cards: any[],
  size?: number,
  sizeAlgorithm?: 'temp' | 'render' | 'component'
};

export const editorFactory = (NAME: string) => {
  class CombinedCardEditor extends LitElement implements LovelaceCardEditor {
    private _hass?: HomeAssistant;
    private _lovelace?: LovelaceConfig;

    private cardType = `custom:${NAME}`;
    private logger = createLogger({ name: `${NAME}-editor` });

    @state() private _config: Config = {
      // TODO should come from the card
      type: this.cardType,
      cards: [],
    };

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
        <div>other stuff in the editor</div>
        <hui-stack-card-editor
          @config-changed=${(ev) => {
            ev.stopPropagation();

            this.configChanged({
              ...this._config,
              ...ev.detail.config,
              type: this.cardType,
            });
          }}
          ._config=${{
            cards: this._config.cards || [],
            type: 'vertical-stack'
          }}
          .hass=${this._hass}
          .lovelace=${this._lovelace}
        />
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


import { html, LitElement } from "lit";
import { state } from 'lit/decorators.js';
import { type HomeAssistant, type LovelaceCardConfig, type LovelaceCardEditor, type LovelaceConfig } from 'custom-card-helpers';
import { createLogger } from "./utils/log";

type Config = LovelaceCardConfig & {
  // this is handled by the card stack editor, don't know what its actual tyep is
  cards: any[],
};

export const editorFactory = (NAME: string) => {
  class CombinedCardEditor extends LitElement implements LovelaceCardEditor {
    private _hass?: HomeAssistant;
    private _lovelace?: LovelaceConfig;
    private _stackCardEditor?;

    @state() private _config: Config = {
      // TODO should come from the card
      type: 'combined-card',
      cards: []
    };

    private logger = createLogger({ name: 'combined-card-editor' });

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
      this.logger.debug('render', this._stackCardEditor);

      if (this._hass) {
        this._stackCardEditor.hass = this._hass;
      }

      if (this._lovelace) {
        this._stackCardEditor.lovelace = this._lovelace;
      }

      this._stackCardEditor.addEventListener('config-changed', ev => {
        ev.stopPropagation();

        this.configChanged({
          ...this._config,
          ...ev.detail.config,
          type: `custom:${NAME}`
        });
      });

      const thing = html`<hui-stack-card-editor
          @config-changed=${(config) => {
            this._config = {
              ...this._config,
              cards: config.cards
            };
          }}
          ._config=${{ cards: this._config.cards || [], type: 'vertical-stack' }}
          .hass=${this._hass}
          .lovelace=${this._lovelace}
        />`;

      // return html`<div>${this._stackCardEditor}</div>`;

      return html`<div>${thing}</div>`;
    }

    set hass(hass: HomeAssistant) {
      this._hass = hass;

      if (this._stackCardEditor) {
        this._stackCardEditor.hass = hass;
      }
    }

    set lovelace(ll: LovelaceConfig) {
      this._lovelace = ll;

      if (this._stackCardEditor) {
        this._stackCardEditor.lovelace = ll;
      }
    }

    set cardEditor(editor) {
      this._stackCardEditor = editor;
    }
  }

  return CombinedCardEditor;
};


import { html, LitElement } from "lit";
import { type HomeAssistant, type LovelaceCardConfig, type LovelaceCardEditor, type LovelaceConfig } from 'custom-card-helpers';
import { LOG_EDITOR as LOG } from './utils';

export const editorFactory = (NAME: string) => {
  class CombinedCardEditor extends LitElement implements LovelaceCardEditor {
    private _hass?: HomeAssistant;
    private _lovelace?: LovelaceConfig;
    private _stackCardEditor?;
    private _config = {};

    private _setEditorConfig(config: LovelaceCardConfig) {
      // @ts-ignore
      if (this._stackCardEditor) {
        this._stackCardEditor.setConfig({
          type: 'vertical-stack',
          cards: config.cards || []
        });
      }
    }

    setConfig(config: LovelaceCardConfig): void {
      this._config = {
        // I think this won't allow removing the hidden values
        // ...this._config,
        ...config
      };

      this._setEditorConfig(this._config as LovelaceCardConfig);
    }

    configChanged(newConfig: LovelaceCardConfig): void {
      const event = new Event('config-changed', {
        bubbles: true,
        composed: true
      });

      // @ts-ignore
      event.detail = { config: newConfig };

      this.dispatchEvent(event);
    }

    protected render() {
      LOG('render', this._stackCardEditor);

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

      return html`<div>${this._stackCardEditor}</div>`;
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


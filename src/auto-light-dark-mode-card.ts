import { css, CSSResultGroup, html, LitElement } from 'lit';
import { state } from 'lit/decorators.js';
import { match } from 'ts-pattern';
import { querySelectorDeep } from 'query-selector-shadow-dom';
import { type HomeAssistant, type LovelaceCardConfig, type LovelaceCard } from 'custom-card-helpers';
import { LOG } from './utils';
import { type Connection, type UnsubscribeFunc, subscribeRenderTemplate } from './template-subscriber';

const NAME = 'catdad-auto-light-dark-mode-card' as const;

type Mode = 'auto' | 'light' | 'dark';

type Config = LovelaceCardConfig & {
  type: `custom:${typeof NAME}`;
  // HA doesn't seem to assert the `required` properties
  debug?: boolean;
  template?: string;
  restoreTo?: Mode;
};

const isMode = (value: any): value is Mode => value === 'auto' || value === 'dark' || value === 'light';

const getMainElement = (): HTMLElement | null => {
  return querySelectorDeep('home-assistant') || querySelectorDeep('hc-main') || null;
}

const dispatch = (mode: Mode): void => {
  const detail = match(mode)
    .with('auto', () => ({ dark: undefined }))
    .with('dark', () => ({ dark: true }))
    .with('light', () => ({ dark: false }))
    .exhaustive();

  const root = getMainElement();

  if (root) {
    root.dispatchEvent(new CustomEvent('settheme', { detail }));
  }
}

export const card = {
  type: NAME,
  name: 'Catdad: Auto Light/Dark Mode Card',
  description: 'Automatically switch between light and dark mode for your dashboard'
};

class AutoReloadCard extends LitElement implements LovelaceCard {
  @state() private _config?: Config;
  @state() private _editMode: boolean = false;
  @state() private _debug: boolean = false;
  @state() private currentMode: Mode | null = null;

  private _hass?: HomeAssistant;
  private _templateUnsubscribe?: UnsubscribeFunc;

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

  private async connect(): Promise<void> {
    const connection = this._hass?.connection as any as Connection | undefined;
    const template = this._config?.template;

    if (!connection || !template) {
      return;
    }

    this.disconnect();

    this._templateUnsubscribe = await subscribeRenderTemplate(connection, result => {
      console.log('template rendered:', result);
      if (isMode(result.result)) {
        this.setMode(result.result);
      }
    }, {
      template,
    });
  }

  private disconnect(): void {
    if (this._templateUnsubscribe) {
      this._templateUnsubscribe();
      this._templateUnsubscribe = undefined;
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    LOG('light/dark mode card mounted', this._editMode ? 'in edit mode' : '');
    this.connect();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    LOG('light/dark mode card unmounted', this._editMode ? 'in edit mode' : '');
    this.disconnect();

    const resoteTo = this._config?.restoreTo;

    if (resoteTo && this.currentMode && resoteTo !== this.currentMode) {
      this.setMode(resoteTo);
    }
  }

  private setDarkMode(): void {
    this.currentMode = 'dark';
    dispatch('dark');
  }

  private setLightMode(): void {
    this.currentMode = 'light';
    dispatch('light');
  }

  private setAutoMode(): void {
    this.currentMode = 'auto';
    dispatch('auto');
  }

  private setMode(mode: Mode): void {
    match(mode)
      .with('auto', () => this.setAutoMode())
      .with('dark', () => this.setDarkMode())
      .with('light', () => this.setLightMode())
      .exhaustive();
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
          <div class="row">
            <ha-control-button style="width: 100%" @click="${this.setAutoMode}">
              <button type="button" class="button">Auto</button>
            </ha-control-button>

            <ha-control-button style="width: 100%" @click="${this.setLightMode}">
              <button type="button" class="button">Light</button>
            </ha-control-button>

            <ha-control-button style="width: 100%" @click="${this.setDarkMode}">
              <button type="button" class="button">Dark</button>
            </ha-control-button>
          </div>
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

      .row {
        display: flex;
        gap: 0.5rem;
        width: 100%;
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
        {
          name: 'template',
          required: true,
          selector: { template: {} }
        },
        {
          name: 'restoreTo',
          required: true,
          selector: {
            select: {
              mode: 'box',
              options: (['auto', 'light', 'dark'] as Mode[])
                .map((value) => ({ label: value, value })),
            }
          }
        },
        {
          name: 'debug',
          selector: { boolean: {} }
        },
      ],
      computeLabel: (schema) => {
        switch (schema.name) {
          case 'debug':
            return 'Render card with manual controls over theme mode';
          case 'restoreTo':
            return 'Restore to *';
          case 'template':
            return 'Template ';
          default:
            return undefined;
        }
      },
      computeHelper: (schema) => {
        switch (schema.name) {
          case 'template':
            return 'The template should resolve to one of: auto, light, dark';
          default:
            return undefined;
        }
      }
    };
  }

  static getStubConfig(): Partial<Config> & Pick<Config, 'type'> {
    return {
      type: `custom:${NAME}`,
      restoreTo: 'auto',
    };
  }
}

customElements.define(NAME, AutoReloadCard);

import { css, CSSResultGroup, html } from 'lit';
import { state } from 'lit/decorators.js';
import { type HomeAssistant, type LovelaceCard } from 'custom-card-helpers';
import { HELPERS, loadStackEditor } from './utils/card-helpers';
import { sleep } from './utils/types';
import { UtilityCard } from './utils/utility-card';

import { type Config, type CompleteConfig, editorFactory } from "./combined-card-editor";

const NAME = 'combined-card';
const EDITOR_NAME = `${NAME}-editor`;

export const card = {
  type: NAME,
  name: "Catdad: Combined Card",
  description: "Combine a stack of cards into a single seamless card",
};

const getRandomId = (): string => Math.random().toString(36).slice(2);

class CombinedCard extends UtilityCard implements LovelaceCard {
  @state() private _config?: Config;
  @state() private _helpers?;
  @state() private _forceRender: string = getRandomId();

  protected readonly name: string = NAME;

  private _card?: LovelaceCard;
  private _hass?: HomeAssistant;
  private _editMode: boolean = false;
  private _timer?: number;

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    if (this._card) {
      this._card.hass = hass;
    }
  }

  set editMode(editMode: boolean) {
    this._editMode = editMode;

    if (this._card) {
      this._card.editMode = editMode;
    }
  }

  private async getSizeFromComponentCard(): Promise<number> {
    return await (async function recurseWaitForCard(that) {
      if (that._card && that._card.getCardSize) {
        return await that._card.getCardSize();
      }

      await sleep(10);

      return await recurseWaitForCard(that);
    })(this);
  }

  private async getSizeFromTempCard(): Promise<number> {
    return await (async function recursiveGetSize(that) {
      const el = that._createCard(that._config!);

      if (el && el.getCardSize) {
        const size = await el.getCardSize();

        if (typeof size === 'number') {
          return size;
        }
      }

      await sleep(10);

      return await recursiveGetSize(that);
    })(this);
  }

  private async getSizeFromRenderedCards(): Promise<number> {
    const configCards = this._config?.cards || [];
    const helpers = this._helpers;

    const sizes = await Promise.all(configCards.map(card => (async () => {
      const el = await helpers.createCardElement(card);
      return await el.getCardSize();
    })()));

    return sizes.reduce((a, b) => a + b);
  }

  public async getCardSize(): Promise<number> {
    const size = await (async () => {
      if (!this._config) {
        return 0;
      }

      await HELPERS.whenLoaded;

      if (this._config.size) {
        return this._config.size;
      }

      switch (this._config.sizeAlgorithm) {
        case 'temp':
          // this renders the vertical stack again and asks it its size
          // this is usually wrong (often smaller)
          return await this.getSizeFromTempCard();
        case 'render':
          // this renders all the cards in config and asks all of their sizes
          // it is also usually wrong, for similar reasons as temp
          return await this.getSizeFromRenderedCards();
        case 'component':
          // this waits for the actual vertical stack to render and asks it its size
          // this is very slow
          return await this.getSizeFromComponentCard();
        default:
          // most custom and some first-party cards just return this
          // it's probably a bug that led to more bugs in lovelace itself
          return 4;
      }
    })();

    this.logger.debug(`card size is ${size}`);

    return size;
  }

  public setConfig(config: Config): void {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      throw new Error("Invalid configuration, `cards` is required");
    }

    this._config = Object.assign({}, CombinedCard.getFullConfig(), config);
    const that = this;

    if (HELPERS.loaded) {
      this._helpers = HELPERS.helpers;
    } else {
      HELPERS.whenLoaded.then(() => {
        this.logger.info('re-rendering card after helpers have loaded');
        that._helpers = HELPERS.helpers;
      });
    }
  }

  protected render() {
    const that = this;

    clearTimeout(this._timer);

    const loaded = this._config && this._helpers;

    if (!loaded) {
      this._timer = setTimeout(() => {
        this.logger.info('re-render loading card');
        that._forceRender = getRandomId();
      }, 1000);
    }

    const element = loaded ?
      this._createCard(this._config!) :
      'Loading...';

    if (element && (element as LovelaceCard).addEventListener) {
      (element as LovelaceCard).addEventListener(
        'll-rebuild',
        (ev) => {
          this.logger.debug('rebuild event!!!');
          ev.stopPropagation();
          that._forceRender = getRandomId();
        },
        { once: true },
      );
    }

    const styles = loaded ? [
      ...(this._config?.hideBorder ? ['--ha-card-border-width: 0px', '--ha-card-border-color: rgba(0, 0, 0, 0)',] : []),
      ...(this._config?.hideShadow ? ['--ha-card-box-shadow: none'] : []),
      ...(this._config?.hideRoundedCorners ? ['--ha-card-border-radius: none'] : []),
      ...(this._config?.hideGap ? ['--stack-card-gap: 0px'] : [])
    ] : [
      'height: 50px',
      'padding: var(--spacing, 12px)',
      'display: flex',
      'align-items: center'
    ];

    return html`
      <ha-card>
        <div render-id="${this._forceRender}" style="${styles.join(';')}">${element}</div>
      </ha-card>
    `;
  }

  private _createCard(config: Config): LovelaceCard | null {
    // TODO does this need to be removed?
    if (!this._helpers) {
      return null;
    }

    const element: LovelaceCard = this._helpers.createCardElement({
      ...config,
      type: config.stackMode || CombinedCard.getStubConfig().stackMode
    });

    this._card = element;

    if (this._hass) {
      element.hass = this._hass;
    }

    element.editMode = this._editMode;

    return element;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        overflow: hidden;
      }
    `;
  }

  // Note: this is what builds the visual editor for this card
  // the actual element it is creating is the one in
  // combined-card-editor.ts
  public static async getConfigElement() {
    // this needs to load before we can render the editor
    await loadStackEditor();

    return document.createElement(EDITOR_NAME);
  }

  static getStubConfig(): Config {
    return {
      type: `custom:${NAME}`,
      cards: [],
      stackMode: 'vertical-stack',
    };
  }

  static getFullConfig(): CompleteConfig {
    return {
      size: 0,
      sizeAlgorithm: 'temp',
      hideBorder: true,
      hideShadow: true,
      hideRoundedCorners: true,
      hideGap: false,
      ...CombinedCard.getStubConfig(),
    };
  }
}

customElements.define(NAME, CombinedCard);
customElements.define(EDITOR_NAME, editorFactory(NAME, CombinedCard.getStubConfig(), CombinedCard.getFullConfig()));

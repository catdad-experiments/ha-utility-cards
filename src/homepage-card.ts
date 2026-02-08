import { css, CSSResultGroup, html } from "lit";
import { state } from "lit/decorators.js";
import { type HomeAssistant, type LovelaceCardConfig, type LovelaceCard } from 'custom-card-helpers';
import { type Timer, minute, sleep, random } from './utils/types';
import { HistoryEvent } from "./utils/history";
import { UtilityCard } from "./utils/utility-card";
import type { LoggerOptions } from "./utils/log";

/** card lifecycle:
 *
 * card mount
 *   enable history tracker
 *
 * user navigates away from homepage (history detect)
 * _note: happens before card unmount on navigation_
 *   enable user activity monitor
 *     becomes idle (user activity detect)
 *       disable user activity monitor
 *       disable history monitor
 *       navigate back to homepage
 *
 * card unmount
 *   disable history tracker
 *   if on the same page (card deleted/repaced)
 *      disable user activity tracker
 */

const NAME = 'catdad-homepage-card';

type Config = LovelaceCardConfig & {
  type: `custom:${typeof NAME}`;
  inactiveMinutes: number;
  fast: boolean;
  debug: boolean;
};

export const card = {
  type: NAME,
  name: 'Catdad: Homepage Card',
  description: 'Automatically navigate back to the page where the card is rendered if a dashboard is left idle'
};

type Event = keyof WindowEventMap;
const activityEvents: Event[] = [
  'pointerdown',
  'pointerup',
  'pointermove',
  'click',
  'touchend'
];

const style = <T extends HTMLElement>(elem: T, styles: Partial<Record<keyof CSSStyleDeclaration, string>>): T => {
  for (const [key, value] of Object.entries(styles)) {
    elem.style[key] = value;
  }

  return elem;
};

class HomepageCard extends UtilityCard implements LovelaceCard {
  @state() private _config?: Config;
  @state() private _editMode: boolean = false;

  protected readonly name: string = `${NAME} (${random()})`;

  private _hass?: HomeAssistant;

  private homepage: string | undefined;
  private clearCardEventHandlers: Array<() => void> = [];
  private clearActivityEventHandlers: Array<() => void> = [];
  private clearQueuedHanlder: Array<() => void> = [];

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  set editMode(editMode: boolean) {
    this._editMode = editMode;

    if (editMode) {
      this.disableCard();
    } else if (this.homepage) {
      this.enableCard();
    }
  }

  private get debug(): boolean {
    return !!this._config?.debug;
  }

  protected get loggerOptions(): LoggerOptions {
    return {
      ...super.loggerOptions,
      level: this.debug ? 'debug' : 'info'
    };
  }

  private showCard(): boolean {
    return this._editMode || this.debug;
  }

  public getCardSize(): number {
    return this.showCard() ? 4 : 0;
  }

  public setConfig(config: Config): void {
    this._config = Object.assign({}, HomepageCard.getStubConfig(), config);
  }

  private configValue<K extends keyof Config>(key: K): Config[K] {
    if (this._config) {
      return this._config[key];
    }

    return HomepageCard.getStubConfig()[key];
  }

  private get isSamePage(): boolean {
    return this.homepage === location.pathname;
  }

  private clearUserActivityTimer(): void {
    this.logger.debug('clear user activity timer');

    for (const func of this.clearQueuedHanlder) {
      func();
    }

    this.clearQueuedHanlder = [];
  }
  private handleUserActivity(homepage?: string): void {
    this.clearUserActivityTimer();

    // don't monitor if we are still on the same page
    if (this.isSamePage) {
      return;
    }

    const time = (
      this.configValue('fast')
        ? 1
        : minute
    ) * this.configValue('inactiveMinutes');

    this.logger.debug(`start inactivity tracking for ${time}ms before returning to "${homepage}"`);

    if (!homepage) {
      return;
    }

    const elem = style(document.createElement('div'), {
      position: 'fixed',
      top: '5px',
      left: '50%',
      fontSize: '10px',
      padding: '3px 6px',
      lineHeight: '1.2',
      background: '#C14953',
      color: '#F0D2D4',
      zIndex: '10000',
      borderRadius: '10px',
      pointerEvents: 'none',
      transform: 'translateX(-50%)'
    });
    elem.appendChild(document.createTextNode('homepage card is active'));

    const timer = setTimeout(() => {
      this.disableActivityMonitor();
      this.disableHistoryTracker();

      if (homepage === location.pathname) {
        return;
      }

      this.logger.debug('navigating back to homepage:', homepage);

      // Home Assistant does not automatically navigate on push
      // but it does navigate on pop, so push the homepage twice and
      // then go back
      // window.history.pushState(null, '', homepage);
      // window.history.pushState(null, '', homepage);
      // window.history.back();

      // in theory, we could continue to go back until we reach
      // the homepage, since we must have come from the homepage
      // in order for this card to even be active
      Promise.resolve().then(async () => {
        while (window.history.length && homepage !== location.pathname) {
          window.history.back();
          await sleep(1000);
        }
      });

      // window.location.href = homepage;
    }, time);

    if (this.debug) {
      document.body.appendChild(elem);
      this.logger.debug('tracker element', elem);
    }

    this.clearQueuedHanlder.push(() => {
      this.logger.debug('removing timer');
      clearTimeout(timer);
      elem.remove();
    });
  }

  // monitor user activity in order to detect when the dashboard is idle
  // this is persisted when the user navigates away from the homepage
  private enableActivityMonitor(): void {
    this.disableActivityMonitor();

    const handler = this.handleUserActivity.bind(this, this.homepage);

    for (const event of activityEvents) {
      window.addEventListener(event, handler, { passive: true });
    }

    this.clearActivityEventHandlers.push(() => {
      for (const event of activityEvents) {
        window.removeEventListener(event, handler);
      }
    });

    handler();
  }
  private disableActivityMonitor(): void {
    this.clearUserActivityTimer();
    this.logger.debug('disable activity monitor');

    for (const func of this.clearActivityEventHandlers) {
      func();
    }

    this.clearActivityEventHandlers = [];
  }

  // monitor history API to detect when we navigate away from the homepage
  // this only executes on the homepage and kicks off user activity monitoring
  private enableHistoryTracker(): void {
    this.disableHistoryTracker();

    const handler = this.enableActivityMonitor.bind(this);

    for (const event of Object.values(HistoryEvent)) {
      window.addEventListener(event, handler, { passive: true });
    }

    this.clearCardEventHandlers.push(() => {
      for (const event of Object.values(HistoryEvent)) {
        window.removeEventListener(event, handler);
      }
    });
  }
  private disableHistoryTracker(): void {
    this.logger.debug('disable history tracker');

    for (const func of this.clearCardEventHandlers) {
      func();
    }

    this.clearCardEventHandlers = [];
  }

  private enableCard(): void {
    try {
      this.clearUserActivityTimer();

      if (!this.homepage) {
        this.logger.error(`homepage card did not get a url`);
        return;
      }

      this.logger.info(`homepage card using url "${this.homepage}"`);

      this.enableHistoryTracker();
    } catch (e) {
      this.logger.error('failed to initialize homepage card', e);
    }
  }

  private disableCard(): void {
    try {
      this.logger.debug('disable card');
      this.disableHistoryTracker();

      // card is unmounted while on the same page...
      // probably card being updated or deleted
      // so clear the activity monitor
      if (this.isSamePage) {
        this.disableActivityMonitor();
      }
    } catch (e) {
      this.logger.error('failed to disconnect homepage card', e);
    }
  }

  connectedCallback(): void {
    super.connectedCallback()

    this.logger.debug('mounted');
    this.homepage = window.location.pathname;
    this.enableCard();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    this.disableCard();
    this.homepage = undefined;
    this.logger.debug('unmounted');
  }

  protected render() {
    return html`
      <ha-card style=${`${this.showCard() ? '' : 'display: none'}`}>
        <div class="root">
          Homepage card ${this.debug && !this._editMode ? 'is active' : 'placeholder'}
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
          name: 'inactiveMinutes',
          required: true,
          selector: { number: {} }
        },
        {
          name: 'fast',
          selector: { boolean: {} }
        },
        {
          name: 'debug',
          selector: { boolean: {} }
        },
      ],
      computeLabel: (schema: { name: keyof Config }) => {
        switch (schema.name) {
          case 'inactiveMinutes':
            return 'Inactive minutes ';
          case 'fast':
            return 'Fast'
          default:
            return undefined;
        }
      },
      computeHelper: (schema: { name: keyof Config }) => {
        switch (schema.name) {
          case 'inactiveMinutes':
            return 'How many minutes of inactivity before going back home? ';
          case 'fast':
            return 'DEBUG: Fast mode, switches inactivity to miliseconds instead of minutes';
          case 'debug':
            return 'Always render the card, enable debug logging'
          default:
            return undefined;
        }
      },
      // assertConfig: (config: Config) => {
      //   if (!config.url) {
      //     // throw new Error('a url is required for this card');
      //   }
      // },
    };
  }

  static getStubConfig(): Partial<Config> & Pick<Config, 'type'> {
    return {
      type: `custom:${NAME}`,
      inactiveMinutes: 5,
      fast: false,
      debug: false,
    };
  }
}

customElements.define(NAME, HomepageCard);

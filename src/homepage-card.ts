import { css, CSSResultGroup, html, LitElement } from "lit";
import { state } from "lit/decorators.js";
import { type HomeAssistant, type LovelaceCardConfig, type LovelaceCard } from 'custom-card-helpers';
import { type Timer, minute } from './utils/types';
import { HistoryEvent } from "./utils/history";
import { LOG } from "./utils/log";

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
  'click'
];

class HomepageCard extends LitElement implements LovelaceCard {
  @state() private _config?: Config;
  @state() private _editMode: boolean = false;

  private _hass?: HomeAssistant;

  private homepage: string | undefined;
  private userActivityTimer: Timer | undefined;
  private clearCardEventHandlers: Array<() => void> = [];
  private clearActivityEventHandlers: Array<() => void> = [];

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  set editMode(editMode: boolean) {
    this._editMode = editMode;

    if (editMode) {
      this.disableCard();
    } else {
      this.enableCard();
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
    if (this.userActivityTimer) {
      clearTimeout(this.userActivityTimer);
      this.userActivityTimer = undefined;
    }
  }
  private handleUserActivity(): void {
    this.clearUserActivityTimer();

    // don't monitor if we are still on the same page
    if (this.isSamePage) {
      return;
    }

    const time = (
      this.configValue('fast')
        ? 1
        : minute
    ) * this.configValue('inactiveMinutes')

    this.userActivityTimer = setTimeout(() => {
      if (!this.homepage) {
        return;
      }

      if (this.homepage === location.pathname) {
        return;
      }

      this.disableActivityMonitor();
      this.disableHistoryTracker();
      window.history.back();
    }, time);
  }

  // monitor user activity in order to detect when the dashboard is idle
  // this is persisted when the user navigates away from the homepage
  private enableActivityMonitor(): void {
    this.disableActivityMonitor();

    const handler = this.handleUserActivity.bind(this);

    for (const event of activityEvents) {
      window.addEventListener(event, handler);
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
      window.addEventListener(event, handler);
    }

    this.clearCardEventHandlers.push(() => {
      for (const event of Object.values(HistoryEvent)) {
        window.removeEventListener(event, handler);
      }
    });
  }
  private disableHistoryTracker(): void {
    for (const func of this.clearCardEventHandlers) {
      func();
    }

    this.clearCardEventHandlers = [];
  }

  private enableCard(): void {
    try {
      this.clearUserActivityTimer();

      if (!this.homepage) {
        LOG(`homepage card did not get a url`);
        return;
      }

      LOG(`homepage card using url "${this.homepage}"`);

      this.enableHistoryTracker();
    } catch (e) {
      LOG('failed to initialize homepage card', e);
    }
  }

  private disableCard(): void {
    try {
      LOG('homepage card unmounting');

      this.disableHistoryTracker();

      // card is unmounted while on the same page...
      // probably card being updated or deleted
      // so clear the activity monitor
      if (this.isSamePage) {
        this.disableActivityMonitor();
      }
    } catch (e) {
      LOG('failed to disconnect homepage card', e);
    }
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.homepage = window.location.pathname;
    this.enableCard();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.disableCard();
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
          name: 'inactiveMinutes',
          required: true,
          selector: { number: {} }
        },
        {
          name: 'fast',
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
    };
  }
}

customElements.define(NAME, HomepageCard);

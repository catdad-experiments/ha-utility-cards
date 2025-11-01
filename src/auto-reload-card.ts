import { css, CSSResultGroup, html, LitElement } from "lit";
import { state } from "lit/decorators.js";
import { querySelectorDeep } from "query-selector-shadow-dom";
import { type HomeAssistant, type LovelaceCardConfig, type LovelaceCard } from 'custom-card-helpers';
import { type Interval, type Timer, LOG, isDate, isNumber, sleep } from './utils';

const NAME = 'catdad-auto-reload-card' as const;

const lastScriptSrcAtLoad = [...(document.querySelectorAll('script') || [])].pop()?.getAttribute('src');

type StoredState = {
  lastRefresh: string;
  disconnectCount: number;
  updateCount: number;
  networkOutageCount: number;
  failedRecoveryCount: number;
};

type Config = LovelaceCardConfig & {
  type: `custom:${typeof NAME}`;
  // HA doesn't seem to assert the `required` properties
  entity?: string;
  debug?: boolean;
  debug_only_with_info?: boolean;
};

const second = 1000;
const minute = second * 60;

export const card = {
  type: NAME,
  name: 'Catdad: Auto Reload Card',
  description: 'Reload the dashboard if it loses connection'
};

class AutoReloadCard extends LitElement implements LovelaceCard {
  @state() private _config?: Config;
  @state() private _editMode: boolean = false;
  @state() private _lastUpdated: string = 'entity not found in state';
  @state() private _debug: boolean = false;

  private _hass?: HomeAssistant;
  private _disconnectTimer?: Timer;
  private _refreshInterval?: Interval;

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    if (this._disconnectTimer) {
      clearTimeout(this._disconnectTimer);
    }

    this._disconnectTimer = setTimeout(() => {
      this.refreshFromDisconnect();
    }, 2 * minute);

    if (this._config?.entity) {
      const state = hass.states[this._config.entity];

      if (state) {
        this._lastUpdated = state.last_updated;
      }
    }
  }

  set editMode(editMode: boolean) {
    this._editMode = editMode;

    if (editMode) {
      this.disable();
    } else {
      this.enable();
    }
  }

  public getCardSize(): number {
    return this.showCard() ? 4 : 0;
  }

  public setConfig(config: Config): void {
    this._config = Object.assign({}, AutoReloadCard.getStubConfig(), config);
    this._debug = !!this._config?.debug;

    this.debugOnlyWithInfo();
  }

  private debugOnlyWithInfo(storedState?: StoredState): void {
    if (this._config?.debug) {
      return;
    }

    if (this._config?.debug_only_with_info !== true) {
      return;
    }

    this._debug = Object.values(storedState ?? this.readStoredState())
      .some(value => isNumber(value) && value > 0);
  }

  private enable(): void {
    if (this._editMode) {
      return;
    }

    try {
      if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
    }

    this._refreshInterval = setInterval(() => {
      const toast = querySelectorDeep('home-assistant notification-manager ha-toast ha-button[slot=action]');

      if (toast?.innerText.toLowerCase() === 'refresh') {
        this.refreshFromUpdate();
      }
    }, second * 5);

    } catch (e) {
      LOG(`failed to connect ${NAME}`, e);
    }
  }

  private disable(): void {
    try {
      if (this._disconnectTimer) {
        clearTimeout(this._disconnectTimer);
      }

      if (this._refreshInterval) {
        clearInterval(this._refreshInterval);
      }
    } catch (e) {
      LOG(`failed to disconnect ${NAME}`, e);
    }
  }

  private showCard(): boolean {
    return this._debug || this._editMode;
  }

  private readStoredState(): StoredState {
    try {
      const state = JSON.parse(localStorage.getItem(NAME) || '{}');

      return {
        lastRefresh: typeof state.lastRefresh === 'string' ? state.lastRefresh : 'none',
        disconnectCount: isNumber(state.disconnectCount) ? state.disconnectCount : 0,
        updateCount: isNumber(state.updateCount) ? state.updateCount : 0,
        networkOutageCount: isNumber(state.networkOutageCount) ? state.networkOutageCount : 0,
        failedRecoveryCount: isNumber(state.failedRecoveryCount) ? state.failedRecoveryCount : 0,
      };
    } catch (e) {
      return {
        lastRefresh: 'none',
        disconnectCount: 0,
        updateCount: 0,
        networkOutageCount: 0,
        failedRecoveryCount: 0,
      }
    }
  }

  private writeStoredState(state: StoredState): void {
    localStorage.setItem(NAME, JSON.stringify(state));
    this.debugOnlyWithInfo(state);
  }

  private resetStoredState(): void {
    this.writeStoredState({
      lastRefresh: '',
      disconnectCount: 0,
      updateCount: 0,
      networkOutageCount: 0,
      failedRecoveryCount: 0
    });
  }

  private refreshFromDisconnect(): void {
    const state = this.readStoredState();
    this.writeStoredState({
      ...state,
      lastRefresh: new Date().toISOString(),
      disconnectCount: state.disconnectCount + 1
    });

    this.ensureNetworkAccess().then((detectedIssue) => {
      const state = this.readStoredState();
      this.writeStoredState({
        ...state,
        lastRefresh: new Date().toISOString(),
        networkOutageCount: state.networkOutageCount + Number(detectedIssue),
      });

      location.reload();
    }).catch(() => {
      const state = this.readStoredState();
      this.writeStoredState({
        ...state,
        lastRefresh: new Date().toISOString(),
        failedRecoveryCount: state.failedRecoveryCount + 1
      });

      // TODO should this reload or just leave the page alone?
      location.reload();
    });
  }

  private refreshFromUpdate(): void {
    const state = this.readStoredState();
    this.writeStoredState({
      ...state,
      lastRefresh: new Date().toISOString(),
      updateCount: state.updateCount + 1,
    });

    location.reload();
  }

  private async ensureNetworkAccess(sleepTime: number = second * 10, issueDetected: boolean = false): Promise<boolean> {
    if (!lastScriptSrcAtLoad) {
      LOG('cannot confirm HA is online, could not find a url to check');
      return false;
    }

    const url = new URL(lastScriptSrcAtLoad);
    url.searchParams.append('random', Math.random().toString(36).slice(2));

    try {
      const res = await fetch(url.toString());
      const body = await res.text();

      LOG(`HA online check successful`, {
        status: res.status,
        statusText: res.statusText,
        bodyLength: body.length
      });
    } catch (e) {
      await sleep(sleepTime);
      return await this.ensureNetworkAccess(sleepTime + (second * 5), true);
    }

    return issueDetected;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.enable();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.disable();
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
      ? 'Auto reload card debug info:'
      : this._editMode
        ? 'Auto reload card placeholder'
        : '👋';

    const debugElem = this._debug
      ? html`<pre>${
          Object.entries({
            lastEntityUpdate: this._lastUpdated,
            ...this.readStoredState()
          }).map(([key,value]) => {
            let serializedValue = value;

            if (typeof value === 'string') {
              const date = new Date(value);

              if (isDate(date)) {
                serializedValue = date.toLocaleString();
              }
            }

            return `${key}: ${serializedValue}`;
          }).join('\n')
        }</pre>
        <ha-control-button style="width: 100%" @click="${this.resetStoredState}">
          <button type="button" class="button">Reset debug info</button>
        </ha-control-button>
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
        { name: "entity", required: true, selector: { entity: {} } },
        { name: "debug", selector: { boolean: {} } },
        { name: 'debug_only_with_info', selector: { boolean: {} }}
      ],
      computeLabel: (schema) => {
        switch (schema.name) {
          case 'debug':
            return 'Always render the card with debug information';
          case 'debug_only_with_info':
            return 'Render debug information only when values exist';
          default:
            return undefined;
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

customElements.define(NAME, AutoReloadCard);

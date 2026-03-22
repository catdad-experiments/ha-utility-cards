import { type CSSResultGroup, css, html } from 'lit';
import { state } from 'lit/decorators.js';
import { type HomeAssistant, type LovelaceCardConfig, type LovelaceCard } from 'custom-card-helpers';
import type { Connection, UnsubscribeFunc } from 'home-assistant-js-websocket';
import { compact } from 'es-toolkit';

import { resolveColor } from './utils/types';
import { UtilityCard } from './utils/utility-card';
import { type PersistedNotification, subscribeNotifications } from './utils/notificataion-subscribe';
import { textFromBackground } from './utils/color';

const NAME = 'catdad-notification-card' as const;

type Config = LovelaceCardConfig & {
  type: `custom:${typeof NAME}`;
  debug?: boolean;
  backgroundColor?: string;
  hrColor?: string;
};

export const card = {
  type: NAME,
  name: 'Catdad: Notification Card',
  description: 'Show persistent notications on a card'
};

type IDData = {
  level: 'success' | 'error' | 'warning' | 'info' | 'neutral'
}

const parseId = (id: string): IDData => {
  const params = new URLSearchParams(id);

  const level = (['success', 'error', 'warning', 'info', 'neutral'] satisfies IDData['level'][])
    .includes(params.get('level') as IDData['level'])
      ? params.get('level') as IDData['level']
      : undefined;

  return Object.assign(
    { level: 'neutral' } as IDData,
    { level }
  );
};

const STYLE: Record<IDData['level'], { background: string, text: string }> = {
  success: { background: '#1C7C54', text: textFromBackground('#1C7C54') },
  error: { background: '#C14953', text: textFromBackground('#C14953') },
  info: { background: '#456990', text: textFromBackground('#456990') },
  warning: { background: '#F6C304', text: textFromBackground('#F6C304') },
  neutral: { background: 'var(--ha-card-background, var(--card-background-color, #fff))', text: 'var(--primary-text-color)' }
};

class NotificationCard extends UtilityCard implements LovelaceCard {
  @state() private _config: Config = { type: 'custom:catdad-notification-card' };
  @state() private _editMode: boolean = false;
  @state() private notifications: PersistedNotification[] = [];

  protected readonly name: string = NAME;

  private _hass?: HomeAssistant;
  private _unsubscribe?: UnsubscribeFunc;
  private mounted = false;

  get debug(): boolean {
    return !!this._config?.debug;
  }

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
    this._config = Object.assign({}, NotificationCard.getStubConfig(), config);
  }

  private showCard(): boolean {
    return this.debug || !!this.notifications.length;
  }

  private async connect(): Promise<void> {
    const connection = this._hass?.connection as unknown as Connection | undefined;

    if (!connection) {
      return;
    }

    this.disconnect();

    this._unsubscribe = await subscribeNotifications(connection, result => {
      this.logger.info(`notifications update:`, result, `continue: ${this.mounted}`);
      this.notifications = result;
    });
  }

  private disconnect(): void {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = undefined;
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.mounted = true;
    this.logger.debug('notification card mounted', this._editMode ? ' in edit mode' : '');
    this.connect();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.logger.debug('notification card unmounted', this._editMode ? ' in edit mode' : '');
    this.disconnect();
    this.mounted = false;
  }

  protected render() {
    if (this.showCard() === false) {
      return;
    }

    const config = this._config;

    const styles = compact([
      ...(config.backgroundColor ? [`--catdad-background-color: ${resolveColor(config.backgroundColor)}`] : []),
      ...(config.hrColor ? [`--catdad-hr-color: ${resolveColor(config.hrColor, 'var(--catdad-default-hr)')}`] : [])
    ]);

    return html`
      <ha-card class="root" style="${styles.join(';')}">
        ${this.notifications.map((notification) => {
          const data = parseId(notification.notification_id);
          const style = `--catdad-background: ${STYLE[data.level].background}; --catdad-text: ${STYLE[data.level].text}`;

          return html`
            <div class="notification" style="${style}">
              ${notification.title ? html`<div class="title">${notification.title}</div>` : ''}
              <ha-markdown breaks .hass="${this._hass}" .content="${notification.message}" />
            </div>
          `;
        })}
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        overflow: hidden;
        background: none;
      }

      hr {
        --catdad-default-hr: var(--ha-card-border-color, var(--divider-color, #e0e0e0));
        width: 100%;
        border-color: var(--catdad-hr-color, var(--catdad-default-hr));
        border-top: 0;
        border-bottom: 1;
        border-left: 0;
        border-right: 0;
      }

      .root {
        display: flex;
        flex-direction: column;
        gap: calc(var(--spacing, 12px) / 4);
        background: var(--catdad-background-color, none);
      }

      .notification {
        padding: var(--spacing, 12px);
        border-radius: calc(var(--ha-card-border-radius, var(--ha-border-radius-lg)) / 3);
        color: var(--catdad-text);
        background: var(--catdad-background);
      }

      .title {
        font-size: 1.2rem;
        line-height: 1.5;
        font-weight: bold;
      }
    `;
  }

  public static getConfigForm() {
    return {
      schema: [
        {
          name: 'debug',
          selector: { boolean: {} }
        },
        {
          name: 'backgroundColor',
          selector: {
            ui_color: {
              include_state: false,
            },
          },
        },
        {
          name: 'hrColor',
          selector: {
            ui_color: {
              include_state: false,
            },
          },
        },
      ],
      computeLabel: (schema: { name: keyof Config }) => {
        switch (schema.name) {
          case 'debug':
            return 'Render debug information on the card';
          case 'backgroundColor':
            return 'Background color';
          case 'hrColor':
            return 'Color of the line between notifications'
          default:
            return undefined;
        }
      },
      computeHelper: (schema: { name: keyof Config }) => {
        switch (schema.name) {
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

customElements.define(NAME, NotificationCard);

import { type CSSResultGroup, css, html } from 'lit';
import { state } from 'lit/decorators.js';
import { type HomeAssistant, type LovelaceCard } from 'custom-card-helpers';
import type { Connection, UnsubscribeFunc } from 'home-assistant-js-websocket';
import { defaults } from 'es-toolkit/compat';

import { HELPERS } from './utils/card-helpers';
import { UtilityCard } from './utils/utility-card';
import { type PersistedNotification, subscribeNotifications } from './utils/notificataion-subscribe';
import { lightness, textFromBackground } from './utils/color';

const NAME = 'catdad-notification-card' as const;

type Config = {
  type: `custom:${typeof NAME}`;
  heading?: string;
  headingStyle: 'title' | 'subtitle';
  debug?: boolean;
};

const getStubConfig = (): Config => ({
  type: `custom:${NAME}`,
  headingStyle: 'title'
});

export const card = {
  type: NAME,
  name: 'Catdad: Notification Card',
  description: 'Show persistent notications on a card'
};

type IDData = {
  level: 'success' | 'error' | 'warning' | 'info' | 'neutral',
  icon?: string;
  color?: string;
}

const parseId = (id: string): IDData => {
  const params = new URLSearchParams(id);

  const level = (['success', 'error', 'warning', 'info', 'neutral'] satisfies IDData['level'][])
    .includes(params.get('level') as IDData['level'])
      ? params.get('level') as IDData['level']
      : undefined;

  const icon = params.get('icon') || undefined;
  const color = params.get('color') || undefined;

  return defaults(
    { level, icon, color },
    { level: 'neutral' } as IDData,
  );
};

type NotificationStyle = { background: string, text: string, border: string };

const createStyle = (color: string): NotificationStyle => ({
  background: `#${color.replace(/#/g, '')}`,
  text: textFromBackground(color),
  border: lightness(color, 1.25)
})

const STYLE: Record<IDData['level'], NotificationStyle> = {
  success: createStyle('#1C7C54'),
  error: createStyle('#C14953'),
  warning: createStyle('#F6C304'),
  info: createStyle('#456990'),
  neutral: {
    background: 'var(--ha-card-background, var(--card-background-color, #fff))',
    text: 'var(--primary-text-color)',
    border: 'var(--ha-card-border-color, var(--divider-color, #e0e0e0))'
  }
};

class NotificationCard extends UtilityCard implements LovelaceCard {
  @state() private _config: Config = getStubConfig();
  @state() private _editMode: boolean = false;
  @state() private notifications: PersistedNotification[] = [];
  @state() private _helpers?;

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
    this._config = Object.assign({}, getStubConfig(), config);
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

    this._helpers = await HELPERS.helpers;
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

  createHeading() {
    if (!this._helpers) {
      return;
    }

    const { heading, headingStyle } = this._config;

    if (!heading) {
      return;
    }

    const element: LovelaceCard = this._helpers.createCardElement({
      type:'heading',
      heading_style: headingStyle,
      heading: heading
    });
    element.hass = this._hass;

    return html`<div class="heading" style="--catdad-heading-height: ${headingStyle === 'title' ? 'var(--row-height, 56px)' : 'initial'}">
      ${element}
    </div>`;
  }

  protected render() {
    if (this.showCard() === false) {
      return;
    }

    return html`
      ${this.createHeading()}
      <ha-card class="root">
        ${this.notifications.map((notification) => {
          const { level, icon, color } = parseId(notification.notification_id);
          const { background, text, border } = color ? createStyle(color) : (STYLE[level] || {});

          const style = [
            `--catdad-background: ${background}`,
            `--catdad-text: ${text}`,
            `--catdad-border: ${border}`,
          ];

          return html`
            <div class="notification" style="${style.join(';')}">
              ${icon && html`
                <div class="icon-container">
                  <ha-state-icon
                    slot="icon"
                    .icon=${icon}
                    .stateObj=${undefined}
                    .hass=${this._hass}
                  ></ha-state-icon>
                </div>
              `}
              <div>
                ${notification.title ? html`<div class="title">${notification.title}</div>` : ''}
                <ha-markdown breaks .hass="${this._hass}" .content="${notification.message}" />
              </div>
            </div>
          `;
        })}
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        --catdad-border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));

        overflow: hidden;
        background: none;
        border-width: 0;
        border-style: none;
        border-radius: 0;
      }

      .root {
        display: flex;
        flex-direction: column;
        gap: calc(var(--spacing, 12px) / 3);
        background: var(--catdad-background-color, none);
      }

      .heading {
        margin-bottom: var(--spacing, 12px);
        display: flex;
        flex-direction: column;
        justify-content: end;
        min-height: var(--catdad-heading-height);
      }

      .notification {
        padding: var(--spacing, 12px);
        display: flex;
        flex-direction: row;
        height: 100%;
        align-items: center;

        color: var(--catdad-text);
        background: var(--catdad-background);
        border-color: var(--catdad-border);

        border-width: var(--ha-card-border-width, 1px);
        border-style: solid;
        border-radius: calc(var(--catdad-border-radius) / 3);
      }
      .notification:first-child {
        border-top-right-radius: var(--catdad-border-radius);
        border-top-left-radius: var(--catdad-border-radius);
      }
      .notification:last-child {
        border-bottom-right-radius: var(--catdad-border-radius);
        border-bottom-left-radius: var(--catdad-border-radius);
      }

      .title {
        font-size: 1.2rem;
        line-height: 1.5;
        font-weight: bold;
      }

      .icon-container {
        position: relative;
        flex: none;
        margin-right: 10px;
        margin-inline-start: initial;
        margin-inline-end: 10px;
        direction: var(--direction);
        transition: transform 180ms ease-in-out;
      }
      .icon-container ha-state-icon {
        --tile-icon-color: var(--catdad-text);
        --icon-primary-color: var(--catdad-text);
        padding: 6px;
        user-select: none;
      }
    `;
  }

  public static getConfigForm() {
    return {
      schema: [
        { name: 'heading', selector: { text: {} } },
        { name: 'headingStyle', selector: {
          select: {
            options: [
              { value: "title", label: 'Title' },
              { value: "subtitle", label: 'Subtitle' }
            ],
          }
        }},
        { name: 'debug', selector: { boolean: {} } },
      ],
      computeLabel: (schema: { name: keyof Config }) => {
        switch (schema.name) {
          case 'heading':
            return 'Heading';
          case 'headingStyle':
            return 'Heading style';
          case 'debug':
            return 'Enable debug logging for this card';
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

  static getStubConfig(): Config {
    return getStubConfig();
  }
}

customElements.define(NAME, NotificationCard);

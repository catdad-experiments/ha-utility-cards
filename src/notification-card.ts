import { type CSSResultGroup, type TemplateResult, css, html } from 'lit';
import { state } from 'lit/decorators.js';
import { match } from 'ts-pattern';
import { type HomeAssistant, type LovelaceCardConfig, type LovelaceCard } from 'custom-card-helpers';
import { fireEvent, getMainElement } from './utils/events';

import { type Connection, type UnsubscribeFunc, subscribeRenderTemplate } from './utils/template-subscriber';
import { UtilityCard } from './utils/utility-card';
import { subscribeNotifications } from './utils/notificataion-subscribe';

const NAME = 'catdad-notification-card' as const;

type Config = LovelaceCardConfig & {
  type: `custom:${typeof NAME}`;
  debug?: boolean;
};

export const card = {
  type: NAME,
  name: 'Catdad: Notification Card',
  description: 'Show persistent notications on a card'
};

class NotificationCard extends UtilityCard implements LovelaceCard {
  @state() private _config?: Config;
  @state() private _editMode: boolean = false;

  protected readonly name: string = NAME;
  protected debug = true;

  private _hass?: HomeAssistant;
  private _unsubscribe?: UnsubscribeFunc;
  private mounted = false;

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
    return true;
  }

  private async connect(): Promise<void> {
    const connection = this._hass?.connection as unknown as Connection | undefined;

    if (!connection) {
      return;
    }

    this.disconnect();

    this._unsubscribe = await subscribeNotifications(connection, result => {
      this.logger.debug(`notifications update:`, result, `continue: ${this.mounted}`);

      if (this.mounted === false) {
        return;
      }

      // TODO use notifications
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
    return html`
      <ha-card style=${`${this.showCard() ? '' : 'display: none'}`}>
        <div class="root">
          this is the notification card
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
          name: 'debug',
          selector: { boolean: {} }
        },
      ],
      computeLabel: (schema: { name: keyof Config }) => {
        switch (schema.name) {
          case 'debug':
            return 'Render debug information on the card';
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

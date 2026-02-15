import { type CSSResultGroup, LitElement, html, css } from "lit";
import { state, property } from 'lit/decorators.js';
import { type HomeAssistant, type LovelaceCardConfig, type LovelaceCardEditor, type LovelaceConfig } from 'custom-card-helpers';
import { createLogger } from "./utils/log";
import { match } from 'ts-pattern';

type CustomConfig = {
  // this is handled by the card stack editor, don't know what its actual tyep is
  cards: any[];
  stackMode: 'horizontal-stack' | 'vertical-stack';
  title?: string;
  size?: number;
  sizeAlgorithm?: 'temp' | 'render' | 'component';
  hideBorder?: boolean;
  hideShadow?: boolean;
  hideRoundedCorners?: boolean;
  hideGap?: boolean;
};

export type Config = LovelaceCardConfig & CustomConfig;
export type CompleteConfig = CustomConfig & Required<Omit<CustomConfig, 'title'>>;

const tabs = ['cards', 'settings'] as const;

const schema = [
  {
    name: "stackMode",
    selector: {
      select: {
        options: [
          { value: "vertical-stack", label: 'vertical stack' },
          { value: "horizontal-stack", label: 'horizontal stack' }
        ],
      },
    },
  },
  { name: "hideBorder", selector: { boolean: {} } },
  { name: "hideShadow", selector: { boolean: {} } },
  { name: "hideRoundedCorners", selector: { boolean: {} } },
  { name: "hideGap", selector: { boolean: {} } },
] as const;

export const editorFactory = (NAME: string, stubConfig: Config, completeConfig: CompleteConfig) => {
  class CombinedCardEditor extends LitElement implements LovelaceCardEditor {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @property({ attribute: false }) public lovelace?: LovelaceConfig;

    @state() private _config: Config = stubConfig;
    @state() private selectedTab: (typeof tabs)[number] = tabs[0];

    private logger = createLogger({ name: `${NAME}-editor` });

    setConfig(config: Config): void {
      this._config = {
        // apply defaults
        ...stubConfig,
        ...config
      };
    }

    private configChanged(newConfig: Config): void {
      const filterKeys: (keyof CustomConfig)[] = ['hideBorder', 'hideGap', 'hideRoundedCorners', 'hideShadow'];

      // remove values that match the default
      for (const key of filterKeys) {
        if (completeConfig[key] === newConfig[key]) {
          delete newConfig[key];
        }
      }

      this.dispatchEvent(new CustomEvent('config-changed', {
        bubbles: true,
        composed: true,
        detail: { config: newConfig }
      }));
    }

    protected render() {
      return html`<div>
        <ha-tab-group @wa-tab-show=${(ev) => {
          // ev.detail.name seems to always be blank
        }}>
          ${tabs.map(value => html`
            <ha-tab-group-tab
              slot="nav"
              .id=${value}
              .panel=${value}
              .active=${this.selectedTab === value}
              @click=${() => { this.selectedTab = value; }}
            >
              ${value}
            </ha-tab-group-tab>`
        )}
        </ha-tab-group>

        <div style="margin: 1rem 0;" />

        ${
          match(this.selectedTab)
            .with('cards', () => html`
              <hui-stack-card-editor
                @config-changed=${(ev) => {
                  ev.stopPropagation();

                  this.configChanged({
                    ...this._config,
                    ...ev.detail.config,
                    type: stubConfig.type,
                  });
                }}
                ._config=${{
                  cards: this._config.cards || [],
                  title: this._config.title,
                  // here, the stack editor needs to know which stack it is editing
                  // we ignore this value ourselves
                  type: 'vertical-stack'
                }}
                .hass=${this.hass}
                .lovelace=${this.lovelace}
              />
            `)
            .with('settings', () => html`
              <ha-form
                .hass=${this.hass}
                .data=${{
                  ...completeConfig,
                  ...this._config
                }}
                .schema=${schema}
                .computeLabel=${(element: (typeof schema)[number]) => {
                  return match(element)
                    .with({ name: 'stackMode' }, () => 'Stack mode')
                    .with({ name: 'hideBorder' }, () => 'Hide border')
                    .with({ name: 'hideShadow' }, () => 'Hide shadow')
                    .with({ name: 'hideRoundedCorners' }, () => 'Hide rounded corners')
                    .with({ name: 'hideGap' }, () => 'Hide gap')
                    .otherwise(({ name }) => name);
                }}
                @value-changed=${(ev) => {
                  const { stackMode, hideBorder, hideShadow, hideRoundedCorners, hideGap } = (ev?.detail?.value || {}) as Config;

                  this.configChanged({
                    ...this._config,
                    stackMode,
                    hideBorder,
                    hideShadow,
                    hideRoundedCorners,
                    hideGap,
                  });
                }}
              ></ha-form>
            `)
            .exhaustive()
        }
      </div>`;
    }

    static get styles(): CSSResultGroup {
      return css``;
    }
  }

  return CombinedCardEditor;
};

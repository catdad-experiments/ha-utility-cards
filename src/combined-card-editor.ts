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
  themeColor?: string;
  themeColorInputType?: 'ui_color' | 'template';
  cardBackgroundColor?: string;
  cardBackgroundColorInputType?: 'ui_color' | 'template';
  cardBackgroundOpacity?: number;
  debug?: boolean;
};

export type Config = LovelaceCardConfig & CustomConfig;
export type CompleteConfig = CustomConfig & Required<Omit<CustomConfig, 'title'>>;

const tabs = ['cards', 'settings'] as const;

const getSchema = (config: Partial<CompleteConfig>) => [
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
  {
    type: 'expandable', name: '', flatten: true, expanded: true,
    icon: 'mdi:test-tube',
    title: html`<div>
      <p>Experimental: card theme</p>
      <p style="font-size: 0.85rem; font-weight: normal; max-width: 65ch; line-height: 1.2;">
        Set a background color for the entire combined card and all cards inside it.
        Font and icons colors will adjust automatically to look good with the selected color.
      </p>
    </div>`,
    schema: [{
      name: 'themeColorInputType',
      selector: {
        select: {
          options: [
            { value: "ui_color", label: 'color picker' },
            { value: "template", label: 'template' }
          ],
          orientation: 'horizontal'
        },
      },
    }, {
        name: 'themeColor',
        selector: config.themeColorInputType === 'template' ? {
          template: {}
        } : {
          ui_color: {
            include_state: false,
          },
        },
      }],
  },
  {
    type: 'expandable', name: '', flatten: true, expanded: true,
    icon: 'mdi:test-tube',
    title: html`<div>
      <p>Experimental: card background</p>
      <p style="font-size: 0.85rem; font-weight: normal; max-width: 65ch; line-height: 1.2;">
        Similar to section colors. Works best if you do not hide borders,
        gaps, etc. so that cards appear to render as full cards, showing the
        background behind them.
      </p>
    </div>`,
    schema: [{
      name: 'cardBackgroundColorInputType',
      selector: {
        select: {
          options: [
            { value: "ui_color", label: 'color picker' },
            { value: "template", label: 'template' }
          ],
        },
      },
    }, {
      name: 'cardBackgroundColor',
      selector: config.cardBackgroundColorInputType === 'template' ? {
        template: {}
      } : {
        ui_color: {
          include_state: false,
        },
      },
    },
    {
      name: 'cardBackgroundOpacity',
      selector: { number: { min: 0, max: 100 }},
    }],
  },
  { name: "debug", selector: { boolean: {} } },
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
      const filterKeys: (keyof CustomConfig)[] = [
        'hideBorder', 'hideGap', 'hideRoundedCorners', 'hideShadow',
        'themeColorInputType', 'cardBackgroundColorInputType',
      ];

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
                .schema=${getSchema(this._config)}
                .computeLabel=${(element: { name: keyof CustomConfig }) => {
                  return match(element)
                    .with({ name: 'stackMode' }, () => 'Stack mode')
                    .with({ name: 'hideBorder' }, () => 'Hide border')
                    .with({ name: 'hideShadow' }, () => 'Hide shadow')
                    .with({ name: 'hideRoundedCorners' }, () => 'Hide rounded corners')
                    .with({ name: 'hideGap' }, () => 'Hide gap')
                    .with({ name: 'themeColor' }, () => 'Full theme background color')
                    .with({ name: 'cardBackgroundColor' }, () => 'Card background color')
                    .with({ name: 'cardBackgroundOpacity' }, () => 'Card background opacity')
                    .with({ name: 'themeColorInputType' }, { name: 'cardBackgroundColorInputType' }, () => 'Color picker type')
                    .with({ name: 'debug' }, () => 'Debug logging')
                    .otherwise(({ name }) => name);
                }}
                @value-changed=${(ev) => {
                  const {
                    stackMode,
                    hideBorder,
                    hideShadow,
                    hideRoundedCorners,
                    hideGap,
                    themeColor,
                    themeColorInputType,
                    cardBackgroundColor,
                    cardBackgroundOpacity,
                    cardBackgroundColorInputType,
                    debug
                  } = (ev?.detail?.value || {}) as Config;

                  this.configChanged({
                    ...this._config,
                    stackMode,
                    hideBorder,
                    hideShadow,
                    hideRoundedCorners,
                    hideGap,
                    themeColor,
                    themeColorInputType,
                    cardBackgroundColor,
                    cardBackgroundOpacity,
                    cardBackgroundColorInputType,
                    debug,
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

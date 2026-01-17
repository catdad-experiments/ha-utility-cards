import { LitElement } from 'lit';
import { type LovelaceCard } from 'custom-card-helpers';
import { type Logger, type LoggerOptions, createLogger } from './log';

export class UtilityCard extends LitElement implements Partial<LovelaceCard> {
  protected name: string = 'utility-card';

  protected loggerOptions: LoggerOptions = {
    name: this.name,
    level: 'info'
  };

  protected get logger(): Logger {
    return createLogger({ ...this.loggerOptions, name: this.name });
  };
}

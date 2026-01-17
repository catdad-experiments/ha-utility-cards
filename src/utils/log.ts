import { version } from '../../package.json';

const PROJECT = 'catdad utility cards';

const pillStyle = (color: string) => `color: ${color}; font-weight: bold; background: #555; border-radius: 2rem`;
const pillText = (text: string) => `%c ${text} \x1B[m`;

const pill = `${pillText(`${PROJECT} v${version}`)}`;

/** @deprecated */
export const LOG = (first: string, ...args: any[]) => {
  console.log(`${pill} ${first}`, pillStyle('#bad155'), ...args);
};

type LogArgs = Parameters<typeof LOG>;

/** @deprecated */
export const LOG_EDITOR = (first: string, ...args: any[]) => {
  LOG(`${pillText('editor')} ${first}`, pillStyle('#D15798'), ...args);
}

export type Logger = {
  error: (...args: LogArgs) => void,
  info: (...args: LogArgs) => void,
  debug: (...args: LogArgs) => void
};

export type LoggerOptions = {
  name: string,
  level?: 'silent' | 'info' | 'debug',
  color?: string
};

export const createLogger = ({
  name,
  level = 'info',
  color = '#D15798'
}: LoggerOptions): Logger => {
  const write = (...args: LogArgs) => {
    const [first, ...rest] = args;
    console.log(`${pill} ${pillText(name)} ${first}`, pillStyle('#bada55'), pillStyle(color), ...rest);
  };

  const info: Logger['info'] = (...args: LogArgs) => {
      if (level === 'info' || level === 'debug') {
        write(...args);
      }
    };

  const debug: Logger['debug'] = (...args: LogArgs) => {
      if (level === 'debug') {
        write(...args);
      }
    };

  const error = info;

  return { error, info, debug };
};

export const initLogger = createLogger({ name: 'init', color: '#F6C304' });

initLogger.info('loaded 😺');

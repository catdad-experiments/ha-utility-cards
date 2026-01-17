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

type Level = 'error' | 'info' | 'debug';
type LogFunc = (...args: LogArgs) => void;
export type Logger = Record<Level, LogFunc>;

const levels: Record<Level, number> = {
  error: 5,
  info: 3,
  debug: 1
}

const noop = () => { };

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

  return {
    error: levels['error'] >= levels[level] ? write : noop,
    info: levels['info'] >= levels[level] ? write : noop,
    debug: levels['debug'] >= levels[level] ? write : noop,
  };
};

export const initLogger = createLogger({ name: 'init', color: '#F6C304' });

initLogger.info('loaded 😺');

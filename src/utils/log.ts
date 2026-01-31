import { version } from '../../package.json';

const SHORT = '😺';
const PROJECT = `catdad utility cards v${version}`;

const pillStyle = (color: string) => `color: ${color}; font-weight: bold; background: #555; border-radius: 2rem`;
const pillText = (text: string) => `%c ${text} \x1B[m`;

const pill = `${pillText(SHORT)}`;

type Level = 'error' | 'info' | 'debug';
type LogFunc = (first: string, ...rest: any) => void;
export type Logger = Record<Level, LogFunc>;

const levels: Record<Level, number> = {
  error: 5,
  info: 3,
  debug: 1
}

const noop: LogFunc = () => { };

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
  const write: LogFunc = (first, ...rest) => {
    console.log(`${pill} ${pillText(name)} ${first}`, pillStyle('#bada55'), pillStyle(color), ...rest);
  };

  return {
    error: levels['error'] >= levels[level] ? write : noop,
    info: levels['info'] >= levels[level] ? write : noop,
    debug: levels['debug'] >= levels[level] ? write : noop,
  };
};

export const initLogger = createLogger({ name: PROJECT, color: '#F6C304' });

initLogger.info('loaded');

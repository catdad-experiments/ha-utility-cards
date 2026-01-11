import * as pjson from '../../package.json';

const PROJECT = 'catdad utility cards';

const pillStyle = (color: string) => `color: ${color}; font-weight: bold; background: #555; border-radius: 2rem`;
const pillText = (text: string) => `%c ${text} \x1B[m`;

export const LOG = (first: string, ...args: any[]) => {
  console.log(`${pillText(`${PROJECT} v${pjson.version}`)} ${first}`, pillStyle('#bad155'), ...args);
};

export const LOG_EDITOR = (first: string, ...args: any[]) => {
  LOG(`${pillText('editor')} ${first}`, pillStyle('#D15798'), ...args);
}

LOG('loaded');

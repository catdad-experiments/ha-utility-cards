import { createLogger } from "./log";

const logger = createLogger({ name: 'history manager', color: '#eeeeee'});

export const HistoryEvent = {
  back: 'catdad-history-back',
  forward: 'catdad-history-forward',
  go: 'catdad-history-go',
  pushState: 'catdad-history-pushstate',
  replaceState: 'catdad-history-replacestate'
};

window.history.back = (...args) => {
  logger.info('BACK', args);

  History.prototype.back.apply(history, args);
  window.dispatchEvent(new CustomEvent(HistoryEvent.back));
};

window.history.forward = (...args) => {
  logger.info('FORWARD', args);

  History.prototype.forward.apply(history, args);
  window.dispatchEvent(new CustomEvent(HistoryEvent.forward));
};

window.history.go = (...args) => {
  logger.info('GO', args);

  History.prototype.go.apply(history, args);
  window.dispatchEvent(new CustomEvent(HistoryEvent.go));
};

window.history.pushState = (...args) => {
  logger.info('PUSHSTATE', args);

  History.prototype.pushState.apply(history, args);
  window.dispatchEvent(new CustomEvent(HistoryEvent.pushState));
};

window.history.replaceState = (...args) => {
  logger.info('REPLACESTATE', args);

  History.prototype.replaceState.apply(history, args);
  window.dispatchEvent(new CustomEvent(HistoryEvent.replaceState));
};

logger.info('patch applied');

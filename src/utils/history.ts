export const HistoryEvent = {
  back: 'catdad-history-back',
  forward: 'catdad-history-forward',
  go: 'catdad-history-go',
  pushState: 'catdad-history-pushstate',
  replaceState: 'catdad-history-replacestate'
};

window.history.back = (...args) => {
  console.log('BACK', args);

  History.prototype.back.apply(history, args);
  window.dispatchEvent(new CustomEvent(HistoryEvent.back));
};

window.history.forward = (...args) => {
  console.log('FORWARD', args);

  History.prototype.forward.apply(history, args);
  window.dispatchEvent(new CustomEvent(HistoryEvent.forward));
};

window.history.go = (...args) => {
  console.log('GO', args);

  History.prototype.go.apply(history, args);
  window.dispatchEvent(new CustomEvent(HistoryEvent.go));
};

window.history.pushState = (...args) => {
  console.log('PUSHSTATE', args);

  History.prototype.pushState.apply(history, args);
  window.dispatchEvent(new CustomEvent(HistoryEvent.pushState));
};

window.history.replaceState = (...args) => {
  console.log('REPLACESTATE', args);

  History.prototype.replaceState.apply(history, args);
  window.dispatchEvent(new CustomEvent(HistoryEvent.replaceState));
};

console.log('PATCHED HISTORY');

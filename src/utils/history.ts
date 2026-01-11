export const HistoryEvent = {
  back: 'catdad-history-back',
  forward: 'catdad-history-forward',
  go: 'catdad-history-go',
  pushState: 'catdad-history-pushstate',
  replaceState: 'catdad-history-replacestate'
};

window.history.back = (...args) => {
  console.log('BACK', args);

  window.dispatchEvent(new CustomEvent(HistoryEvent.back));
  History.prototype.back.apply(history, args);
};

window.history.forward = (...args) => {
  console.log('FORWARD', args);

  window.dispatchEvent(new CustomEvent(HistoryEvent.forward));
  History.prototype.forward.apply(history, args);
};

window.history.go = (...args) => {
  console.log('GO', args);

  window.dispatchEvent(new CustomEvent(HistoryEvent.go));
  History.prototype.go.apply(history, args);
};

window.history.pushState = (...args) => {
  console.log('PUSHSTATE', args);

  window.dispatchEvent(new CustomEvent(HistoryEvent.pushState));
  History.prototype.pushState.apply(history, args);
};

window.history.replaceState = (...args) => {
  console.log('REPLACESTATE', args);

  window.dispatchEvent(new CustomEvent(HistoryEvent.replaceState));
  History.prototype.replaceState.apply(history, args);
};

console.log('PATCHED HISTORY');

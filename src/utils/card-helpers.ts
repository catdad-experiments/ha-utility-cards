import { type FN } from './types';

// Home Assistant really needs to make this an SDK so that we can
// stop trying to hack it. When they use these helpers, they can
// use them synchronously, but third-party devs can't.
export const HELPERS = ((loadCardHelpers, callbacks: FN[]) => {
  const fileBugStr = 'Please file a bug at https://github.com/catdad-experiments/ha-combined-card and explain your setup.';
  let _helpers;

  if (!loadCardHelpers) {
    throw new Error(`This instance of Home Assistant does not have global card helpers. ${fileBugStr}`);
  }

  loadCardHelpers().then(helpers => {
    _helpers = helpers;

    for (const func of callbacks) {
      try {
        func();
      } catch (e) {
        console.error(`Failed to execute helpers callback:`, e);
      }
    }

    callbacks = [];
  }).catch(err => {
    throw new Error(`Failed to load card helpers. ${fileBugStr}: ${err.message}`);
  });

  return {
    get helpers() {
      return _helpers;
    },
    get loaded() {
      return !!_helpers;
    },
    get whenLoaded() {
      return new Promise(resolve => {
        if (_helpers) {
          return resolve(_helpers);
        }

        callbacks.push(() => resolve(_helpers));
      });
    }
  };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
})((window as any).loadCardHelpers, []);

// Home Assistant REALLY needs to create an SDK for this
export const loadStackEditor = async () => {
  const name = 'hui-vertical-stack-card';

  await Promise.all([
    // make sure the editor for the stack cards is loaded
    customElements.whenDefined('hui-stack-card-editor'),
    // load the editor for the stack cards
    customElements.whenDefined(name).then((Element) => {
      return (Element as any).getConfigElement();
    }),
    // load a stack card so that we can use it to load its editor
    HELPERS.whenLoaded.then((helpers) => {
      return (helpers as any).createCardElement({
        type: 'vertical-stack',
        cards: []
      });
    })
  ]);

  // create a stack card, then create an instance of
  // its editor for us to use as the combined-card editor
  const stackCard = document.createElement(name);

  // @ts-ignore
  return await stackCard.constructor.getConfigElement();
};

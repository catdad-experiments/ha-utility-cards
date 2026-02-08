import { querySelectorDeep } from 'query-selector-shadow-dom';

export const getMainElement = (): HTMLElement | null => {
  return querySelectorDeep('home-assistant') || querySelectorDeep('hc-main') || null;
};

export const fireEvent = (elem: HTMLElement, name: string, detail: unknown) => {
  elem.dispatchEvent(new CustomEvent(name, { detail }));
};

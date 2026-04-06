import convert from 'color-convert';

const hsl = (color: string) => convert.hex.hsl(color.replace(/#/g, ''));
const rgb = (color: string) => convert.hex.rgb(color.replace(/#/g, ''));
const name = (color: string) => {
  try {
    return convert.keyword.hex(color).toLowerCase();
  } catch {
    return null;
  }
};

const isLight = (r: number, g: number, b: number): boolean => {
  // HSP (Highly Sensitive Poo) equation
  const hsp = Math.sqrt(
    0.299 * (r * r) +
    0.587 * (g * g) +
    0.114 * (b * b)
  );

  return hsp > 127.5;
}

export const ensureColor = (color: string): string => name(color) || color;

export const textFromBackground = (background: string): string => {
  const [h, s] = hsl(ensureColor(background));
  const [r, g, b] = rgb(ensureColor(background));

  const text = isLight(r, g, b) ?
    // color is light, use dark text
    convert.hsl.hex([h, s, 20]) :
    // color is dark, use light text
    convert.hsl.hex([h, s, 85]);

  return `#${text}`;
};

export const lightness = (color: string, by: number): string => {
  const [h, s, l] = hsl(color);

  return `#${convert.hsl.hex([h, s, l * by])}`;
};

export const opacity = (color: string, opacity: number): string => {
  return `rgba(${rgb(color).join(',')},${opacity})`;
}

export const rgbCssVar = (color: string): string => rgb(ensureColor(color)).join(',');

export const applyOpacity = (bottom: string, top: string, topOpacity: number): string => {
  const [br, bg, bb] = rgb(ensureColor(bottom));
  const [tr, tg, tb] = rgb(ensureColor(top));

  const r = (br * (1 - topOpacity)) + (tr * topOpacity);
  const g = (bg * (1 - topOpacity)) + (tg * topOpacity);
  const b = (bb * (1 - topOpacity)) + (tb * topOpacity);

  return `#${convert.rgb.hex(r, g, b)}`;
};

import convert from 'color-convert';

const hsl = (color: string) => convert.hex.hsl(color.replace(/#/g, ''));

export const textFromBackground = (background: string): string => {
  const [h, s] = hsl(background);
  const [, , v] = convert.hex.hsv(background.replace(/#/g, ''));

  const text = v < 80 ?
    // color is dark, use light text
    convert.hsl.hex([h, s, 85]) :
    // color is light, use dark text
    convert.hsl.hex([h, s, 20]);

  return `#${text}`;
};

export const lightness = (color: string, by: number): string => {
  const [h, s, l] = hsl(color);

  return `#${convert.hsl.hex([h, s, l * by])}`;
};

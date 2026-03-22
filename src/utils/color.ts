import convert from "color-convert";

export const textFromBackground = (background: string): string => {
  const [h, s, l] = convert.hex.hsl(background.replace(/#/g, ''));
  const [,,v] = convert.hex.hsv(background.replace(/#/g, ''));

  const text = v < 80 ?
    // color is dark, use light text
    convert.hsl.hex([h, s, 85]) :
    // color is light, use dark text
    convert.hsl.hex([h, s, 15]);

  return `#${text}`;
};

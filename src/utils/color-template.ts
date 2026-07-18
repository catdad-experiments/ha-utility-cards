import { type Connection, type UnsubscribeFunc, subscribeRenderTemplate } from './template-subscriber';
import { type Logger } from './log';
import { computeColor } from './types';

export const renderColorTemplate = async (
  { connection, logger }: { connection: Connection, logger: Logger },
  template: string,
  onUpdate: (value: string) => void
): Promise<UnsubscribeFunc | undefined> => {
  // most of the time, this won't be a template, so attempt
  // to use it as a normal color first
  const result = computeColor(template) || undefined;

  if (result) {
    logger.debug(`rendered color template as simple color:`, { input: template, output: result });
    return void onUpdate(result);
  }

  try {
    const unsubscribe = await subscribeRenderTemplate(connection, result => {
      const renderedString = result.result?.trim?.();
      const resultColor = renderedString ? computeColor(renderedString) || undefined : undefined;

      logger.debug(`rendered color template as template string:`, {
        input: template,
        intermediate: renderedString,
        output: resultColor,
      });

      if (resultColor) {
        onUpdate(resultColor);
      }
    }, { template });

    return unsubscribe;
  } catch (e) {
    logger.error(`failed to render background color template\n${template}\n\n`, e);
  }

  return;
};

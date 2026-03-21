import type { Connection, UnsubscribeFunc } from 'home-assistant-js-websocket';
import { get, sortBy, uniqBy, differenceBy } from 'es-toolkit/compat';

export type PersistedNotification = {
  notification_id: string;
  created_at: string;
  message: string;
  title?: string | null;
};

type UpdateType = 'current' | 'added' | 'removed';

export const subscribeNotifications = async (
  conn: Connection,
  onChange: (result: PersistedNotification[]) => void
): Promise<UnsubscribeFunc> => {
  let NOTIFICATIONS: PersistedNotification[] = [];

  const unsubscribe = await conn.subscribeMessage(
    (message) => {
      const type = get(message, 'type', 'current') as unknown as UpdateType;
      const notifications = Object.values(get(message, 'notifications', {})) as PersistedNotification[];

      switch (type) {
        case 'current':
        case 'added':
          NOTIFICATIONS = uniqBy([...NOTIFICATIONS, ...notifications], 'notification_id');
          break;
        case 'removed':
          NOTIFICATIONS = differenceBy(NOTIFICATIONS, notifications, 'notification_id');
          break;
      }

      onChange(sortBy(NOTIFICATIONS, 'created_at').reverse());
    },
    {
      type: 'persistent_notification/subscribe',
    }
  );

  return () => {
    NOTIFICATIONS = [];
    unsubscribe();
  };
}

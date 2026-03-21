import type { Connection, UnsubscribeFunc } from 'home-assistant-js-websocket';
import { get, sortBy } from 'es-toolkit/compat';

type PersistedNotification = {
  notification_id: string;
  created_at: string;
  title: string;
  // TODO is this optional?
  message: string;
};

export const subscribeNotifications = async (
  conn: Connection,
  onChange: (result: PersistedNotification[]) => void
): Promise<UnsubscribeFunc> => await conn.subscribeMessage(
  (message) => {
    const notifications = Object.values(get(message, 'notifications', {})) as PersistedNotification[];
    onChange(sortBy(notifications, 'created_at'));
  },
  {
    type: 'persistent_notification/subscribe',
  }
);

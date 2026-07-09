import type { ReminderOffset } from "@/lib/push/reminder-offset";

export type ReminderPayload = {
  todoId: string;
  text: string;
  remindAt: string;
  offset?: ReminderOffset;
};

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type ReminderPayload = {
  todoId: string;
  text: string;
  remindAt: string;
};

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

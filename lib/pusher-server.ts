import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || "app-id",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "app-key",
  secret: process.env.PUSHER_SECRET || "app-secret",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
  useTLS: true,
});

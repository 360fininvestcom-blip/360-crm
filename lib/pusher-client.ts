import Pusher from "pusher-js";

export const pusherClient = new Pusher(
  process.env.NEXT_PUBLIC_PUSHER_KEY || "app-key",
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
    authEndpoint: "/api/pusher/auth",
  }
);

import { Client } from "@heroiclabs/nakama-js";

import { nakamaEnv } from "@/lib/env";

let browserClient: Client | null = null;

export function createNakamaClient(): Client {
  if (browserClient) {
    return browserClient;
  }

  browserClient = new Client(
    nakamaEnv.serverKey,
    nakamaEnv.host,
    nakamaEnv.port,
    nakamaEnv.useSSL
  );

  return browserClient;
}

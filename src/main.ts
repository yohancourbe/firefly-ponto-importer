import { bootstrap, Bootstrapped } from "jsr:@dx/inject";
import { LoggingService } from "./lib/logging/mod.ts";
import { SyncPonto } from "./sync-ponto.ts";
import { SyncPluxee } from "./sync-pluxee.ts";

@Bootstrapped()
export class Main {
  constructor(
    private readonly logging: LoggingService,
    private readonly syncPonto: SyncPonto,
    private readonly syncPluxee: SyncPluxee
  ) {
    this.logging.info("Starting Data Importer");
  }

  public async run() {
    if (Deno.env.get("PONTO_SYNC_ENABLED") === "true") {
      this.logging.info("Starting sync");
      await this.syncPonto.run();
    } else {
      this.logging.info("Skipping Ponto sync");
    }

    if (Deno.env.get("PLUXEE_SYNC_ENABLED") === "true") {
      this.logging.info("Starting sync Pluxee");
      await this.syncPluxee.run();
    } else {
      this.logging.info("Skipping Pluxee sync");
    }
  }
}

const hours_between_syncs = Number(Deno.env.get("HOURS_BETWEEN_SYNCS")) || 6;
const main: Main = bootstrap(Main);

while (true) {
  main.run();
  await new Promise((resolve) => setTimeout(resolve, hours_between_syncs * 3600 * 1000));
}

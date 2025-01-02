import { Injectable } from "jsr:@dx/inject";
import Logging from "jsr:@proxnet/undead-logging";

@Injectable({ isSingleton: false })
export class LoggingService {
  private readonly log = new Logging("App");

  constructor() {}

  public set source(source: string) {
    this.log.source = source;
  }

  public info(message: string): void {
    this.log.info(message);
  }

  public error(message: string): void {
    this.log.error(message);
  }

  public warn(message: string): void {
    this.log.warn(message);
  }

  public debug(message: string): void {
    this.log.debug(message);
  }
}

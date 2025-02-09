import { crypto } from "jsr:@std/crypto";
import { encodeHex } from "jsr:@std/encoding/hex";
import { JSDOM } from "npm:jsdom";
import { Injectable } from "jsr:@dx/inject";
import { LoggingService } from "../logging/mod.ts";

@Injectable()
export class PluxeeClient {
  private baseUrl: string = "https://users.pluxee.be/fr";

  public readonly username: string = Deno.env.get("PLUXEE_USERNAME") || "";
  private readonly password: string = Deno.env.get("PLUXEE_PASSWORD") || "";

  private cookie: string = "";

  constructor(private readonly logging: LoggingService) {
    this.logging.source = "PluxeeClient";
  }

  public async login() {
    this.logging.info("Logging in");

    try {
      const requestUrl = new URL(`${this.baseUrl}/user/login`);
      const request: RequestInit = {
        method: "POST",
        redirect: "manual",
        body: new URLSearchParams({
          name: this.username,
          pass: this.password,
          form_id: "user_login_form",
          form_build_id: "form_build_id",
          op: "Se connecter",
        }),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      };

      this.logging.debug(`Requesting ${request.method} ${requestUrl}`);
      const response = await fetch(requestUrl, request);
      this.logging.debug(`Request succeed with status: ${response.status}`);

      if (response.status === 303 && response.headers.get("location") === "https://users.pluxee.be/fr?check_logged_in=1") {
        const cookies = response.headers.getSetCookie() || "";
        for (const cookie of cookies[0].split(";")) {
          if (cookie.includes("SSESS")) {
            this.logging.info("Logged in");
            this.cookie = cookie;
          }
        }
      } else {
        const hiddenPassword = this.password[0] + "*".repeat(this.password.length - 2) + this.password[this.password.length - 1];
        this.logging.error(`Login failed with username ${this.username} and password ${hiddenPassword}`);
      }
    } catch (error) {
      this.logging.error(`Login failed with ${error}`);
    }
  }

  private async get(url: string) {
    if (!this.cookie) {
      throw new Error("Not logged in");
    }

    try {
      const requestUrl = new URL(`${this.baseUrl}/${url}`);
      const request: RequestInit = {
        method: "GET",
        headers: {
          Cookie: [this.cookie].join("; "),
        },
      };

      this.logging.debug(`Requesting ${request.method} ${requestUrl}`);
      const response = await fetch(requestUrl, request);
      this.logging.debug(`Request succeed with status: ${response.status}`);

      return this.parseHtml(await response.text());
    } catch (error) {
      this.logging.error(`Request failed with ${error}`);
    }
  }

  private parseHtml(html: string) {
    const dom = new JSDOM(html);
    return dom.window.document;
  }

  public async getTransactions(type: PluxeeAccountType, page: number = 1): Promise<PluxeeTransaction[]> {
    const transactions: PluxeeTransaction[] = [];

    const document = await this.get(`mon-solde-sodexo-card?type=${type}&page=${page}`);
    const transactionRows = document.querySelectorAll(".table > tbody > tr");

    for (const row of transactionRows) {
      const date = new Date(
        row
          .querySelector("td.views-field-date")
          .textContent.trim()
          .replace(/(\d{2}).(\d{2}).(\d{4})/, "$3-$2-$1 12:00:00")
      );
      const counterpartName = row.querySelector("td.views-field-description").textContent.trim();
      const details = row.querySelector("td.views-field-detail").textContent.trim();
      const amount = parseFloat(
        row.querySelector("td.views-field-amount").textContent.trim().replace(" ", "").replace("EUR", "")
      );

      const transactionHash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`${date}${counterpartName}${details}${amount}`)
      );

      transactions.push({ date, counterpartName: `pluxee:${counterpartName}`, details, amount, id: encodeHex(transactionHash) });
    }

    return transactions;
  }

  public async getBalance(type: PluxeeAccountType): Promise<number> {
    const document = await this.get(`mon-solde-sodexo-card?type=${type}`);
    const balance = document
      .querySelector(`.current > div > div > h3`)
      .textContent.trim()
      .replace(" ", "")
      .replace("EUR", "")
      .replace(",", ".");
    return parseFloat(balance);
  }
}

export interface PluxeeTransaction {
  date: Date;
  counterpartName: string;
  details: string;
  amount: number;
  id: string;
}

export enum PluxeeAccountType {
  ECO = "ECO",
  LUNCH = "LUNCH",
}

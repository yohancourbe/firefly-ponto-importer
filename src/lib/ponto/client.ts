import { Injectable } from "jsr:@dx/inject";

import { AccessToken } from "./access-token.ts";
import { LoggingService } from "../logging/mod.ts";

@Injectable()
export class PontoClient {
  public apiBaseUrl: string = "https://api.myponto.com";

  private clientId: string = Deno.env.get("PONTO_CLIENT_ID") || "";
  private clientSecret: string = Deno.env.get("PONTO_CLIENT_SECRET") || "";
  private accessToken: AccessToken | null = null;

  constructor(private readonly logging: LoggingService) {
    this.logging.source = "PontoClient";
  }

  public async auth(): Promise<string> {
    if (this.accessToken && this.accessToken.isValid()) {
      this.logging.debug("Using cached access token, still valid until " + this.accessToken.expiresAt);
      return this.accessToken.token;
    } else {
      const request = new Request(`${this.apiBaseUrl}/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
        }),
      });

      this.logging.debug(`Requesting ${request.method} ${request.url}`);
      const response = await fetch(request);

      if (response.ok) {
        this.logging.debug("Authenticated with Ponto API");
        const data = await response.json();
        this.accessToken = new AccessToken(data.access_token, data.expires_in);
        return data.access_token;
      } else {
        this.logging.error("Failed to authenticate with Ponto API");
        throw new Error("Failed to authenticate with Ponto API");
      }
    }
  }

  public get<T>(path: string, options?: { limit?: number; after?: string; before?: string }): Promise<PontoBaseResponse<T>> {
    return this.request<T>(path, "GET", undefined, options);
  }

  public async request<T>(
    path: string,
    method: string,
    data?: Record<string, unknown>,
    paging?: { limit?: number; after?: string; before?: string }
  ): Promise<PontoBaseResponse<T>> {
    paging = paging || {};
    paging.after = paging?.after || "";
    paging.before = paging?.before || "";
    paging.limit = paging?.limit || 50;

    const accessToken = await this.auth();

    const request = new Request(new URL(`${this.apiBaseUrl}/${path}?page[limit]=${paging.limit}&page[after]=${paging.after}&page[before]=${paging.before}`), {
      method,
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    this.logging.debug(`Requesting ${request.method} ${request.url}`);
    const response = await fetch(request);

    if (response.ok) {
      this.logging.debug(`Successfully fetched data from Ponto API: ${response.url}`);

      const responseData = await response.json();
      return new PontoBaseResponse<T>(responseData);
    } else {
      this.logging.error(`Failed to fetch data from Ponto API: ${response.url} with status: ${response.status}`);
      throw new Error();
    }
  }
}

export class PontoBaseResponse<T> {
  data: T;
  links: {
    prev: string;
    next: string;
    first: string;
  };
  meta: {
    paging: {
      limit: number;
      before: string;
      after: string;
    };
  };

  constructor(body: PontoBaseResponse<T>) {
    this.data = body.data;
    this.links = body.links;
    this.meta = body.meta;
  }

  hasNext(): boolean {
    return !!this.links?.next;
  }

  hasPrevious(): boolean {
    return !!this.links?.prev;
  }
}
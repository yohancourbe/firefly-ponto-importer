import { Injectable } from "jsr:@dx/inject";
import { LoggingService } from "../logging/mod.ts";

@Injectable()
export class FireflyClient {
  public apiBaseUrl: string = Deno.env.get("FIREFLY_API_URL") || "http://localhost/api/v1";

  private accessToken: string = Deno.env.get("FIREFLY_ACCESS_TOKEN") || "";

  constructor(private readonly logging: LoggingService) {
    this.logging.source = "FireflyClient";
  }

  public get<T>(path: string, queryParams?: Record<string, unknown>): Promise<FireflyBaseResponse<T>> {
    queryParams = queryParams || {};
    queryParams.limit = queryParams.limit || 50;
    return this.request<T>(path, "GET", undefined, queryParams);
  }

  public post<T>(path: string, data: Record<string, unknown>): Promise<FireflyBaseResponse<T>> {
    data = data || {};
    return this.request<T>(path, "POST", data);
  }

  public put<T>(path: string, data: Record<string, unknown>): Promise<FireflyBaseResponse<T>> {
    data = data || {};
    return this.request<T>(path, "PUT", data);
  }

  public async request<T>(path: string, method: string, data?: Record<string, unknown>, queryParams?: Record<string, unknown>): Promise<FireflyBaseResponse<T>> {
    const request = new Request(new URL(`${this.apiBaseUrl}/${path}${queryParams ? `?${FireflyClient.toQueryParams(queryParams)}` : ""}`), {
      method,
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      redirect: "manual",
    });

    this.logging.debug(`Requesting ${request.method} ${request.url}`);

    const response = await fetch(request);

    if (response.ok) {
      this.logging.debug(`Request ${request.method} ${request.url} success, status: ${response.status}`);
      const reponseData = await response.json();
      return new FireflyBaseResponse<T>(reponseData);
    } else {
      const errorData = (await response.json()) as FireflyError;

      // Special handling for duplicate transactions
      if (response.status == 422 && errorData.message.includes("Duplicate")) {
        this.logging.debug(`Request  ${request.method} ${request.url} failed, status: ${response.status}, Reason: Duplicate transaction`);
        throw new FireflyDuplicateTransactionError();
      }

      this.logging.debug(`Request  ${request.method} ${request.url} failed, status: ${response.status}, Reason: ${errorData.message}`);
      throw new Error(errorData.message);
    }
  }

  private static toQueryParams(params: Record<string, unknown> | undefined): string {
    if (!params) {
      return "";
    }

    return Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null) // Remove undefined or null values
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          // Handle array values, e.g., key=value1&key=value2
          return value.map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`).join("&");
        }
        // Handle single values
        return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
      })
      .join("&");
  }
}

export interface FireflyError {
  message: string;
}

export class FireflyDuplicateTransactionError extends Error {
  constructor() {
    super("Duplicate transaction");
  }
}

export class FireflyBaseResponse<T> {
  data: T;
  meta: {
    pagination: {
      total: number;
      count: number;
      per_page: number;
      current_page: number;
      total_pages: number;
    };
  }

  constructor(body: FireflyBaseResponse<T>) {
    this.data = body.data;
    this.meta = body.meta;
  }

  hasNext(): boolean {
    return this.meta.pagination.current_page < this.meta.pagination.total_pages;
  }
}

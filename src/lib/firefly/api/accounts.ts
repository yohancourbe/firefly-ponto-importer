import { Injectable } from "jsr:@dx/inject";
import { FireflyClient } from "../client.ts";

@Injectable()
export class FireflyAccountsApi {
  constructor(private readonly fireflyClient: FireflyClient) {}

  public async list(accountType: FireflyAccountType, startPage = 1, all = true): Promise<FireflyAccount[]> {
    const accounts = [];

    const response = await this.fireflyClient.get<FireflyAccount[]>(`accounts`, { type: accountType, page: startPage });
    accounts.push(...response.data);

    if (all && response.hasNext()) {
      const nextPage = await this.list(accountType, response.meta.pagination.current_page + 1);
      accounts.push(...nextPage);
    }

    return accounts;
  }

  public async get(accountId: string): Promise<FireflyAccount> {
    const response = await this.fireflyClient.get<FireflyAccount>(`accounts/${accountId}`);
    return response.data;
  }

  public async create(account: FireflyNewAccountAttributes): Promise<FireflyAccount> {
    const response = await this.fireflyClient.post<FireflyAccount>(`accounts`, Object(account));
    return response.data;
  }

  public async update(accountId: string, account: Partial<FireflyNewAccountAttributes>): Promise<FireflyAccount> {
    const response = await this.fireflyClient.put<FireflyAccount>(`accounts/${accountId}`, Object(account));
    return response.data;
  }
}

export interface FireflyAccount {
  id: string;
  type: string;
  attributes: FireflyAccountAttributes;
}

export interface FireflyAccountAttributes {
  created_at: Date;
  updated_at: Date;
  active: boolean;
  order: number;
  name: string;
  type: string;
  account_role: string;
  currency_id: string;
  currency_code: string;
  currency_symbol: string;
  currency_decimal_places: number;
  current_balance: number;
  current_balance_date: Date;
  iban: string;
  bic: string;
  account_number: string;
  opening_balance: number;
  current_debt: number;
  opening_balance_date: Date;
  virtual_balance: number;
  include_net_worth: boolean;
  credit_card_type: string;
  monthly_payment_date: Date;
  liability_type: string;
  liability_direction: string;
  interest: string;
  interest_period: string;
  notes: string;
  latitude: number;
  longitude: number;
  zoom_level: number;
}

export interface FireflyNewAccountAttributes {
  name: string;
  type: FireflyAccountType;
  iban?: string;
  bic?: string;
  account_number: string;
  opening_balance?: number;
  opening_balance_date?: Date;
  virtual_balance?: string;
  currency_id?: string;
  currency_code?: string;
  active?: boolean;
  order?: number;
  current_balance?: number;
  include_net_worth?: boolean;
  account_role?: string;
  credit_card_type?: string;
  monthly_payment_date?: Date;
  liability_type?: string;
  liability_direction?: string;
  interest?: string;
  interest_period?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  zoom_level?: number;
}

export enum FireflyAccountType {
  Alll = "all",
  Asset = "asset",
  Expense = "expense",
  Revenue = "revenue",
}

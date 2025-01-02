import { Injectable } from "jsr:@dx/inject";
import { FireflyClient } from "../client.ts";

@Injectable()
export class FireflyTransactionsApi {
  constructor(private client: FireflyClient) {}

  public async getLastTransactionAttributes(accountId: string): Promise<FireflyTransactionAttributes> {
    const response = await this.client.get<FireflyTransaction[]>(`accounts/${accountId}/transactions`, { limit: 1 });
    return response.data[0]?.attributes.transactions[0] || null;
  }

  public async create(transactions: FireflyNewTransactionAttributes[]): Promise<FireflyTransaction> {
    const data = {
      error_if_duplicate_hash: true,
      apply_rules: true,
      fire_webhooks: true,
      transactions,
    };
    const response = await this.client.post<FireflyTransaction>(`transactions`, Object(data));
    return response.data;
  }
}

export interface FireflyTransaction {
  id: string;
  type: string;
  attributes: {
    group_title: string;
    transactions: FireflyTransactionAttributes[];
  };
}

export interface FireflyTransactionAttributes {
  user: string;
  transaction_journal_id: string;
  type: string;
  date: string;
  order: number;
  currency_id: string;
  currency_code: string;
  currency_symbol: string;
  currency_name: string;
  currency_decimal_places: number;
  foreign_currency_id: string;
  foreign_currency_code: string;
  foreign_currency_symbol: string;
  foreign_currency_decimal_places: number;
  amount: string;
  foreign_amount: string;
  description: string;
  source_id: string;
  source_name: string;
  source_iban: string;
  source_type: string;
  destination_id: string;
  destination_name: string;
  destination_iban: string;
  destination_type: string;
  budget_id: string;
  budget_name: string;
  category_id: string;
  category_name: string;
  bill_id: string;
  bill_name: string;
  reconciled: boolean;
  notes: string;
  tags: string | null;
  internal_reference: string;
  external_id: string;
  external_url: string;
  original_source: string;
  recurrence_id: string;
  recurrence_total: number;
  recurrence_count: number;
  bunq_payment_id: string;
  import_hash_v2: string;
  sepa_cc: string;
  sepa_ct_op: string;
  sepa_ct_id: string;
  sepa_db: string;
  sepa_country: string;
  sepa_ep: string;
  sepa_ci: string;
  sepa_batch_id: string;
  interest_date: string;
  book_date: string;
  process_date: string;
  due_date: string;
  payment_date: string;
  invoice_date: string;
  latitude: number;
  longitude: number;
  zoom_level: number;
  has_attachments: boolean;
}

export interface FireflyNewTransactionAttributes {
  type: FireflyTransactionType;
  date: Date;
  amount: number;
  description: string;
  order?: number;
  currency_id?: string;
  currency_code?: string;
  foreign_amount?: string;
  foreign_currency_id?: string;
  foreign_currency_code?: string;
  budget_id?: string;
  category_id?: string;
  category_name?: string;
  source_id?: string;
  source_name?: string;
  destination_id?: string;
  destination_name?: string;
  reconciled?: boolean;
  piggy_bank_id?: number;
  piggy_bank_name?: string;
  bill_id?: string;
  bill_name?: string;
  tags?: string | null;
  notes?: string;
  internal_reference?: string;
  external_id?: string;
  external_url?: string;
  bunq_payment_id?: string;
  sepa_cc?: string;
  sepa_ct_op?: string;
  sepa_ct_id?: string;
  sepa_db?: string;
  sepa_country?: string;
  sepa_ep?: string;
  sepa_ci?: string;
  sepa_batch_id?: string;
  interest_date?: Date;
  book_date?: string;
  process_date?: Date;
  due_date?: string;
  payment_date?: Date;
  invoice_date?: Date;
}

export enum FireflyTransactionType {
  Withdrawal = "withdrawal",
  Deposit = "deposit",
  Transfer = "transfer",
  Reconciliation = "reconciliation",
  OpeningBalance = "opening balance",
}

import { Injectable } from "jsr:@dx/inject";
import { PontoClient } from "../client.ts";
import { LoggingService } from "../../logging/mod.ts";

@Injectable()
export class PontoTransactionsApi {
  constructor(private readonly client: PontoClient, private readonly logging: LoggingService) {
    this.logging.source = "PontoTransactionsApi";
  }

  async list(accountId: string, startTransactionId: string = "", all = true): Promise<PontoTransaction[]> {
    this.logging.info(`Listing transactions for account ${accountId} starting from ${startTransactionId || "the beginning"}`);
    const transactions: PontoTransaction[] = [];

    const response = await this.client.get<PontoTransaction[]>(`accounts/${accountId}/transactions`, startTransactionId ? { after: startTransactionId } : undefined);
    transactions.push(...response.data);

    if (all && response.hasNext()) {
      const nextPage = await this.list(accountId, response.meta.paging.before);
      transactions.push(...nextPage);
    }

    this.logging.info(`Found ${transactions.length} new transactions for account ${accountId} since ${startTransactionId || "the beginning"}`);

    return transactions;
  }
}

export interface PontoTransaction {
  id: string;
  type: string;
  attributes: PontoTransactionAttributes;
  relationships: {
    account: {
      data: {
        id: string;
        type: string;
      };
      links: {
        related: string;
      };
    };
  };
}

export interface PontoTransactionAttributes {
  description: string;
  currency: string;
  digest: string;
  amount: number;
  fee: number;
  additionalInformation: string;
  bankTransactionCode: string;
  cardReference: string;
  cardReferenceType: string;
  counterpartName: string;
  counterpartReference: string;
  createdAt: string;
  creditorId: string;
  endToEndId: string;
  executionDate: string;
  mandateId: string;
  proprietaryBankTransactionCode: string;
  purposeCode: string;
  remittanceInformation: string;
  remittanceInformationType: string;
  updatedAt: string;
  valueDate: string;
  internalReference: string;
}

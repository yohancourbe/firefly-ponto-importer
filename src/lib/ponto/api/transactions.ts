import { Injectable } from "jsr:@dx/inject";
import { PontoClient } from "../client.ts";
import { LoggingService } from "../../logging/mod.ts";

@Injectable()
export class PontoTransactionsApi {
  private readonly watchdogLimit = 1000;

  constructor(private readonly client: PontoClient, private readonly logging: LoggingService) {
    this.logging.source = "PontoTransactionsApi";
  }

  async list(accountId: string, startTransactionId: string = "", watchdog = 0, all = true): Promise<PontoTransaction[]> {

    // This is a simple watchdog to prevent infinite recursive loops to Ponto API
    if (watchdog > this.watchdogLimit) {
      this.logging.error(`Watchdog limit of ${this.watchdogLimit} reached.`);
      this.logging.error(`The process will now wait endlessly to prevent restart causing new loops. Investigate the bug et restart application manually.`);
      await new Promise(() => {});
    }

    this.logging.info(`Listing transactions for account ${accountId} starting from ${startTransactionId || "the beginning"}`);
    const transactions: PontoTransaction[] = [];

    const response = await this.client.get<PontoTransaction[]>(`accounts/${accountId}/transactions`, startTransactionId ? { after: startTransactionId } : undefined);
    transactions.push(...response.data);

    if (all && response.hasNext()) {
      const nextPage = await this.list(accountId, response.meta.paging.before, watchdog++);
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

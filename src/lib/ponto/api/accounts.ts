import { Injectable } from "jsr:@dx/inject";
import { PontoClient } from "../client.ts";

@Injectable()
export class PontoAccountsApi {
  constructor(private readonly client: PontoClient) {}

  public async list(all = true): Promise<PontoAccount[]> {
    const account: PontoAccount[] = [];

    let response;
    do {
      response = await this.client.get<PontoAccount[]>(`accounts`, response ? { after: response.meta?.paging.after } : undefined);

      if (response.data) {
        account.push(...response.data);
      }
    } while (all && response.hasNext());

    return account;
  }
}

export interface PontoAccount {
  id: string;
  type: string;
  attributes: PontoAccountAttributes;
  meta: {
    availability: string;
    latestSynchronization: {
      attributes: {
        createdAt: string;
        customerOnline: boolean;
        errors: string[];
        resourceId: string;
        resourceType: string;
        status: string;
        subtype: string;
        updatedAt: string;
      };
      id: string;
      type: string;
    };
    synchronizedAt: string;
  };
}

export interface PontoAccountAttributes {
  deprecated: boolean;
  description: string;
  reference: string;
  product: string;
  currency: string;
  subtype: string;
  availableBalance: number;
  availableBalanceChangedAt: string;
  availableBalanceReferenceDate: string;
  currentBalance: number;
  currentBalanceChangedAt: string;
  currentBalanceReferenceDate: string;
  holderName: string;
  referenceType: string;
  authorizationExpirationExpectedAt: string;
  authorizedAt: string;
  availableBalanceVariationObservedAt: string;
  currentBalanceVariationObservedAt: string;
  internalReference: string;
}

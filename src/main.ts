import { bootstrap, Bootstrapped } from "jsr:@dx/inject";
import { PontoAccount, PontoAccountsApi, PontoTransactionsApi } from "./lib/ponto/mod.ts";
import {
  FireflyAccountsApi,
  FireflyTransactionsApi,
  FireflyAccountType,
  FireflyAccount,
  FireflyTransactionType,
  FireflyDuplicateTransactionError,
  FireflyNewTransactionAttributes,
} from "./lib/firefly/mod.ts";
import { LoggingService } from "./lib/logging/mod.ts";

type AccountPair = { firefly: FireflyAccount; ponto: PontoAccount };

@Bootstrapped()
export class Main {
  constructor(
    private readonly pontoAccountsApi: PontoAccountsApi,
    private readonly pontoTransactionsApi: PontoTransactionsApi,
    private readonly fireflyAccountsApi: FireflyAccountsApi,
    private readonly fireflyTransactionsApi: FireflyTransactionsApi,
    private readonly logging: LoggingService
  ) {
    this.logging.info("Starting Ponto Data Importer");
  }

  private async syncAccounts(): Promise<AccountPair[]> {
    this.logging.info("Syncing accounts");

    const accounts: AccountPair[] = [];
    const pontoAccounts = await this.pontoAccountsApi.list();
    const fireflyAccounts = await this.fireflyAccountsApi.list(FireflyAccountType.Asset);

    for (const pontoAccount of pontoAccounts) {
      const fireflyAccount = fireflyAccounts.find((fireflyAccount) => fireflyAccount.attributes.account_number === pontoAccount.attributes.reference);

      if (!fireflyAccount) {
        this.logging.info(`New account ${pontoAccount.attributes.reference} found, creating in Firefly`);
        const newFireflyAccount = await this.fireflyAccountsApi.create({
          name: pontoAccount.attributes.description,
          type: FireflyAccountType.Asset,
          iban: pontoAccount.attributes.reference,
          account_number: pontoAccount.attributes.reference,
          account_role: "defaultAsset",
        });
        accounts.push({ firefly: newFireflyAccount, ponto: pontoAccount });
      } else {
        this.logging.info(`Account ${pontoAccount.attributes.reference} already exists in Firefly`);
        accounts.push({ firefly: fireflyAccount, ponto: pontoAccount });
      }
    }

    this.logging.info("Finished syncing accounts");

    return accounts;
  }

  private async syncTransactions(account: AccountPair, allAccounts: AccountPair[]) {
    const lastSyncedTransactionId = account.firefly.attributes.notes?.match(/Last synced transaction id: ([\w-]+)/)?.[1];
    this.logging.info(`Syncing transactions for account ${account.ponto.attributes.reference} from ${lastSyncedTransactionId || "beginning"}`);

    const pontoTransactions = await this.pontoTransactionsApi.list(account.ponto.id, lastSyncedTransactionId);

    // Ponto transactions are sorted in ascending order (newest first), but we want to process them in descending order so earliest is always the last one and thus first one for next sync
    for (const pontoTransaction of pontoTransactions.sort().reverse()) {
      if (pontoTransaction.attributes.amount === 0) {
        this.logging.info(`Transaction ${pontoTransaction.id} has amount 0, skipping`);
        continue;
      }

      const newTransaction: Partial<FireflyNewTransactionAttributes> = {
        amount: Math.abs(pontoTransaction.attributes.amount),
        date: new Date(pontoTransaction.attributes.valueDate),
        description: pontoTransaction.attributes.description,
        external_id: pontoTransaction.id,
        process_date: new Date(pontoTransaction.attributes.executionDate),
      };

      const knownDestinationAccount = allAccounts.find((account) => account.firefly.attributes.account_number === pontoTransaction.attributes.counterpartReference);
      if (knownDestinationAccount) {
        this.logging.info(`Found known destination account ${knownDestinationAccount.ponto.attributes.reference}, creating transfer transaction`);
        newTransaction.destination_id = knownDestinationAccount.firefly.id;
        newTransaction.destination_name = undefined;
        newTransaction.source_id = account.firefly.id;
        newTransaction.source_name = undefined;
        newTransaction.type = FireflyTransactionType.Transfer;
      } else if (pontoTransaction.attributes.amount > 0) {
        this.logging.info(`Creating deposit transaction`);
        newTransaction.type = FireflyTransactionType.Deposit;
        newTransaction.destination_id = account.firefly.id;
        newTransaction.source_name = `${pontoTransaction.attributes.counterpartName} (${pontoTransaction.attributes.counterpartReference || "unknown reference"})`;
      } else {
        this.logging.info(`Creating withdrawal transaction`);
        newTransaction.type = FireflyTransactionType.Withdrawal;
        newTransaction.source_id = account.firefly.id;
        newTransaction.destination_name = `${pontoTransaction.attributes.counterpartName} (${pontoTransaction.attributes.counterpartReference || "unknown reference"})`;
      }

      try {
        await this.fireflyTransactionsApi.create([newTransaction as FireflyNewTransactionAttributes]);
        await this.fireflyAccountsApi.update(account.firefly.id, { notes: `Last synced transaction id: ${pontoTransaction.id}` });
      } catch (error) {
        if (error instanceof FireflyDuplicateTransactionError) {
          this.logging.info(`Transaction ${pontoTransaction.id} already exists in Firefly, skipping`);
        } else {
          this.logging.error(`Error syncing transaction ${pontoTransaction.id}`);
        }
      }
    }

    // If it's the first sync, update the account opening balance to the current balance minus the sum of all transactions (opening balance must be set before the first transaction)
    if (!lastSyncedTransactionId) {
      const currentBalance = account.ponto.attributes.currentBalance;
      const transactionSum = pontoTransactions.reduce((sum, transaction) => sum + transaction.attributes.amount, 0);
      const openingBalance = currentBalance - transactionSum;

      this.logging.info(`Setting opening balance for account ${account.ponto.attributes.reference} to ${openingBalance}`);

      const oldestTransactionDate = pontoTransactions.reduce((oldest, transaction) => {
        const transactionDate = new Date(transaction.attributes.valueDate);
        return transactionDate < oldest ? transactionDate : oldest;
      }, new Date());
      const openingBalanceDate = new Date(oldestTransactionDate);
      openingBalanceDate.setDate(openingBalanceDate.getDate() - 1); // Set the opening balance date to the day before the oldest transaction to avoid conflicts
      await this.fireflyAccountsApi.update(account.firefly.id, { opening_balance: openingBalance, opening_balance_date: openingBalanceDate });
    }

    this.logging.info(`Finished syncing transactions for account ${account.ponto.attributes.reference}`);
  }

  public async run() {
    this.logging.info("Starting sync");
    const accounts = await this.syncAccounts();

    this.logging.info("Syncing transactions");
    for (const account of accounts) {
      await this.syncTransactions(account, accounts);
    }
  }
}

const hours_between_syncs = Number(Deno.env.get("HOURS_BETWEEN_SYNCS")) || 6;
const main: Main = bootstrap(Main);

while (true) {
  main.run();
  await new Promise((resolve) => setTimeout(resolve, hours_between_syncs * 3600 * 1000));
}

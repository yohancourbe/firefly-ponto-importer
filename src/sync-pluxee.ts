import { Injectable } from "jsr:@dx/inject";
import {
  FireflyAccountsApi,
  FireflyAccountType,
  FireflyDuplicateTransactionError,
  FireflyNewTransactionAttributes,
  FireflyTransactionsApi,
  FireflyTransactionType,
} from "./lib/firefly/mod.ts";
import { LoggingService } from "./lib/logging/mod.ts";
import { PluxeeAccountType, PluxeeClient } from "./lib/pluxee/mod.ts";

@Injectable()
export class SyncPluxee {
  constructor(
    private readonly fireflyAccountsApi: FireflyAccountsApi,
    private readonly fireflyTransactionsApi: FireflyTransactionsApi,
    private readonly logging: LoggingService,
    private readonly pluxeeClient: PluxeeClient
  ) {
    this.logging.source = "SyncPluxee";
    this.logging.info("Starting Pluxee Data Importer");
  }

  public async run() {
    this.logging.info("Starting sync");

    await this.pluxeeClient.login();

    const fireflyAccounts = await this.fireflyAccountsApi.list(FireflyAccountType.Asset);

    for (const account of Object.values(PluxeeAccountType)) {
      const pluxeeAccountName = `pluxee:${this.pluxeeClient.username}:${account}`;
      const balance = await this.pluxeeClient.getBalance(account);

      let fireflyAccount = fireflyAccounts.find(
        (fireflyAccount) => fireflyAccount.attributes.account_number === pluxeeAccountName
      );

      if (!fireflyAccount) {
        this.logging.info(`New account ${pluxeeAccountName}, creating in Firefly`);
        fireflyAccount = await this.fireflyAccountsApi.create({
          name: `pluxee:${account}`,
          type: FireflyAccountType.Asset,
          account_number: pluxeeAccountName,
          account_role: "defaultAsset",
        });
      }

      const transactions = await this.pluxeeClient.getTransactions(account);

      const lastSyncedTransactionId = fireflyAccount.attributes.notes?.match(/Last synced transaction id: ([\w-]+)/)?.[1];

      if (lastSyncedTransactionId) {
        transactions.splice(transactions.findIndex((transaction) => transaction.id === lastSyncedTransactionId));
      }

      for (const transaction of transactions) {
        const newTransaction: Partial<FireflyNewTransactionAttributes> = {
          amount: Math.abs(transaction.amount),
          date: new Date(transaction.date),
          description: transaction.details,
          external_id: transaction.id,
        };

        if (transaction.amount > 0) {
          this.logging.info(`Creating deposit transaction`);
          newTransaction.type = FireflyTransactionType.Deposit;
          newTransaction.destination_id = fireflyAccount.id;
          newTransaction.source_name = transaction.counterpartName;
        } else {
          this.logging.info(`Creating withdrawal transaction`);
          newTransaction.type = FireflyTransactionType.Withdrawal;
          newTransaction.source_id = fireflyAccount.id;
          newTransaction.destination_name = transaction.counterpartName;
        }

        try {
          await this.fireflyTransactionsApi.create([newTransaction as FireflyNewTransactionAttributes]);
          await this.fireflyAccountsApi.update(fireflyAccount.id, {
            notes: `Last synced transaction id: ${transaction.id}`,
          });
        } catch (error) {
          if (error instanceof FireflyDuplicateTransactionError) {
            this.logging.info(`Transaction ${transaction.id} already exists in Firefly, skipping`);
          } else {
            this.logging.error(`Error syncing transaction ${transaction.id}`);
          }
        }
      }

      // If it's the first sync, update the account opening balance to the current balance minus the sum of all transactions (opening balance must be set before the first transaction)
      if (!lastSyncedTransactionId) {
        const currentBalance = await this.pluxeeClient.getBalance(account);
        const transactionSum = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
        const openingBalance = currentBalance - transactionSum;

        this.logging.info(`Setting opening balance for account ${pluxeeAccountName} to ${openingBalance}`);

        const oldestTransactionDate = transactions.reduce((oldest, transaction) => {
          const transactionDate = new Date(transaction.date);
          return transactionDate < oldest ? transactionDate : oldest;
        }, new Date());
        const openingBalanceDate = new Date(oldestTransactionDate);
        openingBalanceDate.setDate(openingBalanceDate.getDate() - 1); // Set the opening balance date to the day before the oldest transaction to avoid conflicts
        await this.fireflyAccountsApi.update(fireflyAccount.id, {
          opening_balance: openingBalance,
          opening_balance_date: openingBalanceDate,
        });
      }

      this.logging.info(`Balance for ${account} account is ${balance}`);
    }

    this.logging.info("Finished sync");
  }
}

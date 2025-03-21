#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#define MAX_NAME 20
#define MAX_ACCOUNTS 100

typedef struct {
    char name[MAX_NAME + 1];
    int accountNumber;
    double balance;
} Account;

const char* FILE_NAME = "bank_accounts.txt";
const char* META_FILE = "account_meta.txt";

// Function to get the next unique account number
int getNextAccountNumber() {
    FILE* metaIn = fopen(META_FILE, "r");
    int lastAccNum = 1000; // Start from 1001
    if (metaIn) {
        fscanf(metaIn, "%d", &lastAccNum);
        fclose(metaIn);
    }
    lastAccNum++;

    FILE* metaOut = fopen(META_FILE, "w");
    fprintf(metaOut, "%d", lastAccNum);
    fclose(metaOut);

    return lastAccNum;
}

// Function to create a new account
void createAccount(char* name, double amount) {
    Account acc;
    strncpy(acc.name, name, MAX_NAME);
    acc.name[MAX_NAME] = '\0'; // Ensure null termination
    acc.accountNumber = getNextAccountNumber();
    acc.balance = amount;

    FILE* file = fopen(FILE_NAME, "a");
    if (file) {
        fprintf(file, "%-20s%-15d%.2f\n", acc.name, acc.accountNumber, acc.balance);
        fclose(file);
        printf("<html><body>Account created! Number: %d</body></html>", acc.accountNumber);
    } else {
        printf("<html><body>Error opening file!</body></html>");
    }
}

// Function to view accounts
void viewAccounts() {
    printf("Content-Type: text/html\n\n");
    printf("<html><body><h2>Bank Accounts</h2>");
    printf("<table border='1'><tr><th>Name</th><th>Account No</th><th>Balance</th></tr>");

    FILE* file = fopen(FILE_NAME, "r");
    if (!file) {
        printf("<tr><td colspan='3'>No accounts found!</td></tr>");
    } else {
        char line[100];
        while (fgets(line, sizeof(line), file)) {
            char name[MAX_NAME + 1];
            int accountNumber;
            double balance;
            sscanf(line, "%20s%15d%lf", name, &accountNumber, &balance);
            printf("<tr><td>%s</td><td>%d</td><td>%.2f</td></tr>", name, accountNumber, balance);
        }
        fclose(file);
    }
    printf("</table></body></html>");
}

// Function to read all accounts
int readAllAccounts(Account* accounts) {
    FILE* file = fopen(FILE_NAME, "r");
    if (!file) return 0;

    int count = 0;
    char line[100];
    while (fgets(line, sizeof(line), file) && count < MAX_ACCOUNTS) {
        sscanf(line, "%20s%15d%lf", accounts[count].name, 
               &accounts[count].accountNumber, &accounts[count].balance);
        count++;
    }
    fclose(file);
    return count;
}

// Function to update account file
void updateAccountFile(Account* accounts, int count) {
    FILE* file = fopen(FILE_NAME, "w");
    for (int i = 0; i < count; i++) {
        fprintf(file, "%-20s%-15d%.2f\n", accounts[i].name, 
                accounts[i].accountNumber, accounts[i].balance);
    }
    fclose(file);
}

// Function to deposit money
void depositMoney(int accNum, double amount) {
    Account accounts[MAX_ACCOUNTS];
    int count = readAllAccounts(accounts);
    int found = 0;

    for (int i = 0; i < count; i++) {
        if (accounts[i].accountNumber == accNum) {
            accounts[i].balance += amount;
            found = 1;
            break;
        }
    }

    if (!found) {
        printf("<html><body>Account not found!</body></html>");
        return;
    }

    updateAccountFile(accounts, count);
    printf("<html><body>Deposit processed</body></html>");
}

// Function to withdraw money
void withdrawMoney(int accNum, double amount) {
    Account accounts[MAX_ACCOUNTS];
    int count = readAllAccounts(accounts);
    int found = 0;

    for (int i = 0; i < count; i++) {
        if (accounts[i].accountNumber == accNum) {
            if (accounts[i].balance >= amount) {
                accounts[i].balance -= amount;
                found = 1;
            } else {
                printf("<html><body>Insufficient funds!</body></html>");
                return;
            }
            break;
        }
    }

    if (!found) {
        printf("<html><body>Account not found!</body></html>");
        return;
    }

    updateAccountFile(accounts, count);
    printf("<html><body>Withdrawal processed</body></html>");
}

// Function to remove an account
void removeAccount(int accNum) {
    Account accounts[MAX_ACCOUNTS];
    int count = readAllAccounts(accounts);
    int found = 0;

    for (int i = 0; i < count; i++) {
        if (accounts[i].accountNumber == accNum) {
            for (int j = i; j < count - 1; j++) {
                accounts[j] = accounts[j + 1];
            }
            found = 1;
            count--;
            break;
        }
    }

    if (!found) {
        printf("<html><body>Account not found!</body></html>");
        return;
    }

    updateAccountFile(accounts, count);
    printf("<html><body>Account removed</body></html>");
}

// Main function for CGI
int main() {
    char* query = getenv("QUERY_STRING");
    char action[20] = {0};
    char name[MAX_NAME + 1] = {0};
    int accNum = 0;
    double amount = 0;

    printf("Content-Type: text/html\n\n");

    if (query) {
        // Parse query string (e.g., "action=create&name=John&amount=100")
        sscanf(query, "action=%19[^&]&name=%20[^&]&accNum=%d&amount=%lf", 
               action, name, &accNum, &amount);

        if (strcmp(action, "create") == 0) {
            createAccount(name, amount);
        }
        else if (strcmp(action, "view") == 0) {
            viewAccounts();
        }
        else if (strcmp(action, "deposit") == 0) {
            depositMoney(accNum, amount);
        }
        else if (strcmp(action, "withdraw") == 0) {
            withdrawMoney(accNum, amount);
        }
        else if (strcmp(action, "remove") == 0) {
            removeAccount(accNum);
        }
        else {
            printf("<html><body>Invalid action</body></html>");
        }
    } else {
        printf("<html><body>No action specified</body></html>");
    }

    return 0;
}
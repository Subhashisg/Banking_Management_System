const http = require('http');
const url = require('url');
const fs = require('fs').promises;
const path = require('path');

const FILE_NAME = 'bank_accounts.txt';
const META_FILE = 'account_meta.txt';
const TRANSACTION_FILE = 'transactions.txt'; // New file for transactions

async function getNextAccountNumber() {
    try {
        const data = await fs.readFile(META_FILE, 'utf8');
        let lastAccNum = parseInt(data) || 1000;
        lastAccNum++;
        await fs.writeFile(META_FILE, lastAccNum.toString());
        return lastAccNum;
    } catch (error) {
        await fs.writeFile(META_FILE, '1000');
        return 1001;
    }
}

async function logTransaction(accNum, type, amount, balanceAfter) {
    try {
        const timestamp = new Date().toISOString();
        const line = `${accNum.toString().padEnd(15)}${type.padEnd(15)}${parseFloat(amount).toFixed(2).padEnd(15)}${parseFloat(balanceAfter).toFixed(2).padEnd(15)}${timestamp}\n`;
        await fs.appendFile(TRANSACTION_FILE, line);
    } catch (error) {
        console.error('Error logging transaction:', error);
    }
}

async function viewTransactions() {
    try {
        const exists = await fs.access(TRANSACTION_FILE).then(() => true).catch(() => false);
        if (!exists) {
            return `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 10px; color: #e74c3c;">
                        No transactions found!
                    </td>
                </tr>`;
        }
        const data = await fs.readFile(TRANSACTION_FILE, 'utf8');
        const lines = data.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
            return `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 10px; color: #e74c3c;">
                        No transactions found!
                    </td>
                </tr>`;
        }
        let html = '';
        for (const line of lines) {
            const accNum = parseInt(line.substr(0, 15));
            const type = line.substr(15, 15).trim();
            const amount = parseFloat(line.substr(30, 15));
            const balanceAfter = parseFloat(line.substr(45, 15));
            const timestamp = line.substr(60).trim();
            if (!isNaN(accNum) && type && !isNaN(amount) && !isNaN(balanceAfter) && timestamp) {
                html += `
                    <tr class="table-row">
                        <td>${accNum}</td>
                        <td>${type}</td>
                        <td>$${amount.toFixed(2)}</td>
                        <td>$${balanceAfter.toFixed(2)}</td>
                        <td>${timestamp}</td>
                    </tr>`;
            }
        }
        return html || `
            <tr>
                <td colspan="5" style="text-align: center; padding: 10px; color: #e74c3c;">
                    No valid transactions found!
                </td>
            </tr>`;
    } catch (error) {
        return `
            <tr>
                <td colspan="5" style="text-align: center; padding: 10px; color: #e74c3c;">
                    Error reading transactions: ${error.message}
                </td>
            </tr>`;
    }
}

async function createAccount(name, amount) {
    try {
        const accNum = await getNextAccountNumber();
        const balance = parseFloat(amount).toFixed(2);
        const line = `${name.padEnd(20)}${accNum.toString().padEnd(15)}${balance}\n`;
        await fs.appendFile(FILE_NAME, line);
        await logTransaction(accNum, 'Create', amount, balance); // Log transaction
        return `Account created! Number: ${accNum}`;
    } catch (error) {
        return `Error creating account: ${error.message}`;
    }
}

async function viewAccounts() {
    try {
        const exists = await fs.access(FILE_NAME).then(() => true).catch(() => false);
        if (!exists) {
            return `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 10px; color: #e74c3c;">
                        No accounts found!
                    </td>
                </tr>`;
        }
        const data = await fs.readFile(FILE_NAME, 'utf8');
        const lines = data.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
            return `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 10px; color: #e74c3c;">
                        No accounts found!
                    </td>
                </tr>`;
        }
        let html = '';
        for (const line of lines) {
            const name = line.substr(0, 20).trim();
            const accNum = parseInt(line.substr(20, 15));
            const balance = parseFloat(line.substr(35));
            if (name && !isNaN(accNum) && !isNaN(balance)) {
                html += `
                    <tr class="table-row">
                        <td>${name}</td>
                        <td>${accNum}</td>
                        <td>$${balance.toFixed(2)}</td>
                    </tr>`;
            }
        }
        return html || `
            <tr>
                <td colspan="3" style="text-align: center; padding: 10px; color: #e74c3c;">
                    No valid accounts found!
                </td>
            </tr>`;
    } catch (error) {
        return `
            <tr>
                <td colspan="3" style="text-align: center; padding: 10px; color: #e74c3c;">
                    Error reading accounts: ${error.message}
                </td>
            </tr>`;
    }
}

async function readAllAccounts() {
    try {
        const exists = await fs.access(FILE_NAME).then(() => true).catch(() => false);
        if (!exists) return [];
        const data = await fs.readFile(FILE_NAME, 'utf8');
        const lines = data.split('\n').filter(line => line.trim());
        return lines.map(line => ({
            name: line.substr(0, 20).trim(),
            accountNumber: parseInt(line.substr(20, 15)),
            balance: parseFloat(line.substr(35))
        })).filter(acc => acc.name && !isNaN(acc.accountNumber) && !isNaN(acc.balance));
    } catch (error) {
        console.error('Error reading accounts:', error);
        return [];
    }
}

async function updateAccountFile(accounts) {
    try {
        const lines = accounts.map(acc => 
            `${acc.name.padEnd(20)}${acc.accountNumber.toString().padEnd(15)}${acc.balance.toFixed(2)}`
        ).join('\n');
        await fs.writeFile(FILE_NAME, lines + (lines ? '\n' : ''));
    } catch (error) {
        throw new Error(`Error updating accounts: ${error.message}`);
    }
}

async function depositMoney(accNum, amount) {
    const accounts = await readAllAccounts();
    const account = accounts.find(acc => acc.accountNumber === accNum);
    if (!account) return 'Account not found!';
    const newBalance = account.balance + parseFloat(amount);
    account.balance = parseFloat(newBalance.toFixed(2));
    await updateAccountFile(accounts);
    await logTransaction(accNum, 'Deposit', amount, newBalance); // Log transaction
    return 'Deposit processed';
}

async function withdrawMoney(accNum, amount) {
    const accounts = await readAllAccounts();
    const account = accounts.find(acc => acc.accountNumber === accNum);
    if (!account) return 'Account not found!';
    const newBalance = account.balance - parseFloat(amount);
    if (newBalance < 0) return 'Insufficient funds!';
    account.balance = parseFloat(newBalance.toFixed(2));
    await updateAccountFile(accounts);
    await logTransaction(accNum, 'Withdraw', amount, newBalance); // Log transaction
    return 'Withdrawal processed';
}

async function removeAccount(accNum) {
    const accounts = await readAllAccounts();
    const index = accounts.findIndex(acc => acc.accountNumber === accNum);
    if (index === -1) return 'Account not found!';
    const balanceBefore = accounts[index].balance;
    accounts.splice(index, 1);
    await updateAccountFile(accounts);
    await logTransaction(accNum, 'Remove', balanceBefore, 0); // Log transaction
    return 'Account removed';
}

const server = http.createServer(async (req, res) => {
    const { query } = url.parse(req.url, true);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (!query.action) {
        res.end('<html><body>No action specified</body></html>');
        return;
    }

    let response = '';
    try {
        if (query.action === 'create') {
            response = await createAccount(query.name, query.amount);
        } else if (query.action === 'view') {
            response = `
                <html>
                <head>
                    <title>View All Accounts</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Arial, sans-serif;
                            margin: 0;
                            padding: 20px;
                            background: url('https://images.unsplash.com/photo-1561414927-6d86591d0c4f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80') no-repeat center center fixed;
                            background-size: cover;
                            position: relative;
                        }
                        body::before {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            background: linear-gradient(135deg, rgba(245, 247, 250, 0.8) 0%, rgba(195, 207, 226, 0.8) 100%);
                            z-index: 1;
                        }
                        .container {
                            position: relative;
                            z-index: 2;
                            max-width: 900px;
                            margin: 0 auto;
                            padding: 20px;
                            background: rgba(255, 255, 255, 0.95);
                            border-radius: 10px;
                            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
                        }
                        h2 {
                            color: #2c3e50;
                            text-align: center;
                            margin-bottom: 20px;
                            font-size: 2.5em;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            background: #fff;
                            border-radius: 8px;
                            overflow: hidden;
                        }
                        th, td {
                            padding: 15px 20px;
                            text-align: left;
                            border-bottom: 1px solid #e0e0e0;
                        }
                        th {
                            background: #3498db;
                            color: #fff;
                            font-weight: 600;
                            text-transform: uppercase;
                            font-size: 1.1em;
                        }
                        td {
                            color: #34495e;
                            font-size: 1em;
                        }
                        .table-row:hover {
                            background: #f1f8ff;
                            transition: background 0.3s ease;
                        }
                        tr:last-child td {
                            border-bottom: none;
                        }
                        td:nth-child(3) {
                            font-weight: 500;
                            color: #27ae60;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>Bank Accounts</h2>
                        <table>
                            <tr>
                                <th>Name</th>
                                <th>Account No</th>
                                <th>Balance</th>
                            </tr>
                            ${await viewAccounts()}
                        </table>
                    </div>
                </body>
                </html>`;
        } else if (query.action === 'transactions') { // New endpoint for transactions
            response = `
                <html>
                <head>
                    <title>Transaction History</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Arial, sans-serif;
                            margin: 0;
                            padding: 20px;
                            background: url('https://images.unsplash.com/photo-1561414927-6d86591d0c4f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80') no-repeat center center fixed;
                            background-size: cover;
                            position: relative;
                        }
                        body::before {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            background: linear-gradient(135deg, rgba(245, 247, 250, 0.8) 0%, rgba(195, 207, 226, 0.8) 100%);
                            z-index: 1;
                        }
                        .container {
                            position: relative;
                            z-index: 2;
                            max-width: 1200px;
                            margin: 0 auto;
                            padding: 20px;
                            background: rgba(255, 255, 255, 0.95);
                            border-radius: 10px;
                            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
                        }
                        h2 {
                            color: #2c3e50;
                            text-align: center;
                            margin-bottom: 20px;
                            font-size: 2.5em;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            background: #fff;
                            border-radius: 8px;
                            overflow: hidden;
                        }
                        th, td {
                            padding: 15px 20px;
                            text-align: left;
                            border-bottom: 1px solid #e0e0e0;
                        }
                        th {
                            background: #e67e22;
                            color: #fff;
                            font-weight: 600;
                            text-transform: uppercase;
                            font-size: 1.1em;
                        }
                        td {
                            color: #34495e;
                            font-size: 1em;
                        }
                        .table-row:hover {
                            background: #fff5e6;
                            transition: background 0.3s ease;
                        }
                        tr:last-child td {
                            border-bottom: none;
                        }
                        td:nth-child(3), td:nth-child(4) {
                            font-weight: 500;
                            color: #27ae60;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>Transaction History</h2>
                        <table>
                            <tr>
                                <th>Account No</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Balance After</th>
                                <th>Timestamp</th>
                            </tr>
                            ${await viewTransactions()}
                        </table>
                    </div>
                </body>
                </html>`;
        } else if (query.action === 'deposit') {
            response = await depositMoney(parseInt(query.accNum), parseFloat(query.amount));
        } else if (query.action === 'withdraw') {
            response = await withdrawMoney(parseInt(query.accNum), parseFloat(query.amount));
        } else if (query.action === 'remove') {
            response = await removeAccount(parseInt(query.accNum));
        }
    } catch (error) {
        response = `Error: ${error.message}`;
    }

    res.end(`<html><body>${response}</body></html>`);
});

server.listen(3000, () => console.log('Server running on port 3000'));
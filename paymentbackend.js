const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

// 1. Initialize Database with performance and safety optimizations
const db = new Database('payments.db', { verbose: console.log });
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000'); // Wait up to 5 seconds if locked

// 2. Prepare statements outside the critical path for speed
const getAccountStmt = db.prepare('SELECT * FROM accounts WHERE account_id = ?');
const updateBalanceStmt = db.prepare('UPDATE accounts SET balance_cents = balance_cents + ?, updated_at = ? WHERE account_id = ?');
const createTransactionStmt = db.prepare(`
    INSERT INTO transactions (transaction_id, source_account_id, destination_account_id, amount_cents, currency, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`);

/**
 * Executes a secure peer-to-peer transfer inside an ACID transaction.
 * @param {string} fromAccountId 
 * @param {string} toAccountId 
 * @param {number} amountCents - Integer representing the lowest currency denomination (e.g., 1000 for $10.00)
 * @param {string} currency - e.g., 'USD'
 */
const transferFunds = db.transaction((fromAccountId, toAccountId, amountCents, currency) => {
    const now = Date.now();
    const txId = uuidv4();

    // Validate positive transfer amount
    if (amountCents <= 0) {
        throw new Error("Transfer amount must be greater than zero.");
    }

    // Fetch accounts to check balances and existence
    const sourceAccount = getAccountStmt.get(fromAccountId);
    const destAccount = getAccountStmt.get(toAccountId);

    if (!sourceAccount) throw new Error(`Source account ${fromAccountId} not found.`);
    if (!destAccount) throw new Error(`Destination account ${toAccountId} not found.`);
    if (sourceAccount.currency !== currency || destAccount.currency !== currency) {
        throw new Error("Currency mismatch between accounts.");
    }

    // Check for sufficient funds
    if (sourceAccount.balance_cents < amountCents) {
        throw new Error(`Insufficient funds in account ${fromAccountId}.`);
    }

    // Deduct from source
    updateBalanceStmt.run(-amountCents, now, fromAccountId);

    // Credit to destination
    updateBalanceStmt.run(amountCents, now, toAccountId);

    // Record the transaction ledger entry
    createTransactionStmt.run(txId, fromAccountId, toAccountId, amountCents, currency, 'COMPLETED', now);

    return {
        success: true,
        transactionId: txId,
        message: `Successfully transferred ${(amountCents / 100).toFixed(2)} ${currency}`
    };
});

// ==========================================
// TEST IMPLEMENTATION / USAGE DEMO
// ==========================================

function setupDemoData() {
    db.exec(`
        INSERT OR IGNORE INTO accounts (account_id, balance_cents, currency, updated_at) 
        VALUES 
        ('acc_alice', 5000, 'USD', ${Date.now()}),  -- $50.00
        ('acc_bob', 1000, 'USD', ${Date.now()});    -- $10.00
    `);
}

try {
    setupDemoData();
    console.log("Initial Accounts:", db.prepare('SELECT * FROM accounts').all());

    // Execute safe transaction ($15.00 from Alice to Bob)
    const receipt = transferFunds('acc_alice', 'acc_bob', 1500, 'USD');
    console.log("Receipt:", receipt);

    console.log("Updated Accounts:", db.prepare('SELECT * FROM accounts').all());
    console.log("Ledger Entries:", db.prepare('SELECT * FROM transactions').all());

    // Trigger an intentional failure (Alice trying to spend more than she has)
    console.log("\nAttempting fraudulent/overdraft transaction...");
    transferFunds('acc_alice', 'acc_bob', 999999, 'USD');

} catch (error) {
    // Because we used db.transaction(), if an error occurs anywhere, 
    // the entire transfer is rolled back automatically. No money is lost.
    console.error("Transaction Rejected & Rolled Back Safely:", error.message);
    console.log("Post-Failure Accounts (Unchanged):", db.prepare('SELECT * FROM accounts').all());
}
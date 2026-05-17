-- Enable Write-Ahead Logging for concurrency
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS accounts (
    account_id TEXT PRIMARY KEY,
    balance_cents INTEGER NOT NULL,
    currency TEXT NOT NULL,
    updated_at INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id TEXT PRIMARY KEY,
    source_account_id TEXT NOT NULL,
    destination_account_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL, -- 'PENDING', 'COMPLETED', 'FAILED'
    created_at INTEGER NOT NULL,
    FOREIGN KEY(source_account_id) REFERENCES accounts(account_id),
    FOREIGN KEY(destination_account_id) REFERENCES accounts(account_id)
) STRICT;
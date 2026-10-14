CREATE TABLE IF NOT EXISTS sales_representatives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  gst_no TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  sales_representative_id INTEGER REFERENCES sales_representatives(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL UNIQUE REFERENCES customers(id),
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO customers (company, gst_no, email, phone)
VALUES ('W-COM Test Customer', '24ABCDE7056F1Z2', 'wcom.test.customer.1791960612667@example.com', '+919876543210');

INSERT OR IGNORE INTO customer_accounts (customer_id, email, password_hash)
SELECT id,
       'wcom.test.customer.1791960612667@example.com',
       'scrypt:0123456789abcdef0123456789abcdef:7f39abe67c67679076e7ca7152515985055c21459e5b1038496b7e072ae6ae55ddf1691dd0e901e679a4d68c1259a7c4da1c3effd41e334862bf9e5f879ab123'
FROM customers
WHERE gst_no = '24ABCDE7056F1Z2';

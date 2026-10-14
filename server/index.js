import express from 'express';
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const app = express();
const port = Number(process.env.PORT) || 3001;
const sessionCookie = 'wcom_session';
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const scrypt = promisify(scryptCallback);
const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.WCOM_DB_PATH
  ? path.resolve(process.env.WCOM_DB_PATH)
  : path.join(serverDirectory, 'wcom.sqlite');
const require = createRequire(import.meta.url);
const sqlJsDirectory = path.dirname(require.resolve('sql.js'));
const SQL = await initSqlJs({ locateFile: (file) => path.join(sqlJsDirectory, file) });
mkdirSync(serverDirectory, { recursive: true });
const database = existsSync(databasePath)
  ? new SQL.Database(new Uint8Array(readFileSync(databasePath)))
  : new SQL.Database();

app.use(express.json({ limit: '32kb' }));

database.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    part_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    accent TEXT NOT NULL DEFAULT 'blue',
    icon TEXT NOT NULL DEFAULT 'gear'
  );

  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT '',
    gst_no TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    payment_days INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    items TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

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

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('customer', 'admin')),
    customer_account_id INTEGER REFERENCES customer_accounts(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const persistDatabase = () => {
  writeFileSync(databasePath, Buffer.from(database.export()));
};

const queryAll = (sql, parameters = []) => {
  const statement = database.prepare(sql);
  statement.bind(parameters);
  const rows = [];
  while (statement.step()) rows.push(statement.getAsObject());
  statement.free();
  return rows;
};

const execute = (sql, parameters = []) => {
  database.run(sql, parameters);
};

const getCookie = (request, name) => {
  const cookies = request.headers.cookie || '';
  const prefix = `${name}=`;
  const cookie = cookies.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length) : '';
};

const createSession = (request, response, role, customerAccountId = null) => {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + sessionLifetimeMs).toISOString();
  execute('INSERT INTO sessions (token_hash, role, customer_account_id, expires_at) VALUES (?, ?, ?, ?)',
    [tokenHash, role, customerAccountId, expiresAt]);
  execute('DELETE FROM sessions WHERE expires_at <= ?', [new Date().toISOString()]);
  persistDatabase();
  response.cookie(sessionCookie, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: sessionLifetimeMs,
    path: '/'
  });
};

const authenticate = (request, _response, next) => {
  const token = getCookie(request, sessionCookie);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return next();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const [session] = queryAll(`
    SELECT s.role, s.customer_account_id AS customerAccountId,
           a.customer_id AS customerId, a.email, c.company, c.gst_no AS gstNo,
           c.phone, c.sales_representative_id AS salesRepresentativeId,
           sr.name AS salesRepresentative
    FROM sessions s
    LEFT JOIN customer_accounts a ON a.id = s.customer_account_id
    LEFT JOIN customers c ON c.id = a.customer_id
    LEFT JOIN sales_representatives sr ON sr.id = c.sales_representative_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `, [tokenHash, new Date().toISOString()]);
  if (session) request.user = session;
  next();
};

const requireCustomer = (request, response, next) => {
  if (!request.user || request.user.role !== 'customer' || !request.user.customerId) {
    return response.status(401).json({ error: 'Please sign in to access your customer account.' });
  }
  next();
};

const requireAdmin = (request, response, next) => {
  if (!request.user || request.user.role !== 'admin') {
    return response.status(401).json({ error: 'Administrator sign-in is required.' });
  }
  next();
};

const validateCustomerProfile = ({ company, gstNo, email, phone }) => {
  if (typeof company !== 'string' || company.trim().length < 2 || company.trim().length > 120) {
    return 'Enter a company name between 2 and 120 characters.';
  }
  if (typeof gstNo !== 'string' || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstNo.trim().toUpperCase())) {
    return 'Enter a valid 15-character GST number.';
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254) {
    return 'Enter a valid email address.';
  }
  if (typeof phone !== 'string' || !/^\+?[0-9 ()-]{10,20}$/.test(phone.trim()) || phone.replace(/\D/g, '').length < 10) {
    return 'Enter a valid phone number with at least 10 digits.';
  }
  return null;
};

const hashPassword = async (password) => {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
};

const verifyPassword = async (password, storedHash) => {
  const [algorithm, saltHex, keyHex] = storedHash.split(':');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(saltHex) || !/^[a-f0-9]{128}$/.test(keyHex)) return false;
  const expectedKey = Buffer.from(keyHex, 'hex');
  const candidateKey = await scrypt(password, Buffer.from(saltHex, 'hex'), expectedKey.length);
  return timingSafeEqual(expectedKey, candidateKey);
};

app.use(authenticate);

const quotationColumns = new Set(queryAll('PRAGMA table_info(quotations)').map((column) => column.name));
for (const [column, definition] of [
  ['gst_no', "TEXT NOT NULL DEFAULT ''"],
  ['phone', "TEXT NOT NULL DEFAULT ''"],
  ['payment_days', 'INTEGER NOT NULL DEFAULT 0']
]) {
  if (!quotationColumns.has(column)) {
    database.exec(`ALTER TABLE quotations ADD COLUMN ${column} ${definition}`);
  }
}
const customerQuotationColumns = new Set(queryAll('PRAGMA table_info(quotations)').map((column) => column.name));
if (!customerQuotationColumns.has('customer_id')) {
  database.exec('ALTER TABLE quotations ADD COLUMN customer_id INTEGER REFERENCES customers(id)');
}
database.exec('CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id)');
persistDatabase();

const seedProducts = [
  ['WA-ENG-0421', 'Hydraulic pump assembly', 'Hydraulics', 'High-pressure gear pump assembly for industrial applications.', 1280, 18, 'blue', 'pump'],
  ['WA-BRG-0186', 'Deep groove ball bearing', 'Bearings', 'Precision sealed bearing built for smooth, reliable rotation.', 84.5, 240, 'amber', 'bearing'],
  ['WA-VAL-0312', 'Pressure relief valve', 'Valves', 'Adjustable pressure relief valve with a durable steel body.', 215, 42, 'violet', 'valve'],
  ['WA-SEA-0094', 'Industrial seal kit', 'Seals & gaskets', 'A complete, wear-resistant seal kit for equipment servicing.', 56, 96, 'green', 'seal'],
  ['WA-MOT-0640', 'Electric motor 2.2 kW', 'Motors', 'Three-phase electric motor designed for continuous operation.', 465, 12, 'rose', 'motor'],
  ['WA-FIT-0208', 'Stainless steel coupling', 'Fittings', 'Corrosion-resistant coupling for demanding fluid systems.', 39.75, 160, 'cyan', 'coupling'],
  ['WA-FIL-0147', 'Hydraulic filter element', 'Hydraulics', 'High-efficiency replacement filter element for hydraulic units.', 72, 54, 'orange', 'filter'],
  ['WA-VAL-0285', 'Solenoid control valve', 'Valves', 'Compact electrically actuated valve for automated systems.', 188, 27, 'lime', 'valve']
];

for (const product of seedProducts) {
  execute(`
    INSERT OR IGNORE INTO products (part_number, name, category, description, price, stock, accent, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, product);
}
persistDatabase();

app.get('/api/auth/me', (request, response) => {
  if (!request.user) return response.json({ user: null });
  if (request.user.role === 'admin') {
    return response.json({ user: { role: 'admin', email: process.env.WCOM_ADMIN_EMAIL } });
  }
  response.json({
    user: {
      role: 'customer',
      id: request.user.customerAccountId,
      customerId: request.user.customerId,
      email: request.user.email,
      company: request.user.company,
      gstNo: request.user.gstNo,
      phone: request.user.phone,
      salesRepresentative: request.user.salesRepresentative
    }
  });
});

app.post('/api/auth/register', async (request, response) => {
  const { company, gstNo, email, phone, password } = request.body || {};
  const profileError = validateCustomerProfile({ company, gstNo, email, phone });
  if (profileError) return response.status(400).json({ error: profileError });
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return response.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedGstNo = gstNo.trim().toUpperCase();
  if (queryAll('SELECT id FROM customer_accounts WHERE email = ?', [normalizedEmail]).length > 0) {
    return response.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
  }
  const [existingCustomer] = queryAll('SELECT id FROM customers WHERE gst_no = ?', [normalizedGstNo]);
  if (existingCustomer && queryAll('SELECT id FROM customer_accounts WHERE customer_id = ?', [existingCustomer.id]).length > 0) {
    return response.status(409).json({ error: 'An account already exists for this GST number. Please sign in or contact Wahan support.' });
  }

  try {
    if (existingCustomer) {
      execute('UPDATE customers SET company = ?, email = ?, phone = ? WHERE id = ?',
        [company.trim(), normalizedEmail, phone.trim(), existingCustomer.id]);
    } else {
      execute('INSERT INTO customers (company, gst_no, email, phone) VALUES (?, ?, ?, ?)',
        [company.trim(), normalizedGstNo, normalizedEmail, phone.trim()]);
    }
    const [customer] = queryAll('SELECT id FROM customers WHERE gst_no = ?', [normalizedGstNo]);
    execute('UPDATE quotations SET customer_id = ? WHERE gst_no = ?', [customer.id, normalizedGstNo]);
    const passwordHash = await hashPassword(password);
    execute('INSERT INTO customer_accounts (customer_id, email, password_hash) VALUES (?, ?, ?)',
      [customer.id, normalizedEmail, passwordHash]);
    const [{ id: accountId }] = queryAll('SELECT last_insert_rowid() AS id');
    createSession(request, response, 'customer', accountId);
    persistDatabase();
    response.status(201).json({
      user: {
        role: 'customer',
        id: accountId,
        customerId: customer.id,
        email: normalizedEmail,
        company: company.trim(),
        gstNo: normalizedGstNo,
        phone: phone.trim(),
        salesRepresentative: null
      },
      verificationRequired: false
    });
  } catch (error) {
    if (String(error.message).includes('UNIQUE constraint failed')) {
      return response.status(409).json({ error: 'An account already uses this email or GST number.' });
    }
    throw error;
  }
});

app.post('/api/auth/login', async (request, response) => {
  const { email, password } = request.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 128) {
    return response.status(400).json({ error: 'Enter your email address and password.' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const [account] = queryAll(`
    SELECT a.id, a.email, a.password_hash, a.customer_id AS customerId,
           c.company, c.gst_no AS gstNo, c.phone,
           sr.name AS salesRepresentative
    FROM customer_accounts a
    JOIN customers c ON c.id = a.customer_id
    LEFT JOIN sales_representatives sr ON sr.id = c.sales_representative_id
    WHERE a.email = ?
  `, [normalizedEmail]);
  if (!account || !(await verifyPassword(password, account.password_hash))) {
    return response.status(401).json({ error: 'The email or password is incorrect.' });
  }
  createSession(request, response, 'customer', account.id);
  response.json({
    user: {
      role: 'customer',
      id: account.id,
      customerId: account.customerId,
      email: account.email,
      company: account.company,
      gstNo: account.gstNo,
      phone: account.phone,
      salesRepresentative: account.salesRepresentative
    }
  });
});

app.post('/api/auth/admin/login', (request, response) => {
  const { email, password } = request.body || {};
  if (!process.env.WCOM_ADMIN_EMAIL || !process.env.WCOM_ADMIN_PASSWORD || process.env.WCOM_ADMIN_PASSWORD.length < 12) {
    return response.status(503).json({ error: 'Admin sign-in needs WCOM_ADMIN_EMAIL and a WCOM_ADMIN_PASSWORD of at least 12 characters.' });
  }
  const submittedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const expectedEmail = process.env.WCOM_ADMIN_EMAIL.trim().toLowerCase();
  const submittedPassword = typeof password === 'string' ? password : '';
  const emailMatches = createHash('sha256').update(submittedEmail).digest();
  const expectedEmailHash = createHash('sha256').update(expectedEmail).digest();
  const passwordMatches = createHash('sha256').update(submittedPassword).digest();
  const expectedPasswordHash = createHash('sha256').update(process.env.WCOM_ADMIN_PASSWORD).digest();
  if (!timingSafeEqual(emailMatches, expectedEmailHash) || !timingSafeEqual(passwordMatches, expectedPasswordHash)) {
    return response.status(401).json({ error: 'The admin email or password is incorrect.' });
  }
  createSession(request, response, 'admin');
  response.json({ user: { role: 'admin', email: expectedEmail } });
});

app.post('/api/auth/logout', (request, response) => {
  const token = getCookie(request, sessionCookie);
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    execute('DELETE FROM sessions WHERE token_hash = ?', [createHash('sha256').update(token).digest('hex')]);
    persistDatabase();
  }
  response.clearCookie(sessionCookie, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  response.status(204).end();
});

app.get('/api/customer/profile', requireCustomer, (request, response) => {
  response.json({
    company: request.user.company,
    gstNo: request.user.gstNo,
    email: request.user.email,
    phone: request.user.phone,
    salesRepresentative: request.user.salesRepresentative
  });
});

app.patch('/api/customer/profile', requireCustomer, (request, response) => {
  const { company, gstNo, email, phone } = request.body || {};
  const profileError = validateCustomerProfile({ company, gstNo, email, phone });
  if (profileError) return response.status(400).json({ error: profileError });
  const normalizedGstNo = gstNo.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();
  const [gstOwner] = queryAll('SELECT id FROM customers WHERE gst_no = ? AND id != ?', [normalizedGstNo, request.user.customerId]);
  if (gstOwner) return response.status(409).json({ error: 'That GST number is already registered to another customer account.' });
  const [emailOwner] = queryAll('SELECT id FROM customer_accounts WHERE email = ? AND id != ?', [normalizedEmail, request.user.customerAccountId]);
  if (emailOwner) return response.status(409).json({ error: 'That email is already registered to another account.' });
  execute('UPDATE customers SET company = ?, gst_no = ?, email = ?, phone = ? WHERE id = ?',
    [company.trim(), normalizedGstNo, normalizedEmail, phone.trim(), request.user.customerId]);
  execute('UPDATE customer_accounts SET email = ? WHERE id = ?', [normalizedEmail, request.user.customerAccountId]);
  execute('UPDATE quotations SET gst_no = ?, email = ?, company = ?, customer_name = ?, phone = ? WHERE customer_id = ?',
    [normalizedGstNo, normalizedEmail, company.trim(), company.trim(), phone.trim(), request.user.customerId]);
  persistDatabase();
  response.json({
    company: company.trim(),
    gstNo: normalizedGstNo,
    email: normalizedEmail,
    phone: phone.trim(),
    salesRepresentative: request.user.salesRepresentative
  });
});

app.get('/api/customer/quotations', requireCustomer, (request, response) => {
  const quotations = queryAll(`
    SELECT id, reference, customer_name AS customerName, email, company,
           gst_no AS gstNo, phone, payment_days AS paymentDays, notes,
           items, total, status, created_at AS createdAt
    FROM quotations WHERE customer_id = ? ORDER BY id DESC
  `, [request.user.customerId]).map((quotation) => ({ ...quotation, items: JSON.parse(quotation.items) }));
  response.json(quotations);
});

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/api/products', (request, response) => {
  const search = String(request.query.search || '').trim().slice(0, 100);
  const category = String(request.query.category || '').trim().slice(0, 60);
  const products = queryAll(`
    SELECT id, part_number AS partNumber, name, category, description, price, stock, accent, icon
    FROM products
    WHERE (? = '' OR name LIKE ? OR part_number LIKE ? OR description LIKE ?)
      AND (? = '' OR category = ?)
    ORDER BY name
  `, [search, `%${search}%`, `%${search}%`, `%${search}%`, category, category]);
  response.json(products);
});

app.get('/api/admin/quotations', requireAdmin, (_request, response) => {
  const quotations = queryAll(`
    SELECT q.id, q.reference, q.customer_name AS customerName, q.email, q.company,
           q.gst_no AS gstNo, q.phone, q.payment_days AS paymentDays, q.notes,
           q.items, q.total, q.status, q.created_at AS createdAt,
           sr.name AS salesRepresentative
    FROM quotations q
    LEFT JOIN customers c ON c.id = q.customer_id OR (q.customer_id IS NULL AND c.gst_no = q.gst_no)
    LEFT JOIN sales_representatives sr ON sr.id = c.sales_representative_id
    ORDER BY q.id DESC
  `).map((quotation) => ({ ...quotation, items: JSON.parse(quotation.items) }));
  response.json(quotations);
});

app.post('/api/customer/quotations', requireCustomer, (request, response) => {
  const { company, gstNo, email, phone, paymentDays, notes = '', items } = request.body || {};
  const profileError = validateCustomerProfile({ company, gstNo, email, phone });
  if (profileError) return response.status(400).json({ error: profileError });
  if (typeof paymentDays !== 'number' || !Number.isSafeInteger(paymentDays) || paymentDays < 0) {
    return response.status(400).json({ error: 'Payment terms must be immediate or a positive whole number of days.' });
  }
  if (typeof notes !== 'string' || notes.length > 1000) {
    return response.status(400).json({ error: 'Notes must be 1000 characters or fewer.' });
  }
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) {
    return response.status(400).json({ error: 'Add between 1 and 50 parts to your request.' });
  }

  const productIds = items.map((item) => Number(item?.productId));
  if (productIds.some((id) => !Number.isSafeInteger(id) || id < 1)) {
    return response.status(400).json({ error: 'One or more selected parts are invalid.' });
  }
  const uniqueIds = [...new Set(productIds)];
  const placeholders = uniqueIds.map(() => '?').join(',');
  const products = queryAll(`
    SELECT id, part_number AS partNumber, name, price FROM products WHERE id IN (${placeholders})
  `, uniqueIds);
  if (products.length !== uniqueIds.length) {
    return response.status(400).json({ error: 'One or more selected parts are no longer available.' });
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  const quoteItems = items.map((item) => {
    const product = productById.get(Number(item.productId));
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) return null;
    return {
      productId: product.id,
      partNumber: product.partNumber,
      name: product.name,
      quantity,
      unitPrice: product.price
    };
  });
  if (quoteItems.some((item) => !item)) {
    return response.status(400).json({ error: 'Part quantities must be whole numbers between 1 and 999.' });
  }

  const total = quoteItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const reference = `WC-${Date.now().toString().slice(-8)}`;
  const normalizedGstNo = gstNo.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.trim();
  const normalizedCompany = company.trim();
  const [gstOwner] = queryAll('SELECT id FROM customers WHERE gst_no = ? AND id != ?', [normalizedGstNo, request.user.customerId]);
  if (gstOwner) return response.status(409).json({ error: 'That GST number is already registered to another customer account.' });
  const [emailOwner] = queryAll('SELECT id FROM customer_accounts WHERE email = ? AND id != ?', [normalizedEmail, request.user.customerAccountId]);
  if (emailOwner) return response.status(409).json({ error: 'That email is already registered to another account.' });
  execute(`
    UPDATE customers SET company = ?, gst_no = ?, email = ?, phone = ? WHERE id = ?
  `, [normalizedCompany, normalizedGstNo, normalizedEmail, normalizedPhone, request.user.customerId]);
  execute('UPDATE customer_accounts SET email = ? WHERE id = ?', [normalizedEmail, request.user.customerAccountId]);
  execute(`
    INSERT INTO quotations (reference, customer_name, email, company, gst_no, phone, payment_days, notes, items, total, customer_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [reference, normalizedCompany, normalizedEmail, normalizedCompany, normalizedGstNo, normalizedPhone, paymentDays, notes.trim(), JSON.stringify(quoteItems), total, request.user.customerId]);
  const [{ id }] = queryAll('SELECT last_insert_rowid() AS id');
  persistDatabase();

  response.status(201).json({
    id,
    reference,
    customerName: normalizedCompany,
    email: normalizedEmail,
    company: normalizedCompany,
    gstNo: normalizedGstNo,
    phone: normalizedPhone,
    paymentDays: Number(paymentDays),
    notes: notes.trim(),
    items: quoteItems,
    total,
    status: 'New'
  });
});

app.patch('/api/admin/quotations/:id/status', requireAdmin, (request, response) => {
  const allowedStatuses = ['New', 'In review', 'Quoted', 'Counter offer', 'Paid', 'Invoiced'];
  const status = request.body?.status;
  if (!allowedStatuses.includes(status)) {
    return response.status(400).json({ error: 'Choose a valid quotation status.' });
  }
  execute('UPDATE quotations SET status = ? WHERE id = ?', [status, Number(request.params.id)]);
  if (database.getRowsModified() === 0) {
    return response.status(404).json({ error: 'Quotation not found.' });
  }
  persistDatabase();
  response.json({ id: Number(request.params.id), status });
});

app.get('/api/admin/sales-representatives', requireAdmin, (_request, response) => {
  response.json(queryAll(`
    SELECT id, name, email, created_at AS createdAt
    FROM sales_representatives ORDER BY name COLLATE NOCASE
  `));
});

app.post('/api/admin/sales-representatives', requireAdmin, (request, response) => {
  const { name, email } = request.body || {};
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    return response.status(400).json({ error: 'Enter a representative name between 2 and 100 characters.' });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254) {
    return response.status(400).json({ error: 'Enter a valid representative email address.' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (queryAll('SELECT id FROM sales_representatives WHERE email = ?', [normalizedEmail]).length > 0) {
    return response.status(409).json({ error: 'A representative with that email already exists.' });
  }
  execute('INSERT INTO sales_representatives (name, email) VALUES (?, ?)', [name.trim(), normalizedEmail]);
  const [{ id }] = queryAll('SELECT last_insert_rowid() AS id');
  persistDatabase();
  response.status(201).json({ id, name: name.trim(), email: normalizedEmail });
});

app.delete('/api/admin/sales-representatives/:id', requireAdmin, (request, response) => {
  const id = Number(request.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return response.status(400).json({ error: 'Invalid sales representative.' });
  }
  execute('DELETE FROM sales_representatives WHERE id = ?', [id]);
  if (database.getRowsModified() === 0) {
    return response.status(404).json({ error: 'Sales representative not found.' });
  }
  execute('UPDATE customers SET sales_representative_id = NULL WHERE sales_representative_id = ?', [id]);
  persistDatabase();
  response.status(204).end();
});

app.get('/api/admin/customers', requireAdmin, (_request, response) => {
  response.json(queryAll(`
    SELECT c.id, c.company, c.gst_no AS gstNo, c.email, c.phone,
           c.sales_representative_id AS salesRepresentativeId,
           sr.name AS salesRepresentative, COUNT(q.id) AS quotationCount
    FROM customers c
    LEFT JOIN sales_representatives sr ON sr.id = c.sales_representative_id
    LEFT JOIN quotations q ON q.gst_no = c.gst_no
    GROUP BY c.id
    ORDER BY c.company COLLATE NOCASE
  `));
});

app.patch('/api/admin/customers/:id/sales-representative', requireAdmin, (request, response) => {
  const customerId = Number(request.params.id);
  const representativeId = request.body?.salesRepresentativeId;
  if (!Number.isSafeInteger(customerId) || customerId < 1) {
    return response.status(400).json({ error: 'Invalid customer.' });
  }
  if (representativeId !== null && (!Number.isSafeInteger(representativeId) || representativeId < 1)) {
    return response.status(400).json({ error: 'Choose a valid sales representative.' });
  }
  if (representativeId !== null && queryAll('SELECT id FROM sales_representatives WHERE id = ?', [representativeId]).length === 0) {
    return response.status(400).json({ error: 'That sales representative is no longer available.' });
  }
  execute('UPDATE customers SET sales_representative_id = ? WHERE id = ?', [representativeId, customerId]);
  if (database.getRowsModified() === 0) {
    return response.status(404).json({ error: 'Customer not found.' });
  }
  persistDatabase();
  const [customer] = queryAll(`
    SELECT c.id, c.gst_no AS gstNo, c.sales_representative_id AS salesRepresentativeId,
           sr.name AS salesRepresentative
    FROM customers c
    LEFT JOIN sales_representatives sr ON sr.id = c.sales_representative_id
    WHERE c.id = ?
  `, [customerId]);
  response.json(customer);
});

const clientBuild = path.resolve(serverDirectory, '..', 'dist');
app.use(express.static(clientBuild));
app.get('*', (request, response, next) => {
  if (request.path.startsWith('/api/')) {
    return response.status(404).json({ error: 'API endpoint not found.' });
  }
  response.sendFile(path.join(clientBuild, 'index.html'), (error) => {
    if (error) next(error);
  });
});

app.listen(port, () => {
  console.log(`W-COM API listening on http://localhost:${port}`);
});

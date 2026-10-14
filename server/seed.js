import initSqlJs from 'sql.js';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.dirname(serverDirectory);
if (process.env.NODE_ENV === 'production') {
  throw new Error('The test-account seed is disabled when NODE_ENV is production.');
}

const databasePath = process.env.WCOM_DB_PATH
  ? path.resolve(process.env.WCOM_DB_PATH)
  : path.join(serverDirectory, 'wcom.sqlite');
const seedPath = path.join(serverDirectory, 'seed.sql');
const require = createRequire(import.meta.url);
const sqlJsDirectory = path.dirname(require.resolve('sql.js'));
const SQL = await initSqlJs({ locateFile: (file) => path.join(sqlJsDirectory, file) });

mkdirSync(path.dirname(databasePath), { recursive: true });
const database = existsSync(databasePath)
  ? new SQL.Database(new Uint8Array(readFileSync(databasePath)))
  : new SQL.Database();

try {
  database.run('BEGIN TRANSACTION');
  database.exec(readFileSync(seedPath, 'utf8'));

  const statement = database.prepare(`
    SELECT c.gst_no AS gstNo
    FROM customer_accounts a
    JOIN customers c ON c.id = a.customer_id
    WHERE a.email = ?
  `);
  statement.bind(['wcom.test.customer.1791960612667@example.com']);
  const seededAccountExists = statement.step() && statement.getAsObject().gstNo === '24ABCDE7056F1Z2';
  statement.free();
  if (!seededAccountExists) throw new Error('The test customer seed did not create the expected account.');

  database.run('COMMIT');
  writeFileSync(databasePath, Buffer.from(database.export()));
  console.log(`Test customer account is ready in ${path.relative(projectDirectory, databasePath)}.`);
} catch (error) {
  database.run('ROLLBACK');
  throw error;
} finally {
  database.close();
}

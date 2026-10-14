/**
 * Las pruebas de integración usan TEST_DATABASE_URL, nunca DATABASE_URL:
 * vacían las tablas antes de cada archivo. Sin la variable, se omiten.
 */
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

import mysql from 'mysql2';

function createConnection() {
  const db = mysql.createConnection({
    user: 'admin',
    password: 'ZOm2XvdZr9BqEy6bic2mhgOPiZkS6n3o',
    database: 'ChatTest',
    host: 'svc-3bab3b55-de57-48e5-b8ca-8dcc6e8a355a-dml.aws-oregon-4.svc.singlestore.com'
  });
  return db;
}

export async function executeSQL({ query, params }) {
  const conn = createConnection();

  const res = conn.execute(query, params);
  console.log('🚀 ~ file: singleStore.js:15 ~ executeSQL ~ res:', res);
  return res;
}

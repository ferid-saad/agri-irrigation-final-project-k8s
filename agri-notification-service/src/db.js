'use strict';

const mongoose = require('mongoose');

// Priorité à MONGODB_URI (Docker Compose), sinon construction à partir des
// variables séparées (Kubernetes : ConfigMap + Secret).
function buildMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  const {
    MONGODB_USER,
    MONGODB_PASSWORD,
    MONGODB_HOST = 'localhost',
    MONGODB_PORT = '27017',
    MONGODB_DB_NAME = 'notifications_db',
  } = process.env;

  const auth = MONGODB_USER
    ? `${encodeURIComponent(MONGODB_USER)}:${encodeURIComponent(MONGODB_PASSWORD || '')}@`
    : '';
  // L'utilisateur root créé par MONGO_INITDB_ROOT_* est dans la base "admin"
  const query = MONGODB_USER ? '?authSource=admin' : '';

  return `mongodb://${auth}${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DB_NAME}${query}`;
}

// Ne jamais écrire le mot de passe dans les logs
function maskUri(uri) {
  return uri.replace(/\/\/([^:]+):[^@]*@/, '//$1:***@');
}

async function connectDB() {
  const uri = buildMongoUri();
  await mongoose.connect(uri);
  console.log('MongoDB connected:', maskUri(uri));
}

module.exports = { connectDB };
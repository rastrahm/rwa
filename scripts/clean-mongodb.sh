#!/bin/bash

# Script para limpiar todas las colecciones de MongoDB
# Uso: ./scripts/clean-mongodb.sh

set -e

MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/rwa-platform}"

# Extraer nombre de la base de datos de la URI
DB_NAME=$(echo "$MONGODB_URI" | sed -n 's/.*\/\([^?]*\).*/\1/p')
if [ -z "$DB_NAME" ]; then
  DB_NAME="rwa-platform"
fi

echo "🔌 Conectando a MongoDB..."
echo "📍 Base de datos: $DB_NAME"

# Verificar si mongosh está disponible
if command -v mongosh &> /dev/null; then
  MONGO_CMD="mongosh"
elif command -v mongo &> /dev/null; then
  MONGO_CMD="mongo"
else
  echo "❌ Error: No se encontró mongosh ni mongo. Por favor instálalo."
  exit 1
fi

echo ""
echo "📋 Listando colecciones existentes..."
$MONGO_CMD "$MONGODB_URI" --quiet --eval "
  db.getCollectionNames().forEach(function(collection) {
    var count = db.getCollection(collection).countDocuments();
    print('   - ' + collection + ' (' + count + ' documentos)');
  });
" 2>/dev/null || {
  echo "❌ Error al conectar a MongoDB. Verifica que esté corriendo."
  echo "💡 Intenta: sudo systemctl start mongod"
  exit 1
}

echo ""
echo "⚠️  ADVERTENCIA: Esto eliminará TODOS los datos de la base de datos '$DB_NAME'."
echo "Presiona Ctrl+C para cancelar, o espera 5 segundos para continuar..."
sleep 5

echo ""
echo "🧹 Limpiando colecciones..."

$MONGO_CMD "$MONGODB_URI" --quiet --eval "
  var collections = db.getCollectionNames();
  var totalDeleted = 0;
  collections.forEach(function(collection) {
    if (collection.indexOf('system.') !== 0) {
      var result = db.getCollection(collection).deleteMany({});
      var deleted = result.deletedCount || 0;
      totalDeleted += deleted;
      print('✅ Limpiada: ' + collection + ' (' + deleted + ' documentos)');
    }
  });
  print('');
  print('✨ Total de documentos eliminados: ' + totalDeleted);
" 2>/dev/null

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Base de datos limpiada exitosamente."
else
  echo ""
  echo "❌ Error al limpiar la base de datos."
  exit 1
fi


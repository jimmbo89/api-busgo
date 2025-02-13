const express = require('express');
const app = express();
const session = require('express-session');
const { sequelize } = require('./models/index');
const cors = require('cors');

// Configuración de sesión
app.use(session({
  secret: 'bulletin',
  resave: false,
  saveUninitialized: true
}));

// Configuración del puerto
const PORT = process.env.PORT || 8000;

app.use(cors({
  // Configura el origen adecuado para el frontend
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
}));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api', require('./routes'));

// Inicia el servidor y la conexión a la base de datos
const server = app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  sequelize.authenticate().then(() => {
    console.log('Conexión a la base de datos exitosa');
  }).catch((error) => {
    console.error('Error al conectar a la base de datos:', error);
    process.exit(1); // Sale si no puede conectar con la DB
  });
});

// Maneja la señal SIGINT para cerrar conexiones y el servidor
process.on('SIGINT', async () => {
  try {
    console.log('Cerrando la conexión a la base de datos...');
    await sequelize.close(); // Cierra la conexión a la base de datos
    console.log('Conexión a la base de datos cerrada.');

    server.close(() => {
      console.log('Servidor cerrado.');
      process.exit(0); // Sale de la aplicación correctamente
    });
  } catch (error) {
    console.error('Error al cerrar la conexión a la base de datos:', error);
    process.exit(1); // Si ocurre un error, termina con código de error
  }
});

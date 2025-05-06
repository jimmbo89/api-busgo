require("dotenv").config();

const getMySQLTimezoneOffset = () => {
  const tz = process.env.TZ || 'America/Santiago';
  const date = new Date();
  
  try {
    // Formato: GMT-0400 -> convertimos a -04:00
    const offsetStr = date.toLocaleTimeString('en', { 
      timeZone: tz,
      timeZoneName: 'longOffset'
    }).match(/GMT([+-]\d{4})/)[1];
    
    const hours = offsetStr.slice(0, 3); // +04 o -03
    const minutes = offsetStr.slice(3);  // 00
    return `${hours}:${minutes}`;        // +04:00
  } catch (e) {
    // Fallback para Chile (UTC-4 en invierno, UTC-3 en verano)
    return date.toString().includes('CLST') ? '-03:00' : '-04:00';
  }
};


module.exports = {
  //configuracion de la db
  username: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_DATABASE || "bulletin",
  host: process.env.DB_HOST || "127.0.0.1",
  dialect: process.env.DB_DIALECT || "mysql",

  // Configuración correcta de zona horaria
  // Configuración para cPanel
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
    // Opción compatible con MySQL en cPanel
    timezone: getMySQLTimezoneOffset(),
  },

  // Zona horaria para Sequelize
  timezone: process.env.TZ || "America/Santiago",

  // Configuración de pooling de conexiones
  pool: {
    max: 5, // Máximo de conexiones
    min: 0, // Mínimo de conexiones
    acquire: 30000, // Tiempo máximo para adquirir una conexión
    idle: 10000, // Tiempo máximo de inactividad para una conexión
  },

  //Configurar seeders
  seederStorage: "sequelize",
  seederStorageTableName: "seeds",

  //Configuracion de Migrations
  migrationStorage: "sequelize",
  migrationStorageTableName: "migrations",
};

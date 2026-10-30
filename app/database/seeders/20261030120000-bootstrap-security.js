'use strict';

const bcrypt = require('bcrypt');

const SYSTEM_ROLES = [
  {
    name: 'Administrador',
    description: 'Administrador del Sistema',
    type: 'Empresa',
    permissions: [
      'view_business', 'view_branches', 'view_workers', 'view_permissions',
      'view_roles', 'view_devices', 'view_structures', 'view_vehicles',
      'view_ticketsdate', 'view_tickettripsdate', 'view_tripsworker',
      'view_locations', 'view_routes', 'view_trips', 'view_tickets',
      'view_promotions', 'view_dashboard', 'view_incidents', 'view_tickettype',
      'view_triptemplates', 'view_checktickets', 'view_saletickets',
      'view_routes_company', 'view_branches_company', 'view_devices_company',
      'view_trips_company', 'view_triptemplates_company', 'view_tickets_company',
      'view_ticketsdate_company', 'view_tickettripsdate_company',
      'view_incidents_company', 'view_tripsworker_company', 'view_reportbusgo',
      'view_changetrip', 'report_ticket_passenger_type', 'view_express_sales_web',
      'view_traditional_sales_web', 'view_tickettemplates',
      'view_system_ticket_template',
    ],
  },
  {
    name: 'Usuario',
    description: 'Usuario del Sistema',
    type: 'Empresa',
    permissions: ['view_ticketsdate', 'view_tripsworker', 'view_tickets'],
  },
  {
    name: 'Venta',
    description: 'Venta de Tickets',
    type: 'Sucursal',
    permissions: ['view_tickets', 'view_checktickets', 'view_saletickets'],
  },
  {
    name: 'Chofer',
    description: 'Chofer de Vehículos',
    type: 'Sucursal',
    permissions: ['view_business', 'view_workers', 'view_trips', 'view_checktickets'],
  },
  {
    name: 'Conductor',
    description: 'Conductor de Vehículos',
    type: 'Sucursal',
    permissions: ['view_checktickets'],
  },
  {
    name: 'VALIDADOR',
    description: 'USUARIO EXCLUSIVO BUSCHECK',
    type: 'Empresa',
    permissions: ['view_checktickets'],
  },
];

const PERMISSIONS = [
  ['view_business', 'Administrar el negocio', 'Administración'],
  ['view_branches', 'Gestionar sucursal', 'Administración'],
  ['view_workers', 'Gestionar trabajadores de una sucursal', 'Administración'],
  ['view_permissions', 'Gestionar los permisos del sistema', 'Mantenedores'],
  ['view_roles', 'Roles del sistema', 'Mantenedores'],
  ['view_devices', 'Gestionar dispositivos', 'Administración'],
  ['view_structures', 'Definir estructuras de asientos de los vehìculos', 'Mantenedores'],
  ['view_vehicles', 'Gestionar los vehìculos', 'Administración'],
  ['view_ticketsdate', 'Reporte General de los tickets vendidos por fecha o período de la sucursal', 'Reportes'],
  ['view_tickettripsdate', 'Reporte general de viajes realizados y tickets vendidos por viaje de la sucursal', 'Reportes'],
  ['view_tripsworker', 'Resumen de viajes realizados por un trabajador por fecha y período en una sucursal dada ', 'Reportes'],
  ['view_locations', 'Gestionar orígenes y destinos', 'Administración'],
  ['view_routes', 'Gestionar las rutas de la sucursal', 'Administración'],
  ['view_trips', 'Gestionar los viajes diarios de la sucursal', 'Administración'],
  ['view_tickets', 'Gestionar la venta de tickets diarios de la sucursal', 'Administración'],
  ['view_promotions', 'Gestionar las promociones', 'Mantenedor'],
  ['view_dashboard', 'Poder visualizar los datos del Dashboard', 'General'],
  ['view_incidents', 'Visualizar detalles de los incidentes ocurridos en la sucursal', 'Administración'],
  ['view_tickettype', 'Definir los tipos de pasajes, habilitarlos y deshabilitarlos', 'Seguridad'],
  ['view_triptemplates', 'Gestionar las plantillas de viajes de la sucursal', 'Mantenedores'],
  ['view_checktickets', 'Acceso a chequear los tickets, desde BusCheck', 'Administración'],
  ['view_saletickets', 'Venta de tickets desde la aplicación de BusGo', 'Administración'],
  ['view_routes_company', 'Gestionar las rutas de las sucursales de la empresa', 'Administración'],
  ['view_branches_company', 'Gestionar las sucursales de la empresa', 'Administración'],
  ['view_devices_company', 'Gestionar los dispositivos de todas las sucursales ', 'Administración'],
  ['view_trips_company', 'Gestionar los viajes de las sucursales de la empresa', 'Administración'],
  ['view_triptemplates_company', 'Gestionar las plantillas de viajes de las sucursales de la empresa', 'Administración'],
  ['view_tickets_company', 'Gestionar las ventas de tickets diarios en las sucursales de la empresa', 'Administración'],
  ['view_ticketsdate_company', 'Reporte general de los tickets vendidos por fecha o período en las sucursales de la empresa', 'Reportes'],
  ['view_tickettripsdate_company', 'Reporte general de viajes realizados y tickets vendidos por viaje en las sucursales de la empresa', 'Reportes'],
  ['view_incidents_company', 'Visualizar detalles de los incidentes ocurridos en las sucursales de la empresa', 'Reportes'],
  ['view_tripsworker_company', 'Resumen de viajes realizados por un trabajador por fecha y período por sucursales de la empresa ', 'Reportes'],
  ['view_reportbusgo', 'Acceso a los reportes en BusGo', 'Reportes'],
  ['view_reportbuscheck', 'Acceso a los reportes en BusCheck', 'Reportes'],
  ['view_changetrip', 'Acceso en busgo a cambiar pasajeros de un bus hacia otro', 'Busgo'],
  ['report_ticket_passenger_type', 'Acceso al reporte de pasajes emitidos, asientos vendidos, tarifa base, ajustes y monto recaudado por tipo de pasaje.', 'Reportes'],
  ['view_express_sales_app', 'Permite vender tickets express desde el aplicativo', 'Administración'],
  ['view_express_sales_web', 'Permite vender tickets express desde la web', 'Administración'],
  ['view_traditional_sales_web', 'Ventas de tickets full por la web', 'Administración'],
  ['view_tickettemplates', 'Permite consultar y administrar las plantillas de tickets configuradas para los comprobantes de viaje', 'Reportes'],
  ['view_system_ticket_template', 'Permite consultar la plantilla global de tickets del sistema.', 'Seguridad'],
];

const ROOT = {
  name: 'root',
  email: process.env.SEED_ROOT_EMAIL || 'juan.perez@example.com',
  workerName: 'Usuario ROOT del Sistema',
  workerEmail: 'admin@example.com',
  workerPhone: '+56935478123',
  workerRut: '54.568.745-9',
  workerAddress: 'dasdasdasdasd',
  workerImage: 'workers/default.jpg',
};

const timestamps = () => ({
  createdAt: new Date(),
  updatedAt: new Date(),
});

const selectOne = async (queryInterface, sql, replacements, transaction) => {
  const [rows] = await queryInterface.sequelize.query(sql, {
    replacements,
    transaction,
  });
  return rows[0] || null;
};

const selectAll = async (queryInterface, sql, replacements, transaction) => {
  const [rows] = await queryInterface.sequelize.query(sql, {
    replacements,
    transaction,
  });
  return rows;
};

const insertIfMissing = async (queryInterface, table, rows, key, transaction) => {
  if (rows.length === 0) return;

  const existing = await selectAll(
    queryInterface,
    `SELECT ${key} FROM ${table}`,
    undefined,
    transaction
  );
  const existingValues = new Set(existing.map((row) => String(row[key])));
  const missing = rows.filter((row) => !existingValues.has(String(row[key])));

  if (missing.length > 0) {
    await queryInterface.bulkInsert(table, missing, { transaction });
  }
};

const getRoleMap = async (queryInterface, transaction) => {
  const rows = await selectAll(
    queryInterface,
    'SELECT id, name FROM roles',
    undefined,
    transaction
  );
  return new Map(rows.map((row) => [row.name, row.id]));
};

const getPermissionMap = async (queryInterface, transaction) => {
  const rows = await selectAll(
    queryInterface,
    'SELECT id, name FROM permissions',
    undefined,
    transaction
  );
  return new Map(rows.map((row) => [row.name, row.id]));
};

const ensureBootstrapUser = async (queryInterface, roleMap, transaction) => {
  if (!process.env.SEED_ROOT_PASSWORD) {
    throw new Error('Debe definir SEED_ROOT_PASSWORD antes de ejecutar este seeder.');
  }

  let user = await selectOne(
    queryInterface,
    'SELECT id FROM users WHERE name = :name OR email = :email LIMIT 1',
    { name: ROOT.name, email: ROOT.email },
    transaction
  );

  if (!user) {
    await queryInterface.bulkInsert('users', [{
      name: ROOT.name,
      email: ROOT.email,
      password: await bcrypt.hash(
        process.env.SEED_ROOT_PASSWORD,
        Number.parseInt(process.env.AUTH_ROUNDS || '10', 10)
      ),
      email_verified_at: new Date(),
      remember_token: null,
      ...timestamps(),
    }], { transaction });

    user = await selectOne(
      queryInterface,
      'SELECT id FROM users WHERE email = :email LIMIT 1',
      { email: ROOT.email },
      transaction
    );
  }

  if (!user) throw new Error('No se pudo crear o localizar el usuario root.');

  const administratorRoleId = roleMap.get('Administrador');
  const worker = await selectOne(
    queryInterface,
    'SELECT id FROM workers WHERE user_id = :userId LIMIT 1',
    { userId: user.id },
    transaction
  );

  if (!worker) {
    await queryInterface.bulkInsert('workers', [{
      user_id: user.id,
      role_id: administratorRoleId,
      name: ROOT.workerName,
      email: ROOT.workerEmail,
      phone: ROOT.workerPhone,
      rut: ROOT.workerRut,
      address: ROOT.workerAddress,
      image: ROOT.workerImage,
      ...timestamps(),
    }], { transaction });
  }

  // Las entidades restantes no se crean aquí intencionalmente.
  // El usuario debe crear posteriormente company, branch y branch_worker.
};

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await insertIfMissing(
        queryInterface,
        'roles',
        SYSTEM_ROLES.map(({ name, description, type }) => ({
          name,
          description,
          type,
          ...timestamps(),
        })),
        'name',
        transaction
      );

      await insertIfMissing(
        queryInterface,
        'permissions',
        PERMISSIONS.map(([name, description, module]) => ({
          name,
          description,
          module,
          ...timestamps(),
        })),
        'name',
        transaction
      );

      const roleMap = await getRoleMap(queryInterface, transaction);
      const permissionMap = await getPermissionMap(queryInterface, transaction);
      const existingRelations = await selectAll(
        queryInterface,
        'SELECT role_id, permission_id FROM permission_roles',
        undefined,
        transaction
      );
      const relationKeys = new Set(
        existingRelations.map((row) => `${row.role_id}:${row.permission_id}`)
      );
      const relations = [];

      for (const role of SYSTEM_ROLES) {
        const roleId = roleMap.get(role.name);
        for (const permissionName of role.permissions) {
          const permissionId = permissionMap.get(permissionName);
          if (!roleId || !permissionId) {
            throw new Error(`No se encontró el rol o permiso: ${role.name}/${permissionName}`);
          }
          const key = `${roleId}:${permissionId}`;
          if (!relationKeys.has(key)) {
            relationKeys.add(key);
            relations.push({
              permission_id: permissionId,
              role_id: roleId,
              ...timestamps(),
            });
          }
        }
      }

      if (relations.length > 0) {
        await queryInterface.bulkInsert('permission_roles', relations, { transaction });
      }

      await ensureBootstrapUser(queryInterface, roleMap, transaction);
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    throw new Error(
      'Este seeder es de bootstrap y no se revierte automáticamente para evitar borrar datos dependientes.'
    );
  },
};

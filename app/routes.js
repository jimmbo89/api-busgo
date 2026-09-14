const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const mime = require("mime-types"); // Importación compatible con CommonJS

/*
 * Catálogo documental de consumidores de la API.
 *
 * [WEB]       Panel administrativo/comercial en navegador.
 * [BUSGO]     Aplicación móvil de operación y venta a bordo.
 * [BUSCHECK]  Aplicación móvil para validación de tickets mediante QR.
 * [COMPARTIDO] Endpoint consumible por más de una plataforma.
 * [INFRA]     Endpoint técnico, no asociado a una plataforma de negocio.
 *
 * Todas las rutas se publican bajo /api (app/server.js). Las etiquetas indican
 * el consumidor funcional esperado; no crean restricciones de acceso nuevas.
 *
 * Evidencia revisada: logs/combined/combined-2026-09-10.log. El log registra
 * acciones de controladores y datos de plataforma en algunos inicios de sesión,
 * pero no guarda la URL/plataforma junto a cada petición; las rutas marcadas
 * [POR CONFIRMAR] requieren trazas futuras o revisión de los clientes.
 */

//Controladores
const AuthController = require("./controllers/AuthController");
const RoleController = require("./controllers/RoleController");
const CompanyController = require("./controllers/CompanyController");
const BranchController = require("./controllers/BranchController");
const PermissionController = require("./controllers/PermissionController");
const WorkerController = require("./controllers/WorkerController");
const BranchWorkerController = require("./controllers/BranchWorkerController");
const PermissionRoleController = require("./controllers/PermissionRoleController");
const VehicleController = require("./controllers/VehicleController");
const LocationController = require("./controllers/LocationController");
const RouteController = require("./controllers/RouteController");
const RouteStopController = require("./controllers/RouteStopController");
const TripStopController = require("./controllers/TripStopController");
const FareSegmentController = require("./controllers/FareSegmentController");
const DeviceController = require("./controllers/DeviceController");
const BranchRouteController = require("./controllers/BranchRouteController");
const BranchVehicleController = require("./controllers/BranchVehicleController");
const VehicleWorkerController = require("./controllers/VehicleWorkerController");
const TripController = require("./controllers/TripController");
const TripWorkerController = require("./controllers/TripWorkerController");
const TicketController = require("./controllers/TicketController");
const TuuController = require("./controllers/TuuController");
const StructureController = require("./controllers/StructureController");
const PromotionController = require("./controllers/PromotionController");
const IncidentController = require("./controllers/IncidentController");
const TicketTypeController = require("./controllers/TicketTypeController");

//Middlewares
const auth = require("./middlewares/auth");
const multerImage = require("./middlewares/multerImage");
const validateSchema = require("./middlewares/validateSchema");
const {
  registerSchema,
  loginSchema,
  webLoginSchema,
  loginApkSerialSchema,
  updatePasswordSchema,
} = require("./middlewares/validations/authValidation");
const {
  storeRoleSchema,
  updateRoleSchema,
  idRoleSchema,
  typeRoleSchema,
} = require("./middlewares/validations/roleValidation");
const {
  storeCompanySchema,
  updateCompanySchema,
  idCompanySchema,
} = require("./middlewares/validations/companyValidation");
const {
  storeBranchSchema,
  updateBranchSchema,
  idBranchSchema,
} = require("./middlewares/validations/branchValidation");
const {
  storePermissionSchema,
  updatePermissionSchema,
  idPermissionSchema,
} = require("./middlewares/validations/permissionValidation");
const {
  storeWorkerSchema,
  updateWorkerSchema,
  idWorkerSchema,
} = require("./middlewares/validations/workerValidation");
const {
  storeBranchWorkerSchema,
  updateBranchWorkerSchema,
  idBranchWorkerSchema,
  typeRoleBranchSchema,
  worker_idBranchWorkerSchema
} = require("./middlewares/validations/branchworkerValidation");
const {
  storePermissionRoleSchema,
  updatePermissionRoleSchema,
  idPermissionRoleSchema,
  role_idRoleSchema,
} = require("./middlewares/validations/permissionroleValidation");
const {
  storeVehicleSchema,
  updateVehicleSchema,
  idVehicleSchema,
} = require("./middlewares/validations/vehicleValidation");
const {
  storeLocationSchema,
  updateLocationSchema,
  idLocationSchema,
} = require("./middlewares/validations/locationValidation");
const {
  storeRouteSchema,
  updateRouteSchema,
  idRouteSchema,
} = require("./middlewares/validations/routeValidation");
const {
  storeRouteStopSchema,
  updateRouteStopSchema,
  idRouteStopSchema,
  routeIdRouteStopSchema,
  companyIdRouteStopSchema,
} = require("./middlewares/validations/routestopValidation");
const {
  storeTripStopSchema,
  updateTripStopSchema,
  idTripStopSchema,
  tripIdTripStopSchema,
  companyIdTripStopSchema,
} = require("./middlewares/validations/tripstopValidation");
const {
  storeFareSegmentSchema,
  updateFareSegmentSchema,
  idFareSegmentSchema,
  routeIdFareSegmentSchema,
  companyIdFareSegmentSchema,
} = require("./middlewares/validations/faresegmentValidation");
const {
  storeDeviceSchema,
  updateDeviceSchema,
  idDeviceSchema,
  branchIdDeviceSchema,
  deviceCompanySchema,
} = require("./middlewares/validations/deviceValidation");
const {
  storeBranchRouteSchema,
  updateBranchRouteSchema,
  idBranchRouteSchema,
} = require("./middlewares/validations/branchrouteValidation");
const {
  storeBranchVehicleSchema,
  updateBranchVehicleSchema,
  idBranchVehicleSchema,
} = require("./middlewares/validations/branchvehicleValidation");
const {
  storeVehicleWorkerSchema,
  updateVehicleWorkerSchema,
  idVehicleWorkerSchema,
  vehicle_idWorkerSchema,
} = require("./middlewares/validations/vehicleworkerValidation");
const {
  storeTripSchema,
  storeMobileTripSchema,
  updateTripSchema,
  idTripSchema,
  changeTripSchema,
  branch_idTripSchema,
  branchOriginDestinationTripSchema,
  branchTripDateSegmentAllSchema,
  tripWorkerDateSchema,
  tripWorkerReportSchema,
  expressSalesDestinationsSchema,
  expressSalesDeparturesSchema,
  expressSalesDepartureAvailabilitySchema,
} = require("./middlewares/validations/tripValidation");
const {
  storeTripWorkerSchema,
  updateTripWorkerSchema,
  idTripWorkerSchema,
  assignTripWorkersSchema,
} = require("./middlewares/validations/tripworkerValidation");
const {
  storeTicketSchema,
  updateTicketSchema,
  idTicketSchema,
  branchTicketTripSchema,
  monthlySalesSchema,
  ticketSoldDateSchema,
  passengerTypeSalesReportSchema,
  storeTicketWebSchema,
  storeExpressTicketSchema,
  qrEncryptedSchema,
  ticketSoldDateWorkerSchema,
  ticketReportSchema,
  checkReservedSeatsSchema
} = require("./middlewares/validations/ticketValidation");
const { paymentSchema, paymentDataSchema, } = require("./middlewares/validations/tuuValidation");
const { storeStructureSchema, updateStructureSchema, idStructureSchema, } = require("./middlewares/validations/structureValidation");
const { storePromotionSchema, updatePromotionSchema, idPromotionSchema, activePromotionSchema } = require("./middlewares/validations/promotionValidation");
const { incidentDateSchema } = require("./middlewares/validations/incidentValidation");
const { storeTicketTypeSchema, updateTicketTypeSchema, idTicketTypeSchema, activeTicketTypeSchema } = require("./middlewares/validations/tickettypeValidation");
const TripTemplateController = require("./controllers/TripTemplateController");
const { storeTripTemplateSchema, updateTripTemplateSchema, idTripTemplateSchema, branchTripTemplateSchema } = require("./middlewares/validations/triptemplateValidation");

router.get("/", (req, res) => res.json({ hello: "World" })); // [INFRA] Verifica que la API responda.
router.get("/health", (req, res) => res.status(200).json(true)); // [INFRA] Health check para monitoreo.

// [WEB] Registro de usuarios del sistema.
router.post( "/register", validateSchema(registerSchema), AuthController.register ); // [WEB] Registra un usuario nuevo.
router.post("/login", validateSchema(webLoginSchema), AuthController.login); // [WEB] Autentica usuarios del panel web.
// [BUSGO / BUSCHECK] Inicio de sesión de las aplicaciones móviles; platform identifica el cliente.
router.post( "/login-apk", validateSchema(loginSchema), AuthController.login_apk ); // [BUSGO / BUSCHECK] Inicia sesión móvil; el campo platform distingue la app.
// [BUSGO / BUSCHECK] Inicio de sesión móvil asociado a un dispositivo mediante serial.
router.post( "/login-apk-serial", validateSchema(loginApkSerialSchema), AuthController.login_apk_serial ); // [BUSGO / BUSCHECK] Inicia sesión móvil y valida el serial del dispositivo.
router.get("/branch-login", BranchController.index_login); // [WEB] Carga sucursales disponibles para seleccionar durante el acceso.
// [COMPARTIDO] Sirve imágenes públicas de compañías, sucursales, trabajadores,
// vehículos, ubicaciones y dispositivos desde la carpeta `public`.
router.get("/images/:foldername/:filename", (req, res) => {
  const { foldername, filename } = req.params;
  const imagePath = path.join(__dirname, "../public", foldername, filename);

  // Verifica si el archivo existe
  if (!fs.existsSync(imagePath)) {
    return res.status(400).send("Imagen no encontrada");
  }

  // Obtén el tipo MIME del archivo
  const fileType = mime.lookup(imagePath) || "application/octet-stream";

  // Lee el archivo y envíalo en la respuesta
  fs.readFile(imagePath, (err, file) => {
    if (err) {
      return res.status(500).send("Error al leer la imagen");
    }
    res.writeHead(200, { "Content-Type": fileType });
    res.end(file);
  });
});

router.post("/tuu-payment", TuuController.createPayment); // [POR CONFIRMAR] Inicia un pago Tuu; es público y el log histórico no lo atribuye a plataforma.
// [BUSGO] Comprueba si el dispositivo móvil está asociado a una compañía antes de iniciar sesión.
router.post( "/device-company", validateSchema(deviceCompanySchema), DeviceController.isDeviceAssociatedWithCompany ); // [BUSGO] Verifica la asociación del dispositivo antes del login por serial.
// Rutas protegidas: requieren token mediante el middleware auth.
router.use(auth);
router.get("/logout", AuthController.logout); // [COMPARTIDO] Cierra la sesión autenticada de Web o móvil.
router.get("/logout-apk-serial", AuthController.logout_apk_serial); // [BUSGO / BUSCHECK] Cierra una sesión móvil asociada a serial.
router.post( "/update-password", validateSchema(updatePasswordSchema), AuthController.updatePassword ); // [COMPARTIDO] Actualiza la contraseña del usuario autenticado.

// [WEB] Administración de roles y tipos de rol del sistema.
router.get("/role", RoleController.index); // [WEB] Lista los roles disponibles.
router.post("/role", validateSchema(storeRoleSchema), RoleController.store); // [WEB] Crea un rol.
router.post("/role-show", validateSchema(idRoleSchema), RoleController.show); // [WEB] Consulta un rol por ID.
router.put("/role", validateSchema(updateRoleSchema), RoleController.update); // [WEB] Actualiza un rol.
router.post("/role-destroy", validateSchema(idRoleSchema),RoleController.destroy); // [WEB] Elimina un rol.
router.post("/get-role-type", validateSchema(typeRoleSchema), RoleController.getRolesByType); // [WEB] Filtra roles por tipo.

// [WEB] Administración de compañías.
router.get("/company", CompanyController.index); // [WEB] Lista compañías.
// [WEB] Crea una compañía y procesa su imagen opcional.
router.post( "/company", multerImage("image", "companies"), validateSchema(storeCompanySchema), CompanyController.store );
// [WEB] Consulta el detalle de una compañía.
router.post( "/company-show", validateSchema(idCompanySchema), CompanyController.show );
// [WEB] Actualiza una compañía y su imagen opcional.
router.post( "/company-update", multerImage("image", "companies"), validateSchema(updateCompanySchema), CompanyController.update );
// [WEB] Elimina una compañía.
router.post( "/company-destroy", validateSchema(idCompanySchema), CompanyController.destroy );

// [WEB] Administración de sucursales.
router.get("/branch", BranchController.index); // [WEB] Lista sucursales.
// [WEB] Crea una sucursal y procesa su imagen opcional.
router.post( "/branch", multerImage("image", "branches"), validateSchema(storeBranchSchema), BranchController.store );
// [WEB] Consulta el detalle de una sucursal.
router.post( "/branch-show", validateSchema(idBranchSchema), BranchController.show );
// [WEB] Actualiza una sucursal y su imagen opcional.
router.post( "/branch-update", multerImage("image", "branches"), validateSchema(updateBranchSchema), BranchController.update );
// [WEB] Elimina una sucursal.
router.post( "/branch-destroy", validateSchema(idBranchSchema), BranchController.destroy );

// [WEB] Administración del catálogo de permisos.
router.get("/permission", PermissionController.index); // [WEB] Lista permisos.
// [WEB] Crea un permiso.
router.post( "/permission", validateSchema(storePermissionSchema), PermissionController.store );
// [WEB] Consulta un permiso por ID.
router.post( "/permission-show", validateSchema(idPermissionSchema), PermissionController.show );
// [WEB] Actualiza un permiso.
router.put( "/permission", validateSchema(updatePermissionSchema), PermissionController.update );
// [WEB] Elimina un permiso.
router.post( "/permission-destroy", validateSchema(idPermissionSchema), PermissionController.destroy );

// [WEB] Administración de trabajadores y sus datos maestros.
router.get("/worker", WorkerController.index); // [WEB] Lista trabajadores.
// [WEB] Crea un trabajador y procesa su imagen opcional.
router.post( "/worker", multerImage("image", "workers"), validateSchema(storeWorkerSchema), WorkerController.store );
// [WEB] Consulta un trabajador por ID.
router.post( "/worker-show", validateSchema(idWorkerSchema), WorkerController.show );
// [WEB] Actualiza un trabajador y su imagen opcional.
router.post( "/worker-update", multerImage("image", "workers"), validateSchema(updateWorkerSchema), WorkerController.update );
// [WEB] Elimina un trabajador.
router.post( "/worker-destroy", validateSchema(idWorkerSchema), WorkerController.destroy );

// [WEB / BUSGO] Administración de asignaciones trabajador-sucursal; algunas consultas alimentan la operación móvil.
router.get("/branch-worker", BranchWorkerController.index); // [WEB] Lista asignaciones trabajador-sucursal.
// [WEB / BUSGO] Lista trabajadores asociados a una sucursal para operación de viajes.
router.post( "/branch-workers", validateSchema(branch_idTripSchema), BranchWorkerController.branch_workers );
router.post("/worker-branches", validateSchema(worker_idBranchWorkerSchema), BranchWorkerController.worker_branches); // [WEB] Consulta sucursales de un trabajador.
router.post("/worker-branches-ticket-types", BranchWorkerController.worker_branches_ticket_types); // [WEB] Consulta tipos de ticket por sucursal y trabajador.
// [WEB] Asocia un trabajador a una sucursal.
router.post( "/branch-worker", validateSchema(storeBranchWorkerSchema), BranchWorkerController.store );
// [WEB] Consulta una asignación trabajador-sucursal.
router.post( "/branch-worker-show", validateSchema(idBranchWorkerSchema), BranchWorkerController.show );
// [WEB] Actualiza una asignación trabajador-sucursal.
router.put( "/branch-worker", validateSchema(updateBranchWorkerSchema), BranchWorkerController.update );
// [WEB] Elimina una asignación trabajador-sucursal.
router.post( "/branch-worker-destroy", validateSchema(idBranchWorkerSchema), BranchWorkerController.destroy );
// [WEB] Filtra trabajadores por rol dentro de una sucursal.
router.post( "/branch-workers-roles", validateSchema(typeRoleBranchSchema), BranchWorkerController.getBranchWorkersRole );

// [WEB] Administración de permisos asignados a roles.
router.get("/permission-role", PermissionRoleController.index); // [WEB] Lista relaciones rol-permiso.
// [WEB] Consulta los permisos de un rol.
router.post( "/role-permissions", validateSchema(role_idRoleSchema), PermissionRoleController.role_permissions );
// [WEB] Crea una relación rol-permiso.
router.post( "/permission-role", validateSchema(storePermissionRoleSchema), PermissionRoleController.store );
// [WEB] Consulta una relación rol-permiso.
router.post( "/permission-role-show", validateSchema(idPermissionRoleSchema), PermissionRoleController.show );
// [WEB] Actualiza una relación rol-permiso.
router.put( "/permission-role", validateSchema(updatePermissionRoleSchema), PermissionRoleController.update );
// [WEB] Elimina una relación rol-permiso.
router.post( "/permission-role-destroy", validateSchema(idPermissionRoleSchema), PermissionRoleController.destroy );

// [WEB] Administración del catálogo de vehículos.
router.get("/vehicle", VehicleController.index); // [WEB] Lista vehículos.
// [WEB] Crea un vehículo y procesa su imagen opcional.
router.post( "/vehicle", multerImage("image", "vehicles"), validateSchema(storeVehicleSchema), VehicleController.store );
// [WEB] Consulta un vehículo por ID.
router.post( "/vehicle-show", validateSchema(idVehicleSchema), VehicleController.show );
// [WEB] Actualiza un vehículo y su imagen opcional.
router.post( "/vehicle-update", multerImage("image", "vehicles"), validateSchema(updateVehicleSchema), VehicleController.update );
// [WEB] Elimina un vehículo.
router.post( "/vehicle-destroy", validateSchema(idVehicleSchema), VehicleController.destroy );

// [WEB / BUSGO] Consultas de ubicaciones; el log del 10-09 confirma /location en Busgo.
router.get("/location", LocationController.index); // [WEB / BUSGO] Lista ubicaciones disponibles para origen y destino.
// [WEB] Obtiene ubicaciones filtradas por ruta o sucursal.
router.post("/location-route", LocationController.index_route);
// [WEB] Crea una ubicación y procesa su imagen opcional.
router.post( "/location", multerImage("image", "locations"), validateSchema(storeLocationSchema), LocationController.store );
// [WEB] Consulta una ubicación por ID.
router.post( "/location-show", validateSchema(idLocationSchema), LocationController.show );
// [WEB] Actualiza una ubicación y su imagen opcional.
router.post( "/location-update", multerImage("image", "locations"), validateSchema(updateLocationSchema), LocationController.update );
// [WEB] Elimina una ubicación.
router.post( "/location-destroy", validateSchema(idLocationSchema), LocationController.destroy );

// [WEB] Administración de rutas maestras.
router.get("/route", RouteController.index); // [WEB] Lista rutas.
router.post("/route-index-branch", RouteController.getAvailableRoutesByBranch); // [WEB] Lista rutas disponibles para una sucursal.
router.post("/route", validateSchema(storeRouteSchema), RouteController.store); // [WEB] Crea una ruta.
router.post("/route-show", validateSchema(idRouteSchema), RouteController.show); // [WEB] Consulta una ruta por ID.
router.put("/route", validateSchema(updateRouteSchema), RouteController.update); // [WEB] Actualiza una ruta.
// [WEB] Elimina una ruta.
router.post( "/route-destroy", validateSchema(idRouteSchema), RouteController.destroy );

// [WEB] Administración de paradas asociadas a rutas.
router.get("/route-stop", RouteStopController.index); // [WEB] Lista paradas de ruta.
router.post("/route-stop-by-route", validateSchema(routeIdRouteStopSchema), RouteStopController.byRoute); // [WEB] Lista paradas de una ruta.
router.post("/route-stop-by-company", validateSchema(companyIdRouteStopSchema), RouteStopController.byCompany); // [WEB] Lista paradas de una compañía.
router.post("/route-stop", validateSchema(storeRouteStopSchema), RouteStopController.store); // [WEB] Crea una parada de ruta.
router.post("/route-stop-show", validateSchema(idRouteStopSchema), RouteStopController.show); // [WEB] Consulta una parada por ID.
router.put("/route-stop", validateSchema(updateRouteStopSchema), RouteStopController.update); // [WEB] Actualiza una parada de ruta.
router.post("/route-stop-destroy", validateSchema(idRouteStopSchema), RouteStopController.destroy); // [WEB] Elimina una parada de ruta.

// [WEB] Administración de paradas concretas de viajes.
router.get("/trip-stop", TripStopController.index); // [WEB] Lista paradas de viajes.
router.post("/trip-stop-by-trip", validateSchema(tripIdTripStopSchema), TripStopController.byTrip); // [WEB] Lista paradas de un viaje.
router.post("/trip-stop-by-company", validateSchema(companyIdTripStopSchema), TripStopController.byCompany); // [WEB] Lista paradas de viajes de una compañía.
router.post("/trip-stop", validateSchema(storeTripStopSchema), TripStopController.store); // [WEB] Crea una parada dentro de un viaje.
router.post("/trip-stop-show", validateSchema(idTripStopSchema), TripStopController.show); // [WEB] Consulta una parada de viaje por ID.
router.put("/trip-stop", validateSchema(updateTripStopSchema), TripStopController.update); // [WEB] Actualiza una parada de viaje.
router.post("/trip-stop-destroy", validateSchema(idTripStopSchema), TripStopController.destroy); // [WEB] Elimina una parada de viaje.

// [WEB] Administración de segmentos tarifarios.
router.get("/fare-segment", FareSegmentController.index); // [WEB] Lista segmentos tarifarios.
router.post("/fare-segment-by-route", validateSchema(routeIdFareSegmentSchema), FareSegmentController.byRoute); // [WEB] Lista tarifas de una ruta.
router.post("/fare-segment-by-company", validateSchema(companyIdFareSegmentSchema), FareSegmentController.byCompany); // [WEB] Lista tarifas de una compañía.
router.post("/fare-segment", validateSchema(storeFareSegmentSchema), FareSegmentController.store); // [WEB] Crea un segmento tarifario.
router.post("/fare-segment-show", validateSchema(idFareSegmentSchema), FareSegmentController.show); // [WEB] Consulta un segmento tarifario por ID.
router.put("/fare-segment", validateSchema(updateFareSegmentSchema), FareSegmentController.update); // [WEB] Actualiza un segmento tarifario.
router.post("/fare-segment-destroy", validateSchema(idFareSegmentSchema), FareSegmentController.destroy); // [WEB] Elimina un segmento tarifario.

// [WEB] Administración de dispositivos registrados.
router.get("/device", DeviceController.index); // [WEB] Lista dispositivos.
// [WEB] Registra un dispositivo y procesa su imagen opcional.
router.post( "/device", multerImage("image", "devices"), validateSchema(storeDeviceSchema), DeviceController.store );
// [WEB] Lista dispositivos asociados a una sucursal.
router.post( "/device-branch", validateSchema(branchIdDeviceSchema), DeviceController.indexBranch );
// [WEB] Consulta un dispositivo por ID.
router.post( "/device-show", validateSchema(idDeviceSchema), DeviceController.show );
// [WEB] Actualiza un dispositivo y su imagen opcional.
router.post( "/device-update", multerImage("image", "devices"), validateSchema(updateDeviceSchema), DeviceController.update );
// [WEB] Elimina un dispositivo.
router.post( "/device-destroy", validateSchema(idDeviceSchema), DeviceController.destroy );

// [WEB] Administración de rutas habilitadas por sucursal.
router.get("/branch-route", BranchRouteController.index); // [WEB] Lista relaciones sucursal-ruta.
// [WEB / BUSGO] Obtiene las rutas de una sucursal; puede alimentar la selección de viajes en móvil.
router.post( "/branch-routes", BranchRouteController.branch_routes );
// [WEB] Asocia una ruta a una sucursal.
router.post( "/branch-route", validateSchema(storeBranchRouteSchema), BranchRouteController.store );
// [WEB] Consulta una relación sucursal-ruta.
router.post( "/branch-route-show", validateSchema(idBranchRouteSchema), BranchRouteController.show );
// [WEB] Actualiza una relación sucursal-ruta.
router.put( "/branch-route", validateSchema(updateBranchRouteSchema), BranchRouteController.update );
// [WEB] Elimina una relación sucursal-ruta.
router.post( "/branch-route-destroy", validateSchema(idBranchRouteSchema), BranchRouteController.destroy );

// [WEB / BUSGO] Relaciones entre sucursales y vehículos.
router.get("/branch-vehicle", BranchVehicleController.index); // [WEB] Lista relaciones sucursal-vehículo.
// [WEB / BUSGO] Lista vehículos de una sucursal; la consulta de vehículos operativos fue observada en Busgo el 10-09.
router.post( "/branch-vehicles", validateSchema(branch_idTripSchema), BranchVehicleController.branch_vehicles );
// [WEB] Asocia un vehículo a una sucursal.
router.post( "/branch-vehicle", validateSchema(storeBranchVehicleSchema), BranchVehicleController.store );
// [WEB] Consulta una relación sucursal-vehículo.
router.post( "/branch-vehicle-show", validateSchema(idBranchVehicleSchema), BranchVehicleController.show );
// [WEB] Actualiza una relación sucursal-vehículo.
router.put( "/branch-vehicle", validateSchema(updateBranchVehicleSchema), BranchVehicleController.update );
// [WEB] Elimina una relación sucursal-vehículo.
router.post( "/branch-vehicle-destroy", validateSchema(idBranchVehicleSchema), BranchVehicleController.destroy );

// [WEB] Relaciones entre vehículos y trabajadores.
router.get("/vehicle-worker", VehicleWorkerController.index); // [WEB] Lista relaciones vehículo-trabajador.
router.post( "/vehicle-workers", validateSchema(vehicle_idWorkerSchema), VehicleWorkerController.vehicle_workers );
// [WEB] Asocia un trabajador a un vehículo.
router.post( "/vehicle-worker", validateSchema(storeVehicleWorkerSchema), VehicleWorkerController.store );
// [WEB] Consulta una relación vehículo-trabajador.
router.post( "/vehicle-worker-show", validateSchema(idVehicleWorkerSchema), VehicleWorkerController.show );
// [WEB] Actualiza una relación vehículo-trabajador.
router.put( "/vehicle-worker", validateSchema(updateVehicleWorkerSchema), VehicleWorkerController.update );
// [WEB] Elimina una relación vehículo-trabajador.
router.post( "/vehicle-worker-destroy", validateSchema(idVehicleWorkerSchema), VehicleWorkerController.destroy );

// Consultas y operaciones de viajes; el consumidor queda identificado en cada ruta.
router.get("/trip", TripController.index); // [WEB] Lista viajes para la administración.
router.post("/get-trip-date", validateSchema(branchTicketTripSchema), TripController.getTripDate ); // [BUSGO / BUSCHECK] Consulta viajes de una sucursal y fecha para mostrar la cartelera móvil.
router.post("/get-trip-date-segment", validateSchema(branchOriginDestinationTripSchema), TripController.getTripDateBySegment); // [WEB / BUSGO] Busca viajes por fecha, origen y destino; uso confirmado en Busgo el 10-09.
router.post("/get-trip-date-segment-all", validateSchema(branchTripDateSegmentAllSchema), TripController.getTripDateBySegmentAll); // [WEB] Consulta viajes por tramo sin filtros completos.
router.post("/get-trip-vehicle", validateSchema(branch_idTripSchema), TripController.getTripVehicle ); // [WEB / BUSGO] Lista vehículos activos de una sucursal; uso observado en Busgo.
router.post("/get-trip-branch-date", validateSchema(branchTicketTripSchema), TripController.index_branch_date ); // [WEB / BUSGO] Lista viajes de una sucursal y fecha.
router.post("/get-trip-branch-worker", validateSchema(branchTicketTripSchema),TripController.getTripWorkerDate); // [WEB / BUSGO] Consulta viajes asociados a un trabajador.
router.post("/trip", validateSchema(storeTripSchema), TripController.store); // [WEB] Crea un viaje desde la operación web.
router.post("/mobile-trip", validateSchema(storeMobileTripSchema), TripController.mobileStore); // [BUSGO] Crea un viaje desde la aplicación móvil.
router.post("/trip-show", validateSchema(idTripSchema), TripController.show); // [WEB / BUSGO] Consulta el detalle de un viaje.
router.post("/trip-update", validateSchema(updateTripSchema), TripController.update); // [WEB / BUSGO] Actualiza datos de un viaje.
router.post("/trip-change-trip", validateSchema(changeTripSchema), TripController.changeTrip); // [BUSGO / WEB] Cambia vehículo o trabajadores de un viaje; uso observado en Busgo.
router.post("/trip-destroy", validateSchema(idTripSchema), TripController.destroy ); // [WEB] Elimina un viaje.
router.post("/get-routes-vehicle-workers", validateSchema(branch_idTripSchema), TripController.getRouteVehicleBranch ); // [WEB] Obtiene la configuración unificada de rutas, vehículos y trabajadores para planificar viajes.
router.post("/express-sales-destinations", validateSchema(expressSalesDestinationsSchema), TripController.getExpressSalesDestinations); // [BUSGO] Obtiene destinos disponibles para ventas express.
router.post("/express-sales-departures", validateSchema(expressSalesDeparturesSchema), TripController.getExpressSalesDepartures); // [BUSGO] Obtiene salidas disponibles para ventas express.
router.post("/express-sales-departure-availability", validateSchema(expressSalesDepartureAvailabilitySchema), TripController.getExpressSalesDepartureAvailability); // [BUSGO] Verifica disponibilidad de una salida express.
router.post("/trips-tickets-date", validateSchema(ticketSoldDateSchema), TripController.getTripsTicketsDate); // [WEB / BUSGO] Consulta viajes y tickets vendidos por fecha.
router.post("/trips-tickets-date-worker", validateSchema(ticketSoldDateWorkerSchema), TripController.getTripsTicketsDateWorker); // [WEB / BUSGO] Consulta viajes y tickets vendidos por trabajador.

// [WEB] Administración de trabajadores asignados a viajes.
router.get("/trip-worker", TripWorkerController.index); // [WEB] Lista asignaciones viaje-trabajador.
// [WEB] Crea una asignación de trabajador a un viaje.
router.post( "/trip-worker", validateSchema(storeTripWorkerSchema), TripWorkerController.store );
// [WEB] Asocia varios trabajadores a un viaje.
router.post( "/trip-assign-workers", validateSchema(assignTripWorkersSchema), TripWorkerController.associateWorkersTrip ); //Asociar varaios trabajadores a un viaje
// [WEB] Consulta una asignación viaje-trabajador.
router.post( "/trip-worker-show", validateSchema(idTripWorkerSchema), TripWorkerController.show );
// [WEB] Actualiza una asignación viaje-trabajador.
router.put( "/trip-worker", validateSchema(updateTripWorkerSchema), TripWorkerController.update );
// [WEB] Elimina una asignación viaje-trabajador.
router.post( "/trip-worker-destroy", validateSchema(idTripWorkerSchema), TripWorkerController.destroy );
router.post("/trips-worker-date", validateSchema(tripWorkerDateSchema), TripController.getTripsDateWorker); // [WEB / BUSGO] Consulta viajes de trabajadores por fecha.
router.post("/trips-worker-report", validateSchema(tripWorkerReportSchema), TripController.getTripsByBranchAndWorker); // [WEB / BUSGO] Genera reporte de viajes por sucursal y trabajador.

// Consultas y operaciones de tickets; el consumidor queda identificado en cada ruta.
router.get("/ticket", TicketController.index); // [WEB] Lista tickets para consulta administrativa.
router.post("/ticket-web", validateSchema(storeTicketWebSchema),TicketController.store_web); // [WEB] Registra una venta de ticket desde el panel web.
router.post("/express-sales-ticket", validateSchema(storeExpressTicketSchema), TicketController.store_express); // [BUSGO] Registra una venta express desde la aplicación móvil.
router.post( "/ticket", validateSchema(storeTicketSchema), TicketController.store ); // [BUSGO] Registra una venta tradicional desde la aplicación móvil.
router.post( "/ticket-show", validateSchema(idTicketSchema), TicketController.show ); // [WEB / BUSGO] Consulta el detalle de un ticket.
router.put( "/ticket", validateSchema(updateTicketSchema), TicketController.update ); // [WEB / BUSGO] Actualiza el estado o datos de un ticket.
router.post( "/ticket-destroy", validateSchema(idTicketSchema), TicketController.destroy ); // [WEB] Anula o elimina un ticket.
router.post( "/get-tickets-date", validateSchema(branchTicketTripSchema), TicketController.getTicketsDate ); // [WEB / BUSCHECK] Consulta tickets de una sucursal y fecha para reportes o control.
router.post( "/check-reserved-seats", validateSchema(checkReservedSeatsSchema), TicketController.checkReservedSeats ); // [WEB / BUSGO] Verifica asientos reservados antes de vender.
router.post( "/monthly-sales", validateSchema(monthlySalesSchema), TicketController.getMonthlySales ); // [WEB] Obtiene el resumen de ventas mensuales del dashboard.
router.post( "/ticket-sold-date", validateSchema(ticketSoldDateSchema), TicketController.getTicketsSoldDate ); // [WEB] Consulta tickets vendidos por rango de fechas.
router.post( "/ticket-passenger-type-report", validateSchema(passengerTypeSalesReportSchema), TicketController.getPassengerTypeSalesReport ); // [WEB] Genera reporte de ventas por tipo de pasajero.

router.post("/ticket-sold-date-worker", validateSchema(ticketSoldDateWorkerSchema), TicketController.getTicketsSoldDateWorker); // [WEB] Consulta tickets vendidos por trabajador y fecha.

router.post("/verify-qr-ticket", validateSchema(qrEncryptedSchema),TicketController.verifyEncryptedQR); // [BUSCHECK] Valida el QR/SequenceNumber de un ticket; uso confirmado en el log del 10-09.
router.post("/get-tickets-print-report", validateSchema(ticketReportSchema), TicketController.getTicketsPrintReport); // [WEB / BUSGO] Consulta el estado de impresión de tickets.

router.post("/tuu", validateSchema(paymentSchema), TuuController.store); // [POR CONFIRMAR] Guarda la respuesta de pago Tuu asociada a un ticket.
router.post( "/ticket-tuus", validateSchema(idTicketSchema), TuuController.getPaymentsByTicketId ); // [POR CONFIRMAR] Consulta pagos asociados a un ticket.

// [WEB] Administración de estructuras de vehículos.
router.get("/structure", StructureController.index); // [WEB] Lista estructuras.
router.post("/structure-cursor", StructureController.index_cursor); // [WEB] Consulta estructuras usando paginación por cursor.
router.post( "/structure", validateSchema(storeStructureSchema), StructureController.store ); // [WEB] Crea una estructura.
router.post( "/structure-show", validateSchema(idStructureSchema), StructureController.show ); // [WEB] Consulta una estructura por ID.
router.put( "/structure", validateSchema(updateStructureSchema), StructureController.update ); // [WEB] Actualiza una estructura.
router.post( "/structure-destroy", validateSchema(idStructureSchema), StructureController.destroy ); // [WEB] Elimina una estructura.

// [WEB] Administración de promociones y consultas de promociones activas.
router.get("/promotion", PromotionController.index); // [WEB] Lista promociones.
router.get("/get-promotion", PromotionController.index_true); // [POR CONFIRMAR] Lista promociones activas para consumo; plataforma no aparece en el log histórico.
router.post("/promotion", validateSchema(storePromotionSchema), PromotionController.store); // [WEB] Crea una promoción.
router.post("/promotion-show", validateSchema(idPromotionSchema), PromotionController.show); // [WEB] Consulta una promoción por ID.
router.put("/promotion", validateSchema(updatePromotionSchema), PromotionController.update); // [WEB] Actualiza una promoción.
router.post("/promotion-destroy", validateSchema(idPromotionSchema),PromotionController.destroy); // [WEB] Elimina una promoción.
router.post("/get-promotion-avtive", validateSchema(activePromotionSchema), PromotionController.getPromotionsByActiveStatus); // [POR CONFIRMAR] Filtra promociones por estado activo.

// [WEB] Administración de tipos de ticket; las consultas activas pueden ser compartidas con apps de venta.
router.get("/ticket-type", TicketTypeController.index); // [WEB] Lista tipos de ticket.
router.get("/get-ticket-type", TicketTypeController.index_true); // [POR CONFIRMAR] Devuelve tipos activos; confirmar si Busgo lo consume al vender.
router.post("/ticket-type", validateSchema(storeTicketTypeSchema), TicketTypeController.store); // [WEB] Crea un tipo de ticket.
router.post("/ticket-type-show", validateSchema(idTicketTypeSchema), TicketTypeController.show); // [WEB] Consulta un tipo de ticket por ID.
router.put("/ticket-type", validateSchema(updateTicketTypeSchema), TicketTypeController.update); // [WEB] Actualiza un tipo de ticket.
router.post("/ticket-type-destroy", validateSchema(idTicketTypeSchema),TicketTypeController.destroy); // [WEB] Elimina un tipo de ticket.
router.post("/get-ticket-type-avtive", validateSchema(activeTicketTypeSchema), TicketTypeController.getByActiveStatus); // [POR CONFIRMAR] Filtra tipos de ticket por estado.

// [WEB] Administración de plantillas para programar viajes.
router.post("/get-trip-template", TripTemplateController.index); // [WEB] Lista plantillas.
router.post("/trip-template", validateSchema(storeTripTemplateSchema), TripTemplateController.store); // [WEB] Crea una plantilla de viaje.
router.post("/trip-template-show", validateSchema(idTripTemplateSchema), TripTemplateController.show); // [WEB] Consulta una plantilla por ID.
router.put("/trip-template", validateSchema(updateTripTemplateSchema), TripTemplateController.update); // [WEB] Actualiza una plantilla de viaje.
router.post("/trip-template-destroy", validateSchema(idTripTemplateSchema),TripTemplateController.destroy); // [WEB] Elimina una plantilla de viaje.
router.post("/get-trip-template-avtive", validateSchema(branchTripTemplateSchema), TripTemplateController.getActiveByBranch); // [POR CONFIRMAR] Lista plantillas activas por sucursal.

// [WEB] Consulta incidentes dentro de un período o fecha indicada.
router.post("/incident-date", validateSchema(incidentDateSchema),IncidentController.getIncidents); // [WEB] Reporta incidentes registrados.

module.exports = router;

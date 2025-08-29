const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const mime = require("mime-types"); // Importación compatible con CommonJS

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
  updateTripSchema,
  idTripSchema,
  branch_idTripSchema,
  tripWorkerDateSchema,
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
  storeTicketWebSchema,
  qrEncryptedSchema,
  ticketSoldDateWorkerSchema
} = require("./middlewares/validations/ticketValidation");
const { paymentSchema, paymentDataSchema, } = require("./middlewares/validations/tuuValidation");
const { storeStructureSchema, updateStructureSchema, idStructureSchema, } = require("./middlewares/validations/structureValidation");
const { storePromotionSchema, updatePromotionSchema, idPromotionSchema, activePromotionSchema } = require("./middlewares/validations/promotionValidation");
const { branch_idIncidentSchema } = require("./middlewares/validations/incidentValidation");
const { storeTicketTypeSchema, updateTicketTypeSchema, idTicketTypeSchema, activeTicketTypeSchema } = require("./middlewares/validations/tickettypeValidation");
const TripTemplateController = require("./controllers/TripTemplateController");
const { storeTripTemplateSchema, updateTripTemplateSchema, idTripTemplateSchema, branchTripTemplateSchema } = require("./middlewares/validations/triptemplateValidation");

router.get("/", (req, res) => res.json({ hello: "World" }));

router.post(
  "/register",
  validateSchema(registerSchema),
  AuthController.register
);
router.post("/login", validateSchema(loginSchema), AuthController.login);
router.post(
  "/login-apk",
  validateSchema(loginSchema),
  AuthController.login_apk
);
router.get("/branch-login", BranchController.index_login);
// Ruta para servir imágenes desde la carpeta `public`
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

router.post("/tuu-payment", TuuController.createPayment);
router.post(
  "/device-company",
  validateSchema(deviceCompanySchema),
  DeviceController.isDeviceAssociatedWithCompany
);
//rutas protegidas
router.use(auth);
router.get("/logout", AuthController.logout);
router.post(
  "/update-password",
  validateSchema(updatePasswordSchema),
  AuthController.updatePassword
);

//Rutas Roles
router.get("/role", RoleController.index);
router.post("/role", validateSchema(storeRoleSchema), RoleController.store);
router.post("/role-show", validateSchema(idRoleSchema), RoleController.show);
router.put("/role", validateSchema(updateRoleSchema), RoleController.update);
router.post("/role-destroy", validateSchema(idRoleSchema),RoleController.destroy);
router.post("/get-role-type", validateSchema(typeRoleSchema), RoleController.getRolesByType);

//Rutas Company
router.get("/company", CompanyController.index);
router.post(
  "/company",
  multerImage("image", "companies"),
  validateSchema(storeCompanySchema),
  CompanyController.store
);
router.post(
  "/company-show",
  validateSchema(idCompanySchema),
  CompanyController.show
);
router.post(
  "/company-update",
  multerImage("image", "companies"),
  validateSchema(updateCompanySchema),
  CompanyController.update
);
router.post(
  "/company-destroy",
  validateSchema(idCompanySchema),
  CompanyController.destroy
);

//Rutas Brabch
router.get("/branch", BranchController.index);
router.post(
  "/branch",
  multerImage("image", "branches"),
  validateSchema(storeBranchSchema),
  BranchController.store
);
router.post(
  "/branch-show",
  validateSchema(idBranchSchema),
  BranchController.show
);
router.post(
  "/branch-update",
  multerImage("image", "branches"),
  validateSchema(updateBranchSchema),
  BranchController.update
);
router.post(
  "/branch-destroy",
  validateSchema(idBranchSchema),
  BranchController.destroy
);

//Rutas Permission
router.get("/permission", PermissionController.index);
router.post(
  "/permission",
  validateSchema(storePermissionSchema),
  PermissionController.store
);
router.post(
  "/permission-show",
  validateSchema(idPermissionSchema),
  PermissionController.show
);
router.put(
  "/permission",
  validateSchema(updatePermissionSchema),
  PermissionController.update
);
router.post(
  "/permission-destroy",
  validateSchema(idPermissionSchema),
  PermissionController.destroy
);

//Rutas Worker
router.get("/worker", WorkerController.index);
router.post(
  "/worker",
  multerImage("image", "workers"),
  validateSchema(storeWorkerSchema),
  WorkerController.store
);
router.post(
  "/worker-show",
  validateSchema(idWorkerSchema),
  WorkerController.show
);
router.post(
  "/worker-update",
  multerImage("image", "workers"),
  validateSchema(updateWorkerSchema),
  WorkerController.update
);
router.post(
  "/worker-destroy",
  validateSchema(idWorkerSchema),
  WorkerController.destroy
);

//Rutas BranchWorker
router.get("/branch-worker", BranchWorkerController.index);
router.post(
  "/branch-workers",
  validateSchema(branch_idTripSchema),
  BranchWorkerController.branch_workers
);
router.post("/worker-branches", validateSchema(worker_idBranchWorkerSchema), BranchWorkerController.worker_branches);
router.post(
  "/branch-worker",
  validateSchema(storeBranchWorkerSchema),
  BranchWorkerController.store
);
router.post(
  "/branch-worker-show",
  validateSchema(idBranchWorkerSchema),
  BranchWorkerController.show
);
router.put(
  "/branch-worker",
  validateSchema(updateBranchWorkerSchema),
  BranchWorkerController.update
);
router.post(
  "/branch-worker-destroy",
  validateSchema(idBranchWorkerSchema),
  BranchWorkerController.destroy
);
router.post(
  "/branch-workers-roles",
  validateSchema(typeRoleBranchSchema),
  BranchWorkerController.getBranchWorkersRole
);

//Rutas PermissionRole
router.get("/permission-role", PermissionRoleController.index);
router.post(
  "/role-permissions",
  validateSchema(role_idRoleSchema),
  PermissionRoleController.role_permissions
);
router.post(
  "/permission-role",
  validateSchema(storePermissionRoleSchema),
  PermissionRoleController.store
);
router.post(
  "/permission-role-show",
  validateSchema(idPermissionRoleSchema),
  PermissionRoleController.show
);
router.put(
  "/permission-role",
  validateSchema(updatePermissionRoleSchema),
  PermissionRoleController.update
);
router.post(
  "/permission-role-destroy",
  validateSchema(idPermissionRoleSchema),
  PermissionRoleController.destroy
);

//Rutas Vehicle
router.get("/vehicle", VehicleController.index);
router.post(
  "/vehicle",
  multerImage("image", "vehicles"),
  validateSchema(storeVehicleSchema),
  VehicleController.store
);
router.post(
  "/vehicle-show",
  validateSchema(idVehicleSchema),
  VehicleController.show
);
router.post(
  "/vehicle-update",
  multerImage("image", "vehicles"),
  validateSchema(updateVehicleSchema),
  VehicleController.update
);
router.post(
  "/vehicle-destroy",
  validateSchema(idVehicleSchema),
  VehicleController.destroy
);

//Rutas Location
router.get("/location", LocationController.index);
router.post(
  "/location",
  multerImage("image", "locations"),
  validateSchema(storeLocationSchema),
  LocationController.store
);
router.post(
  "/location-show",
  validateSchema(idLocationSchema),
  LocationController.show
);
router.post(
  "/location-update",
  multerImage("image", "locations"),
  validateSchema(updateLocationSchema),
  LocationController.update
);
router.post(
  "/location-destroy",
  validateSchema(idLocationSchema),
  LocationController.destroy
);

//Rutas Route
router.get("/route", RouteController.index);
router.post("/route-index-branch", RouteController.getAvailableRoutesByBranch);
router.post("/route", validateSchema(storeRouteSchema), RouteController.store);
router.post("/route-show", validateSchema(idRouteSchema), RouteController.show);
router.put("/route", validateSchema(updateRouteSchema), RouteController.update);
router.post(
  "/route-destroy",
  validateSchema(idRouteSchema),
  RouteController.destroy
);

//Rutas Device
router.get("/device", DeviceController.index);
router.post(
  "/device",
  multerImage("image", "devices"),
  validateSchema(storeDeviceSchema),
  DeviceController.store
);
router.post(
  "/device-branch",
  validateSchema(branchIdDeviceSchema),
  DeviceController.indexBranch
);
router.post(
  "/device-show",
  validateSchema(idDeviceSchema),
  DeviceController.show
);
router.post(
  "/device-update",
  multerImage("image", "devices"),
  validateSchema(updateDeviceSchema),
  DeviceController.update
);
router.post(
  "/device-destroy",
  validateSchema(idDeviceSchema),
  DeviceController.destroy
);

//Rutas BranchRoute
router.get("/branch-route", BranchRouteController.index);
router.post(
  "/branch-routes",
  validateSchema(branch_idTripSchema),
  BranchRouteController.branch_routes
);
router.post(
  "/branch-route",
  validateSchema(storeBranchRouteSchema),
  BranchRouteController.store
);
router.post(
  "/branch-route-show",
  validateSchema(idBranchRouteSchema),
  BranchRouteController.show
);
router.put(
  "/branch-route",
  validateSchema(updateBranchRouteSchema),
  BranchRouteController.update
);
router.post(
  "/branch-route-destroy",
  validateSchema(idBranchRouteSchema),
  BranchRouteController.destroy
);

//Rutas BranchVehicle
router.get("/branch-vehicle", BranchVehicleController.index);
router.post(
  "/branch-vehicles",
  validateSchema(branch_idTripSchema),
  BranchVehicleController.branch_vehicles
);
router.post(
  "/branch-vehicle",
  validateSchema(storeBranchVehicleSchema),
  BranchVehicleController.store
);
router.post(
  "/branch-vehicle-show",
  validateSchema(idBranchVehicleSchema),
  BranchVehicleController.show
);
router.put(
  "/branch-vehicle",
  validateSchema(updateBranchVehicleSchema),
  BranchVehicleController.update
);
router.post(
  "/branch-vehicle-destroy",
  validateSchema(idBranchVehicleSchema),
  BranchVehicleController.destroy
);

//Rutas VehicleWorker
router.get("/vehicle-worker", VehicleWorkerController.index);
router.post(
  "/vehicle-workers",
  validateSchema(vehicle_idWorkerSchema),
  VehicleWorkerController.vehicle_workers
);
router.post(
  "/vehicle-worker",
  validateSchema(storeVehicleWorkerSchema),
  VehicleWorkerController.store
);
router.post(
  "/vehicle-worker-show",
  validateSchema(idVehicleWorkerSchema),
  VehicleWorkerController.show
);
router.put(
  "/vehicle-worker",
  validateSchema(updateVehicleWorkerSchema),
  VehicleWorkerController.update
);
router.post(
  "/vehicle-worker-destroy",
  validateSchema(idVehicleWorkerSchema),
  VehicleWorkerController.destroy
);

//Rutas Trip
router.get("/trip", TripController.index);
router.post(
  "/get-trip-date",
  validateSchema(branchTicketTripSchema),
  TripController.getTripDate
);
router.post(
  "/get-trip-branch-date",
  validateSchema(branchTicketTripSchema),
  TripController.index_branch_date
);
router.post("/get-trip-branch-worker", validateSchema(branchTicketTripSchema),TripController.getTripWorkerDate);
router.post("/trip", validateSchema(storeTripSchema), TripController.store);
router.post("/trip-show", validateSchema(idTripSchema), TripController.show);
router.post("/trip-update", validateSchema(updateTripSchema), TripController.update);
router.post(
  "/trip-destroy",
  validateSchema(idTripSchema),
  TripController.destroy
);
router.post(
  "/get-routes-vehicle-workers",
  validateSchema(branch_idTripSchema),
  TripController.getRouteVehicleBranch
);
router.post("/trips-tickets-date", validateSchema(ticketSoldDateSchema), TripController.getTripsTicketsDate);
router.post("/trips-tickets-date-worker", validateSchema(ticketSoldDateWorkerSchema), TripController.getTripsTicketsDateWorker);

//Rutas Trip
router.get("/trip-worker", TripWorkerController.index);
router.post(
  "/trip-worker",
  validateSchema(storeTripWorkerSchema),
  TripWorkerController.store
);
router.post(
  "/trip-assign-workers",
  validateSchema(assignTripWorkersSchema),
  TripWorkerController.associateWorkersTrip
); //Asociar varaios trabajadores a un viaje
router.post(
  "/trip-worker-show",
  validateSchema(idTripWorkerSchema),
  TripWorkerController.show
);
router.put(
  "/trip-worker",
  validateSchema(updateTripWorkerSchema),
  TripWorkerController.update
);
router.post(
  "/trip-worker-destroy",
  validateSchema(idTripWorkerSchema),
  TripWorkerController.destroy
);
router.post("/trips-worker-date", validateSchema(tripWorkerDateSchema), TripController.getTripsByBranchAndWorker);

//Rutas Ticket
router.get("/ticket", TicketController.index);
router.post("/ticket-web", validateSchema(storeTicketWebSchema),TicketController.store_web);
router.post(
  "/ticket",
  validateSchema(storeTicketSchema),
  TicketController.store
);
router.post(
  "/ticket-show",
  validateSchema(idTicketSchema),
  TicketController.show
);
router.put(
  "/ticket",
  validateSchema(updateTicketSchema),
  TicketController.update
);
router.post(
  "/ticket-destroy",
  validateSchema(idTicketSchema),
  TicketController.destroy
);
router.post(
  "/get-tickets-date",
  validateSchema(branchTicketTripSchema),
  TicketController.getTicketsDate
);
router.post(
  "/monthly-sales",
  validateSchema(monthlySalesSchema),
  TicketController.getMonthlySales
);
router.post(
  "/ticket-sold-date",
  validateSchema(ticketSoldDateSchema),
  TicketController.getTicketsSoldDate
);

router.post("/ticket-sold-date-worker", validateSchema(ticketSoldDateWorkerSchema), TicketController.getTicketsSoldDateWorker);

router.post("/verify-qr-ticket", validateSchema(qrEncryptedSchema),TicketController.verifyEncryptedQR);

//Api Tuu
router.post("/tuu", validateSchema(paymentSchema), TuuController.store);
router.post(
  "/ticket-tuus",
  validateSchema(idTicketSchema),
  TuuController.getPaymentsByTicketId
);

//Rutas Structure
router.get("/structure", StructureController.index);
router.post("/structure-cursor", StructureController.index_cursor);
router.post(
  "/structure",
  validateSchema(storeStructureSchema),
  StructureController.store
);
router.post(
  "/structure-show",
  validateSchema(idStructureSchema),
  StructureController.show
);
router.put(
  "/structure",
  validateSchema(updateStructureSchema),
  StructureController.update
);
router.post(
  "/structure-destroy",
  validateSchema(idStructureSchema),
  StructureController.destroy
);

//Rutas Promotion
router.get("/promotion", PromotionController.index);
router.get("/get-promotion", PromotionController.index_true);
router.post("/promotion", validateSchema(storePromotionSchema), PromotionController.store);
router.post("/promotion-show", validateSchema(idPromotionSchema), PromotionController.show);
router.put("/promotion", validateSchema(updatePromotionSchema), PromotionController.update);
router.post("/promotion-destroy", validateSchema(idPromotionSchema),PromotionController.destroy);
router.post("/get-promotion-avtive", validateSchema(activePromotionSchema), PromotionController.getPromotionsByActiveStatus);

//Rutas Ticket Type
router.get("/ticket-type", TicketTypeController.index);
router.get("/get-ticket-type", TicketTypeController.index_true);
router.post("/ticket-type", validateSchema(storeTicketTypeSchema), TicketTypeController.store);
router.post("/ticket-type-show", validateSchema(idTicketTypeSchema), TicketTypeController.show);
router.put("/ticket-type", validateSchema(updateTicketTypeSchema), TicketTypeController.update);
router.post("/ticket-type-destroy", validateSchema(idTicketTypeSchema),TicketTypeController.destroy);
router.post("/get-ticket-type-avtive", validateSchema(activeTicketTypeSchema), TicketTypeController.getByActiveStatus);

//Rutas TripTemplate
router.post("/get-trip-template", TripTemplateController.index);
router.post("/trip-template", validateSchema(storeTripTemplateSchema), TripTemplateController.store);
router.post("/trip-template-show", validateSchema(idTripTemplateSchema), TripTemplateController.show);
router.put("/trip-template", validateSchema(updateTripTemplateSchema), TripTemplateController.update);
router.post("/trip-template-destroy", validateSchema(idTripTemplateSchema),TripTemplateController.destroy);
router.post("/get-trip-template-avtive", validateSchema(branchIdDeviceSchema), TripTemplateController.getActiveByBranch);

//Rutas Incidents
router.post("/incident-date", validateSchema(branch_idIncidentSchema),IncidentController.getIncidents);

module.exports = router;

const { Op } = require("sequelize");
const {
  User,
  UserToken,
  Worker,
  BranchWorker,
  Branch,
  Role,
  Company,
  Permission,
  sequelize,
} = require("../models"); // Importamos sequelize desde db
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authConfig = require("../../config/auth");
const logger = require("../../config/logger");
const { RoleRepository } = require("../repositories");

const AuthController = {
  //registro
  async register(req, res) {
    logger.info("Registrando Usuario.");

    const t = await sequelize.transaction(); // Inicia una transacción
    try {
      // Generar un hashSync de la contraseña
      let hashedPassword = bcrypt.hashSync(
        req.body.password,
        Number.parseInt(authConfig.rounds)
      );
      const extractedName = req.body.user
        ? req.body.user
        : req.body.email.split("@")[0];
      // Crear el usuario con la contraseña encriptada
      const user = await User.create(
        {
          name: extractedName,
          email: req.body.email,
          password: hashedPassword,
        },
        { transaction: t }
      );

      const roles = await RoleRepository.findByType("Sistema");
      // Filtrar el rol con name igual a 'Usuario'
      const role = roles.find((r) => r.name === "Usuario");

      const worker = await Worker.create(
        {
          user_id: user.id,
          role_id: role.id,
          name: req.body.name,
          email: req.body.email,
          address: req.body.address,
          phone: req.body.phone,
          rut: req.body.rut,
          image: "workers/default.jpg",
        },
        { transaction: t }
      );

      // Creamos el objeto con la información del usuario y la persona
      const userNew = {
        id: user.id,
        email: user.email,
        name: user.name,
        worker: {
          id: worker.id, // Aquí accedes a la persona creada
          name: worker.name,
          email: worker.email,
        },
      };
      // Creamos el token
      const token = jwt.sign({ user: userNew }, authConfig.secret, {
        expiresIn: authConfig.expires,
      });

      // Decodificar el token para obtener la fecha de expiración
      const decoded = jwt.decode(token);

      // La fecha de expiración está en el campo 'exp' del JWT
      const expiresAt = new Date(decoded.exp * 1000); // 'exp' es en segundos, así que lo convertimos a milisegundos

      // Guardar el token en la base de datos
      await UserToken.create(
        {
          user_id: user.id,
          token: token,
          expires_at: expiresAt,
        },
        { transaction: t }
      );

      // Hacer commit de la transacción
      await t.commit();
      // Respuesta en formato JSON
      res.status(201).json({
        id: userNew.id,
        userName: userNew.name,
        email: userNew.email,
        token: token,
        workerName: worker.name,
        workerImage: worker.image,
        workerId: worker.image,
      });
    } catch (error) {
      // Revertir la transacción en caso de error
      await t.rollback();
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("Error al registrar usuario: " + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  //login
  async login(req, res) {
    logger.info("Entrando a loguearse");
    logger.info("datos recibidos al loguerase");
    logger.info(JSON.stringify(req.body));
    try {
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { email: req.body.email }, // Puede ser el correo
            { name: req.body.email }, // O puede ser el nombre de usuario
          ],
        },
        include: [
          {
            model: Worker,
            as: "worker",
            attributes: ["id", "name", "email", "image", "role_id"],
            include: [
              {
                model: Role,
                as: "role",
                attributes: ["id", "name"],
                include: [
                  {
                    model: Permission,
                    as: "permissions", // Asumiendo que la relación se llama "permissions"
                    attributes: ["name", "module"], // Incluir el nombre y la descripción del permiso
                    through: { attributes: [] }, // Excluir la tabla intermedia si no necesitas sus atributos
                  },
                ],
              },
              {
                model: BranchWorker,
                as: "branchWorkers",
                include: [
                  {
                    model: Branch,
                    as: "branch",
                    include: {
                      model: Company,
                      as: "company",
                    },
                  },
                  {
                    model: Role,
                    as: "role", // Asumiendo que la relación se llama "permissions"
                    include: [
                      {
                        model: Permission,
                        as: "permissions", // Asumiendo que la relación se llama "permissions"
                        attributes: ["name", "module"], // Incluir el nombre y la descripción del permiso
                        through: { attributes: [] }, // Excluir la tabla intermedia si no necesitas sus atributos
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            model: Company,
            as: "companies",
            attributes: ["id", "name", "image"],
          },
        ],
      });
      if (!user) {
        return res.status(204).json({ msg: "Usuario no encontrado" });
      }
      // Verificar si el campo password es nulo o vacío
      if (!user.password || user.password === "") {
        return res.status(400).json({ msg: "Credenciales inválidas" });
      }

      const isMatch = await bcrypt.compare(req.body.password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: "Credenciales inválidas" });
      }
      let branchData = [];
      let companyData = [];
      let systemRolePermissions = [];
      let branchRolePermissions = [];
      let roleName = "";
      let role_id = "";
      if (req.body.branch_id) {
        const branchWorker = user.worker.branchWorkers.find(
          (branchWorker) => branchWorker.branch.id === req.body.branch_id
        );
      
        // Verificar si se encontró el branchWorker
        if (!branchWorker) {
          return res.status(400).json({ msg: "No es usuario de esta Sucursal" });
        }
      
        // Obtener branchData desde branchWorker
        branchData = branchWorker.branch;
      
        // Obtener roleName y role_id desde branchWorker
        roleName = branchWorker.role.name;
        role_id = branchWorker.role_id;
        companyData = branchData.company;
              // Obtener los permisos del rol en la relación con las branches
      branchRolePermissions = user.worker.branchWorkers.flatMap(
        (branchWorker) => {
          return branchWorker.role.permissions.map((permission) => {
            return `${permission.name}, ${permission.module}`;
          });
        }
      );
      } else {
        // Asignar la primera compañía a companyData
        companyData = user.companies ? user.companies[0] : [];
        /*if (!companyData) {
          return res.status(400).json({ msg: "No es usuario de esta Empresa" });
        }*/
        roleName = user.worker.role.name;
        role_id = user.worker.role_id;
       // Lista de roles que pueden acceder aunque no haya empresas
        //const allowedSystemRoles = ['Administrador',]; // Ajusta según tus nombres reales

        // Si no hay empresa asignada, verificar si el rol permite acceso global
        if (!companyData) {
          const allCompanies = await Company.findAll({ 
            attributes: ['id', 'name', 'rut', 'address', 'phone', 'image'] 
          });
          companyData = allCompanies[0].get({ plain: true });
          logger.info(`Usuario sin compañía asignada. Usando compañía única del sistema: ${companyData.name}`);
          /*if (!allowedSystemRoles.includes(roleName)) {
            return res.status(400).json({ msg: "No tiene acceso: no pertenece a ninguna empresa y su rol no permite acceso global." });
          }*/
          // Si el rol SÍ está permitido, continuar sin companyData (puede ser null)
          logger.info(`Acceso global permitido para rol: ${roleName}`);
        }

              
      // Obtener los permisos del rol del sistema
      systemRolePermissions = user.worker.role.permissions.map(
        (permission) => {
          return `${permission.name}, ${permission.module}`;
        }
      );
      }
      // Construimos el objeto del usuario con la estructura deseada
      const userNew = {
        id: user.id, // ID del usuario
        email: user.email, // Correo del usuario
        name: user.name,
        worker: {
          id: user.worker.id,
          name: user.worker.name,
          email: user.worker.email,
          image: user.worker.image,
          user_id: user.worker.user_id,
        },
      };

      // Creamos el token con el objeto estructurado
      const token = jwt.sign({ user: userNew }, authConfig.secret, {
        expiresIn: authConfig.expires, // Tiempo de expiración del token
      });
      // Decodificar el token para obtener la fecha de expiración
      const decoded = jwt.decode(token);

      // La fecha de expiración está en el campo 'exp' del JWT
      const expiresAt = new Date(decoded.exp * 1000); // 'exp' es en segundos, así que lo convertimos a milisegundos

      // Guardar el token en la base de datos
      await UserToken.create({
        user_id: user.id,
        token: token,
        expires_at: expiresAt,
      });

      // Combinar los permisos y eliminar duplicados usando un Set
      const allPermissions = [
        ...new Set([...systemRolePermissions, ...branchRolePermissions]),
      ];

      // Respuesta exitosa
      res.status(201).json({
        id: user.id,
        userName: user.name,
        email: user.email,
        token: token,
        name: user.worker.name,
        workerId: user.worker.id,
        image: user.worker.image,
        roleId: role_id,
        nameRole: roleName,
        branch: branchData,
        company: companyData,
        permissions: allPermissions, // Permisos combinados y sin duplicados
      });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("Error al loguear usuario: " + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  async login_apk(req, res) {
    logger.info("Entrando a loguearse APk");
    const platform = (req.body.platform || '').trim().toLowerCase();
    try {
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { email: req.body.email }, // Puede ser el correo
            { name: req.body.email }, // O puede ser el nombre de usuario
          ],
        },
        include: [
          {
            model: Worker,
            as: "worker",
            attributes: ["id", "name", "email", "image", "role_id"],
            include: [
              {
                model: Role,
                as: "role",
                attributes: ["id", "name"],
                include: [
                  {
                    model: Permission,
                    as: "permissions", // Asumiendo que la relación se llama "permissions"
                    attributes: ["name", "module"], // Incluir el nombre y la descripción del permiso
                    through: { attributes: [] }, // Excluir la tabla intermedia si no necesitas sus atributos
                  },
                ],
              },
              {
                model: BranchWorker,
                as: "branchWorkers",
                include: [
                  {
                    model: Branch,
                    as: "branch",
                    include: {
                      model: Company,
                      as: "company",
                    },
                  },
                  {
                    model: Role,
                    as: "role", // Asumiendo que la relación se llama "permissions"
                    attributes: ["id", "name"],
                     include: [
                      {
                        model: Permission,
                        as: "permissions", // Asumiendo que la relación se llama "permissions"
                        attributes: ["name", "module"], // Incluir el nombre y la descripción del permiso
                        through: { attributes: [] }, // Excluir la tabla intermedia si no necesitas sus atributos
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            model: Company,
            as: "companies",
            attributes: ["id", "name", "image"],
          },
        ],
      });
      if (!user) {
        return res.status(204).json({ msg: "Usuario no encontrado" });
      }
      // Verificar si el campo password es nulo o vacío
      if (!user.password || user.password === "") {
        return res.status(400).json({ msg: "Credenciales inválidas" });
      }

      if (!user.worker || !user.worker.branchWorkers || user.worker.branchWorkers.length === 0) {
        return res.status(400).json({
          msg: "El usuario no está asociado a ninguna sucursal."
        });
      }

      // Extraer todos los nombres de permisos del usuario (rol global + roles por sucursal)
      const userPermissionNames = new Set([
        // Permisos del rol global del trabajador
        ...(user.worker.role?.permissions?.map(p => p.name) || []),
        // Permisos de roles en cada sucursal asignada
        ...user.worker.branchWorkers.flatMap(bw => 
          bw.role?.permissions?.map(p => p.name) || []
        )
      ]);

      // Validar según la plataforma
      if (platform === 'buscheck') {
        if (!userPermissionNames.has('view_checktickets')) {
          return res.status(400).json({
            msg: "No tiene permiso para acceder a la aplicación BusCheck."
          });
        }
      } else if (platform === 'busgo') {
        const allowedPermissions = [
          'view_ticketsdate',
          'view_tickettripsdate',
          'view_tripsworker',
          'view_saletickets'
        ];

        // Verificar si el usuario tiene AL MENOS UNO de los permisos permitidos
        const hasAtLeastOne = allowedPermissions.some(perm => userPermissionNames.has(perm));

        if (!hasAtLeastOne) {
          return res.status(400).json({
            msg: "No tiene permisos suficientes para acceder a la aplicación BusGo. Contacte al administrador."
          });
        }
      }

      const isMatch = await bcrypt.compare(req.body.password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: "Credenciales inválidas" });
      }

      let systemRolePermissions = [];
      let branchRolePermissions = [];
      systemRolePermissions = user.worker.role.permissions.map(
        (permission) => {
          return `${permission.name}`;
        }
      );

      branchRolePermissions = user.worker.branchWorkers.flatMap(
        (branchWorker) => {
          return branchWorker.role.permissions.map((permission) => {
            return `${permission.name}`;
          });
        }
      );
      // Construimos el objeto del usuario con la estructura deseada
      const userNew = {
        id: user.id, // ID del usuario
        email: user.email, // Correo del usuario
        name: user.name,
        worker: {
          id: user.worker.id,
          name: user.worker.name,
          email: user.worker.email,
          image: user.worker.image,
          user_id: user.worker.user_id,
        },
      };

      // Creamos el token con el objeto estructurado
      const token = jwt.sign({ user: userNew }, authConfig.secret, {
        expiresIn: authConfig.expires, // Tiempo de expiración del token
      });
      // Decodificar el token para obtener la fecha de expiración
      const decoded = jwt.decode(token);

      // La fecha de expiración está en el campo 'exp' del JWT
      const expiresAt = new Date(decoded.exp * 1000); // 'exp' es en segundos, así que lo convertimos a milisegundos

      // Guardar el token en la base de datos
      await UserToken.create({
        user_id: user.id,
        token: token,
        expires_at: expiresAt,
      });

      let branchData = [];
      let roleData = [];
      if (user.worker.branchWorkers && user.worker.branchWorkers.length > 0) {
        const branchWorker = user.worker.branchWorkers[0];
        branchData = { ...branchWorker.branch.get({ plain: true }) }; // Clonamos el branch (evita mutaciones inesperadas)
        branchData.rut = branchWorker.branch.company?.rut || null;   // Añadimos el rut de la company
        roleData = branchWorker.role;
      }

      const allPermissions = [
        ...new Set([...systemRolePermissions, ...branchRolePermissions]),
      ];

      const allPermissionNames = new Set([
        ...user.worker.role.permissions.map(p => p.name),
        ...user.worker.branchWorkers.flatMap(bw => bw.role.permissions.map(p => p.name))
      ]);
      // Respuesta exitosa
      res.status(201).json({
        id: user.id,
        userName: user.name,
        email: user.email,
        token: token,
        name: user.worker.name,
        workerId: user.worker.id,
        image: user.worker.image,
        roleId: roleData ? roleData.id : user.worker.role_id,
        nameRole: roleData ? roleData.name : user.worker.role.name,
        branch: branchData,
        permissions: allPermissions,
      });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";

      logger.error("Error al loguear usuario: " + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  async logout(req, res) {
    logger.info(`${req.user.name} - Cierra sessión`);

    try {
      const token = req.headers["authorization"]?.split(" ")[1]; // Obtener el token del encabezado Authorization

      if (!token) {
        return res.status(400).json({ msg: "No token proporcionado" });
      }

      // Marcar el token como revocado directamente en la base de datos
      const [updated] = await UserToken.update(
        { revoked: true },
        { where: { token }, returning: true }
      );

      if (updated === 0) {
        return res
          .status(400)
          .json({ msg: "Token no encontrado o ya revocado" });
      }

      // Responder al cliente
      res.status(200).json({ msg: "Logout exitoso" });
    } catch (err) {
      logger.error("Error al hacer logout: " + err.message);
      res.status(500).json({ error: "Error en el servidor" });
    }
  },

  async updatePassword(req, res) {
    logger.info(
      `${req.user.name} - Actualiza la contraseña del userID ${req.body.id}`
    );
    try {
      const { id, currentPassword, newPassword } = req.body;

      // Verificar que el usuario existe
      const user = await User.findByPk(id);

      if (!user) {
        return res.status(400).json({ msg: "Usuario no encontrado" });
      }

        // Si se proporciona currentPassword, validarla
    if (currentPassword) {
      const passwordMatch = bcrypt.compareSync(currentPassword, user.password);

      if (!passwordMatch) {
        return res.status(400).json({
          msg: "La contraseña actual no es correcta.",
          details: "La contraseña actual no es correcta.",
        });
      }
    }

      // Encriptar la nueva contraseña
      const hashedNewPassword = bcrypt.hashSync(
        newPassword,
        Number.parseInt(authConfig.rounds)
      );

      // Actualizar la contraseña
      await user.update({ password: hashedNewPassword });

      res.status(200).json({ msg: "Contraseña actualizada correctamente." });
    } catch (err) {
      logger.error("Error al actualizar la contraseña: " + err.message);
      res.status(500).json({ error: "Error en el servidor" });
    }
  },
};

module.exports = AuthController;

const { Op } = require("sequelize");
const {
  User,
  UserToken,
  Worker,
  BranchWorker,
  Branch,
  Role,
  Company,
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
        include: [{
          model: Worker,
          as: "worker",
          attributes: ["id", "name", "email", "image", "role_id"],
          include: [
            {
              model: Role,
              as: "role",
              attributes: ["id", "name"],
            },
            {
              model: BranchWorker,
              as: "branchWorkers",
              include: {
                model: Branch,
                as: "branch",
                attributes: ["id", "name", "image"],
                include: {
                  model: Company,
                  as: "company",
                  attributes: ["id", "name", "image"],
                },
              },
            },
          ],
        },
        {
          model: Company,
          as: "companies",
          attributes: ["id", "name", "image"],
        }
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
      if (req.body.branch_id) {
        branchData = user.worker.branchWorkers.find(
          (branchWorker) => branchWorker.branch.id === req.body.branch_id
        )?.branch;

        if (!branchData) {
          return res
            .status(400)
            .json({ msg: "No es usuario de esta Sucursal" });
        }
        companyData = branchData.company;
      } else {
        // Asignar la primera compañía a companyData
        companyData = user.companies ? user.companies[0] : [];
        if (!companyData) {
          return res
            .status(400)
            .json({ msg: "No es usuario de esta Empresa" });
        }
      }
      // Construimos el objeto del usuario con la estructura deseada
      const userNew = {
        id: user.id, // ID del usuario
        email: user.email, // Correo del usuario
        name: user.name,
        worker: user.worker,
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

      // Respuesta exitosa
      res.status(201).json({
        id: user.id,
        userName: user.name,
        email: user.email,
        token: token,
        name: user.worker.name,
        workerId: user.worker.id,
        image: user.worker.image,
        roleId: user.worker.role_id,
        nameRole: user.worker.role.name,
        branch: branchData,
        company: companyData,
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

    try {
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { email: req.body.email }, // Puede ser el correo
            { name: req.body.email }, // O puede ser el nombre de usuario
          ],
        },
        include: {
          model: Worker,
          as: "worker",
          attributes: ["id", "name", "email", "image", "role_id"],
          include: {
            model: Role,
            as: "role",
            attributes: ["id", "name"],
          },
        },
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

      // Construimos el objeto del usuario con la estructura deseada
      const userNew = {
        id: user.id, // ID del usuario
        email: user.email, // Correo del usuario
        name: user.name,
        worker: user.worker,
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

      // Respuesta exitosa
      res.status(201).json({
        id: user.id,
        userName: user.name,
        email: user.email,
        token: token,
        name: user.worker.name,
        workerId: user.worker.id,
        image: user.worker.image,
        roleId: user.worker.role_id,
        nameRole: user.worker.role.name,
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

      // Validar la contraseña actual para cuentas estándar
      const passwordMatch = bcrypt.compareSync(currentPassword, user.password);

      if (!passwordMatch) {
        return res.status(400).json({
          msg: "La contraseña actual no es correcta.",
          details: "La contraseña actual no es correcta.",
        });
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

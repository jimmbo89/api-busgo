const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");
const { Worker, User, Role } = require("../models");
const logger = require("../../config/logger"); // Logger para seguimiento
const bcrypt = require("bcrypt");
const authConfig = require("../../config/auth");
const ImageService = require("../services/ImageService");
const BranchWorkerRepository = require("./BranchWorkerRepository");

const WorkerRepository = {
  // Obtener todos los trabajadores
  async findAll() {
    return await Worker.findAll({
      attributes: [
        "id",
        "user_id",
        "name",
        "email",
        "image",
        "rut",
        "address",
        "phone",
        "role_id",
      ],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name"], // Atributos del modelo User
        },
        {
          model: Role,
          as: "role", // Incluir el usuario asociado
          attributes: ["id", "name"], // Solo incluir los atributos necesarios de `users`
        },
      ],
    });
  },

  // Buscar un trabajador por ID
  async findById(id) {
    return await Worker.findByPk(id, {
      attributes: [
        "id",
        "user_id",
        "name",
        "email",
        "image",
        "rut",
        "address",
        "phone",
        "role_id",
      ],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name"], // Atributos del modelo User
        },
        {
          model: Role,
          as: "role", // Incluir el usuario asociado
          attributes: ["id", "name"], // Solo incluir los atributos necesarios de `users`
        },
      ],
    });
  },

  // Método para comprobar si el email o el rut ya existen, excluyendo un trabajador específico si es necesario
  async existsByEmailOrRut(email, rut, user, excludeId = null, userId = null) {
    logger.info( "Verificando existencia por email, RUT o usuario en el repositorio");

    let workerExists = null;
    let userExists = null;

    // Construir cláusula WHERE para `Worker` solo si hay `email` o `rut`
    if (email || rut) {
        const workerWhereClause = {};
        if (email) workerWhereClause.email = email;
        if (rut) workerWhereClause.rut = rut;
        if (excludeId) workerWhereClause.id = { [Op.ne]: excludeId }; // Excluir el ID actual

        workerExists = await Worker.findOne({ where: workerWhereClause });
    }

    // Construir cláusula WHERE para `User` solo si hay `user`
    if (user) {
        const userWhereClause = {};
        userWhereClause.name = user;
        if (userId) userWhereClause.id = { [Op.ne]: userId }; // Excluir el ID del usuario actual

        userExists = await User.findOne({ where: userWhereClause });
    }

    // Retornar true si alguna de las consultas encuentra un registro
    return !!workerExists || !!userExists;
  },

  // Crear un nuevo trabajador con manejo de imágenes
  async create(body, file, t) {
    try {
      let { user_id, name, email, rut, address, phone, role_id } = body;

      // Generar un hashSync de la contraseña
      let hashedPassword = bcrypt.hashSync(
        body.password,
        Number.parseInt(authConfig.rounds)
      );

      const extractedName = body.user ? body.user : body.email.split("@")[0];

      // Crear el usuario con la contraseña encriptada
      const user = await User.create(
        {
          name: extractedName,
          email: body.email,
          password: hashedPassword,
        },
        { transaction: t }
      );

      user_id = user.id;

      // Crear el trabajador (worker)
      const worker = await Worker.create(
        {
          user_id,
          name,
          email,
          rut,
          role_id,
          address,
          phone,
          image: "workers/default.jpg",
        },
        { transaction: t }
      );

      // Manejar archivo si se proporciona
      if (file) {
        const newFilename = ImageService.generateFilename(
          "workers",
          worker.id,
          file.originalname
        );
        worker.image = await ImageService.moveFile(file, newFilename);
        await worker.update({ image: worker.image }, { transaction: t });
      }

      return worker;
    } catch (error) {
      // Manejar errores
      logger.error("Error al crear usuario o trabajador:", error);
      throw new Error(
        "No se pudo crear el usuario o trabajador. Intenta nuevamente."
      );
    }
  },

  // Actualizar un trabajador con manejo de imágenes
  async update(worker, body, file) {
    const fieldsToUpdate = [
      "user_id",
      "role_id",
      "name",
      "email",
      "rut",
      "address",
      "phone",
      "image",
    ];

    const updatedData = Object.keys(body)
      .filter((key) => fieldsToUpdate.includes(key) && body[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

       // 👇 Detectar si role_id está siendo actualizado
    const isRoleIdChanging = updatedData.hasOwnProperty('role_id') && updatedData.role_id !== worker.role_id;

    // Actualizar email y/o user en la tabla users si están en el body
    if (body.email || body.user) {
      logger.info("entra a actualizar los datos de user");
      const user = await User.findByPk(body.user_id);
      if (user) {
        const userUpdates = {};
        if (body.email) {
          userUpdates.email = body.email;
        }
        if (body.user) {
          userUpdates.name = body.user;
        }
        await user.update(userUpdates);
        logger.info(
          `Datos actualizados en la tabla users (ID: ${
            worker.user_id
          }): ${JSON.stringify(userUpdates)}`
        );
      }
    }

    if (file) {
      if (worker.image && worker.image !== "workers/default.jpg") {
        await ImageService.deleteFile(worker.image);
      }

      const newFilename = ImageService.generateFilename(
        "workers",
        worker.id,
        file.originalname
      );
      updatedData.image = await ImageService.moveFile(file, newFilename);
    }

    if (Object.keys(updatedData).length > 0) {
      await worker.update(updatedData);
      logger.info(`Trabajador actualizado exitosamente (ID: ${worker.id})`);
    }

    if (isRoleIdChanging) {
      const newRoleId = updatedData.role_id;
      await BranchWorkerRepository.updateRoleForWorker(worker.id, newRoleId);
      logger.info(`Rol actualizado en branch_worker para trabajador ID ${worker.id} → role_id: ${newRoleId}`);
    }

    return worker;
  },

  // Eliminar un trabajador
  async delete(worker) {
    if (worker.image && worker.image !== "workers/default.jpg") {
      await ImageService.deleteFile(worker.image);
    }
    const user = await User.findByPk(worker.user_id);
    await worker.destroy();
    return await user.destroy();
  },
};

module.exports = WorkerRepository;

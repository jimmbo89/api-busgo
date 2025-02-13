const logger = require("../../config/logger");
const {
  NotificationRepository,
  UserRepository,
  BranchRepository,
  WorkerRepository,
} = require("../repositories");

const NotificationController = {
  /*async sendNotification(req, res) {
    try {
      const home = await BranchRepository.findById(req.body.branch_id);
      if (!home) {
        logger.error(
          `FileController->store: Sucursal no encontrada con ID ${home_id}`
        );
        return res.status(404).json({ msg: "BranchNotFound" });
      }
      //logger.info(`${req.user.name} - Entra a enviar notificación`);
      const { tokens, userTokens } =
        await UserRepository.getUserNotificationTokens();

      //return res.status(200).json({ tokens: tokens, userTokens: userTokens });
      if (!tokens.length) {
        return res
          .status(404)
          .json({ message: "No se encontraron tokens de notificación" });
      }

      // Construir el body para la notificación
      const notificationPayload = {
        token: tokens,
        notification: {
          title: req.body.title || "Sin título",
          body: req.body.body || "Sin contenido",
        },
        data: {
          route: req.body.route || "/",
          home_id: home.id,
          nameHome: home.name,
        },
      };
      const firebaseResult = await NotificationRepository.sendNotification(
        notificationPayload
      );

      // Verificar cuáles tokens recibieron una respuesta exitosa
      if (firebaseResult && firebaseResult.success) {
        const successfulTokens = tokens; // Firebase no devuelve tokens fallidos en un 200

        // Registrar cada notificación enviada correctamente en la base de datos
        const notificationsToCreate = userTokens
          .filter((user) => successfulTokens.includes(user.firebaseId)) // Solo los tokens que se enviaron bien
          .map((user) => ({
            home_id: req.body.home_id,
            user_id: user.user_id,
            title: req.body.title,
            description: req.body.body,
            data: JSON.stringify(notificationPayload.data),
            route: req.body.route,
            firebaseId: user.firebaseId,
          }));

        // Insertar las notificaciones en la base de datos
        await Promise.all(
          notificationsToCreate.map((notification) =>
            NotificationRepository.create(notification)
          )
        );
      }

      return res.status(firebaseResult.success ? 200 : 500).json({
        message: firebaseResult.success
          ? "Notificación enviada y guardada"
          : "Error al enviar la notificación",
        firebaseResponse: firebaseResult.success
          ? firebaseResult.response
          : null,
        error: firebaseResult.success ? null : firebaseResult.error,
      });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error(
        "Error en NotificationController->sendNotification: " + errorMsg
      );

      return res.status(500).json({
        message: "Error interno en el servidor",
        error: errorMsg,
      });
    }
  },*/

  async store(req, res) {
    logger.info(`${req.user.name} - Crea una nueva notificación`);
    logger.info("Datos recibidos al crear una notificación:");
    logger.info(JSON.stringify(req.body));

    const {
      branch_id,
      worker_id,
      title,
      description,
      data,
      route,
      status,
      firebaseId,
    } = req.body;

    try {
      // Verificar si la sucursal existe (opcional, dependiendo de tu lógica de negocio)
      const branch = await BranchRepository.findById(branch_id);
      if (!branch) {
        return res
          .status(404)
          .json({ error: "BranchNotFound", details: "La sucursal no existe" });
      }

      // Verificar si el trabajador existe (opcional, dependiendo de tu lógica de negocio)
      const worker = await WorkerRepository.findById(worker_id);
      if (!worker) {
        return res
          .status(404)
          .json({
            error: "WorkerNotFound",
            details: "El trabajador no existe",
          });
      }

      const notificación = await NotificationRepository.create(req.body);

      // Responder con la notificación creada
      res.status(201).json({ notification: notificación });
    } catch (error) {
      const errorMsg = error.message || "Error desconocido";
      logger.error("NotificationController->store: " + errorMsg);
      return res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  async getUserNotifications(req, res) {
    logger.info(`${req.user.name} - Buscando las notificaciones`);
    try {
      const userId = req.user.id; // ID del usuario autenticado
      const { limit = 5, cursor } = req.body;

      const { notifications, hasMore, nextCursor } =
        await NotificationRepository.getUserNotifications(
          userId,
          limit,
          cursor
        );

      res.json({
        notifications,
        hasMore,
        nextCursor,
      });
    } catch (error) {
      res.status(500).json({ error: "Error fetching notifications" });
    }
    /*try {
      const userId = req.user.id; // Obtener el ID del usuario autenticado
  
      const notifications = await NotificationRepository.getUserNotifications(userId);
  
      return res.status(200).json({ notifications:notifications });
    } catch (error) {
      const errorMsg = error.details?.map(detail => detail.message).join(", ") || error.message;
      logger.error("NotificationController->getUserNotifications: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }*/
  },
};

module.exports = NotificationController;

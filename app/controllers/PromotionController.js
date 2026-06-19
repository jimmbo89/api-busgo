const logger = require("../../config/logger"); // Importa el logger
const { PromotionRepository } = require("../repositories");

const PromotionController = {
  // Listar promociones
  async index(req, res) {
    logger.info(`${req.user.name} - Accediendo a la lista de promociones`);

    try {
      const promotions = await PromotionRepository.findAll();
      const mappedPromotions = promotions.map((promotion) => ({
        ...promotion.toJSON(),
        discountType: promotion.discount_type,
      }));
      res.status(200).json({ promotions: mappedPromotions });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error("Error en PromotionController->index: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  async index_true(req, res) {
    logger.info(`${req.user.name} - Accediendo a la lista de promociones activas`);

    try {
      const promotions = await PromotionRepository.findByActiveStatus(true);
      const mappedPromotions = promotions.map((promotion) => ({
        ...promotion.toJSON(),
        discountType: promotion.discount_type,
      }));
      res.status(200).json({ promotions: mappedPromotions });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error("Error en PromotionController->index: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Crear una nueva promoción
  async store(req, res) {
    logger.info(`${req.user.name} - Creando una nueva promoción`);

    const existingPromotion = await PromotionRepository.existsByName(
      req.body.name
    );

    if (existingPromotion) {
      logger.error("El nombre de Promoción ya existe:" + req.body.name);
      return res
        .status(400)
        .json({
          error: "DuplicateName",
          msg: "El nombre de la promoción ya existe.",
        });
    }

    try {
      const promotion = await PromotionRepository.create(req.body);
      res.status(201).json({
        msg: "PromotionCreated",
        promotion: {
          ...promotion.toJSON(),
          discountType: promotion.discount_type,
        },
      });
    } catch (error) {
      logger.error("Error en PromotionController->store: " + error.message);
      res.status(500).json({ error: "ServerError" });
    }
  },

  // Mostrar una promoción específica
  async show(req, res) {
    logger.info(`${req.user.name} - Accediendo a una promoción específica`);

    try {
      const promotion = await PromotionRepository.findById(req.body.id);
      if (!promotion) {
        return res.status(204).json({ msg: "PromotionNotFound" });
      }

      res.status(200).json({
        promotion: {
          ...promotion.toJSON(),
          discountType: promotion.discount_type,
        },
      });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error("PromotionController->show: " + errorMsg);
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Actualizar una promoción
  async update(req, res) {
    logger.info(`${req.user.name} - Editando una promoción`);
    const { name, id} = req.body;
    try {
      const promotion = await PromotionRepository.findById(req.body.id);
      if (!promotion) {
        return res.status(204).json({ msg: "PromotionNotFound" });
      }

      if (name) {
        const existingPromotion = await PromotionRepository.existsByName(name, id);

        if (existingPromotion) {
          logger.error("El nombre ya esxiste en otra promoción:" + name);
          return res
            .status(400)
            .json({
              error: "DuplicateName",
              msg: "El nombre ya existe en otra promoción.",
            });
        }
      }

      const promotionUpdate = await PromotionRepository.update(
        promotion,
        req.body
      );

      res.status(200).json({
        msg: "PromotionUpdated",
        promotionUpdate: {
          ...promotionUpdate.toJSON(),
          discountType: promotionUpdate.discount_type,
        },
      });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error(
        `PromotionController->update: Error al actualizar la promoción: ${errorMsg}`
      );
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Eliminar una promoción
  async destroy(req, res) {
    logger.info(`${req.user.name} - Eliminando una promoción`);

    try {
      const promotion = await PromotionRepository.findById(req.body.id);
      if (!promotion) {
        return res.status(204).json({ msg: "PromotionNotFound" });
      }

      await PromotionRepository.delete(promotion);
      res.status(200).json({ msg: "PromotionDeleted" });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error(
        `PromotionController->destroy: Error al eliminar la promoción: ${errorMsg}`
      );
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },

  // Obtener promociones por estado activo
  async getPromotionsByActiveStatus(req, res) {
    logger.info(`${req.user.name} - Buscando promociones por estado activo`);

    try {
      const { active } = req.body; // Supongamos que el estado activo viene en el cuerpo de la solicitud
      const promotions = await PromotionRepository.findByActiveStatus(active);

      if (!promotions || promotions.length === 0) {
        return res
          .status(404)
          .json({
            message:
              "No se encontraron promociones para el estado especificado.",
          });
      }

      const mappedPromotions = promotions.map((promotion) => ({
        ...promotion.toJSON(),
        discountType: promotion.discount_type,
      }));

      return res.status(200).json({ promotions: mappedPromotions });
    } catch (error) {
      const errorMsg = error.details
        ? error.details.map((detail) => detail.message).join(", ")
        : error.message || "Error desconocido";
      logger.error(
        "PromotionController->getPromotionsByActiveStatus: " + errorMsg
      );
      res.status(500).json({ error: "ServerError", details: errorMsg });
    }
  },
};

module.exports = PromotionController;

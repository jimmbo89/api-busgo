const { Op } = require('sequelize');
const logger = require('../../config/logger'); // Logger para seguimiento
const { Route, Location } = require('../models'); // Importar los modelos necesarios
const { RouteRepository, BranchRepository, BranchRouteRepository, LocationRepository } = require('../repositories');

const RouteController = {
    // Obtener todas las rutas
    async index(req, res) {
        logger.info(`${req.user.name} - Entra a buscar las rutas`);

        try {
            const routes = await RouteRepository.findAll();
            
            if (!routes.length) {
                return res.status(204).json({ msg: 'RoutesNotFound' });
            }
            
            // Mapear las rutas para devolver el formato requerido
            const mappedRoutes = routes.map(route => {
                return {
                    id: route.id,
                    name: route.name,
                    originId: route.origin_id,  // Cambiar el nombre del id de origen
                    origin_id: route.origin_id,  // Cambiar el nombre del id de origen
                    destinationId: route.destination_id,  // Cambiar el nombre del id de destino
                    destination_id: route.destination_id,  // Cambiar el nombre del id de destino
                    distance: route.distance,
                    estimated: route.estimated,
                    status: route.status,
                    originAddress: route.origin.address,  // Incluir solo la dirección de origen
                    originImage: route.origin.image,  // Incluir solo la dirección de origen
                    destinationAddress: route.destination.address,  // Incluir solo la dirección de destino
                    destinationImage: route.destination.image,  // Incluir solo la dirección de destino
                };
            });
            
            res.status(200).json({ routes: mappedRoutes });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->index:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

  // 👇 Nuevo: Obtener rutas disponibles según branch
  async getAvailableRoutesByBranch(req, res) {
    const { branch_id } = req.body;

    logger.info(`${req.user.name} - Buscando rutas disponibles para la branch ${branch_id}`);

    try {
      // 1. Buscar rutas asociadas a la branch
      const associatedRoutes = await RouteRepository.findAssociatedRoutesByBranchId(branch_id);

      let routesToReturn;

      if (associatedRoutes.length > 0) {
        logger.info("Hay rutas asociadas a la branch");
        // Caso 1: Tiene rutas → obtener todas las rutas con esos origin_id
        const originIds = [...new Set(associatedRoutes.map(r => r.origin_id))];
        routesToReturn = await RouteRepository.findByOriginIds(originIds);
      } else {
        logger.info("No hay rutas asociadas a la branch");
        // Caso 2: No tiene rutas → obtener rutas con origin_id no usado por ninguna branch
        routesToReturn = await RouteRepository.findRoutesWithUnusedOrigins();
        logger.info(JSON.stringify(routesToReturn));
      }

      // Si no hay rutas
      if (!routesToReturn.length) {
        return res.status(204).json({ msg: 'RoutesNotFound' });
      }

      // Mapear al formato común
      const mappedRoutes = routesToReturn.map(route => ({
        id: route.id,
        name: route.name,
        originId: route.origin_id,
        origin_id: route.origin_id,
        destinationId: route.destination_id,
        destination_id: route.destination_id,
        distance: route.distance,
        estimated: route.estimated,
        status: route.status,
        originAddress: route.origin.address,
        originImage: route.origin.image,
        destinationAddress: route.destination.address,
        destinationImage: route.destination.image,
      }));

      res.status(200).json({ routes: mappedRoutes });

    } catch (error) {
      const errorMsg = error.message || 'Error desconocido';
      logger.error('RouteController->getAvailableRoutesByBranch: ' + errorMsg);
      return res.status(500).json({ error: 'ServerError', details: errorMsg });
    }
  },

    // Crear una nueva ruta
    async store(req, res) {
        logger.info(`${req.user.name} - Crea una nueva ruta`);
        logger.info('Datos recibidos al crear una ruta:');
        logger.info(JSON.stringify(req.body));

        const { name, origin_id, destination_id, distance, estimated, status, branch_id, route_id, price } = req.body;

        try {
            const originLocation = await Location.findByPk(origin_id);
            if (!originLocation) {
                return res.status(404).json({ msg: 'OriginLocationhNotFound' });
            }

            const destinationLocation = await Location.findByPk(destination_id);
            if (!destinationLocation) {
                return res.status(404).json({ msg: 'DestinationLocationNotFound' });
            }

            const branch = await BranchRepository.findById(branch_id);
            if (!branch) {
                logger.error(`BranchRouteController->store: Sucursal no encontrada con ID ${branch_id}`);
                return res.status(404).json({ msg: 'BranchNotFound' });
            }

            if (route_id) {
                const routeId = await RouteRepository.findById(route_id);
            if (!routeId) {
                logger.error(`BranchRouteController->store: Ruta no encontrada con ID ${route_id}`);
                return res.status(404).json({ msg: 'RouteNotFound' });
            }
            }
            

            const route = await RouteRepository.create(req.body);

            req.body.route_id = route.id;
            const branchRoute = await BranchRouteRepository.create(req.body);
            res.status(201).json({ route: route, branchRoute: branchRoute });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->store:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Obtener una ruta por ID
    async show(req, res) {
        logger.info(`${req.user.name} - Busca una ruta con ID ${req.body.id}`);

        try {
            const route = await Route.findByPk(req.body.id, {
                attributes: ['id', 'name', 'origin_id', 'destination_id', 'distance', 'estimated', 'status'],
                include: [
                    {
                        model: Location,
                        as: 'origin',
                        attributes: ['address', 'image'], // Incluir solo la dirección del origen
                    },
                    {
                        model: Location,
                        as: 'destination',
                        attributes: ['address', 'image'], // Incluir solo la dirección del destino
                    },
                ],
            });
    
            if (!route) {
                return res.status(404).json({ msg: 'RouteNotFound' });
            }
    
            // Mapear los datos para devolver solo lo necesario
            const mappedRoute = {
                id: route.id,
                name: route.name,
                originId: route.origin_id,  // Cambiar el nombre del id de origen
                destinationId: route.destination_id,  // Cambiar el nombre del id de destino
                distance: route.distance,
                estimated: route.estimated,
                status: route.status,
                originAddress: route.origin.address,  // Incluir solo la dirección de origen
                destinationAddress: route.destination.address,  // Incluir solo la dirección de destino
            };
    
            res.status(200).json({ route: mappedRoute });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->show:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Actualizar una ruta
    async update(req, res) {
        logger.info(`${req.user.name} - Actualiza la ruta con ID ${req.body.id}`);
        logger.info('Datos recibidos al editar una ruta:');
        logger.info(JSON.stringify(req.body));

        const { id, name, origin_id, destination_id, distance, estimated, status, route_id, branch_id, price } = req.body;

        try {
            let branchroute = await BranchRouteRepository.findById(id);
            if (!branchroute) {
                return res.status(404).json({ msg: 'BranchRouteNotFound' });
            }

            if (origin_id) {
                const originLocation = await LocationRepository.findById(origin_id);
                if (!originLocation) {
                    return res.status(404).json({ msg: 'OriginLocationNotFound' });
                }
            }

            if (destination_id) {
                const destinationLocation = await LocationRepository.findById(
                  destination_id
                );
                if (!destinationLocation) {
                    return res.status(404).json({ msg: 'DestinationLocationNotFound' });
                }
            }

            //if (route_id) {
                const route = await RouteRepository.findById(branchroute.route_id);
            if (!route) {
                logger.error(`BranchRouteController->update: Ruta no encontrada con ID ${branchroute.route_id}`);
                return res.status(404).json({ msg: 'RouteNotFound' });
            }
            //}
        
            // 5. Preparar datos para actualizar Route
        const routeData = {};
        if (name !== undefined) routeData.name = name;
        if (origin_id !== undefined) routeData.origin_id = origin_id;
        if (destination_id !== undefined) routeData.destination_id = destination_id;
        if (distance !== undefined) routeData.distance = distance;
        if (estimated !== undefined) routeData.estimated = estimated;
        if (status !== undefined) routeData.status = status;

        // 6. Actualizar la ruta si hay datos relevantes
        let routeUpdate = null;
        if (Object.keys(routeData).length > 0) {
            routeUpdate = await RouteRepository.update(route, routeData);
        } else {
            routeUpdate = route; // No hubo cambios
        }

        // 7. Preparar datos para actualizar BranchRoute
        const branchRouteData = {};
        if (price !== undefined) branchRouteData.price = price;
        if (route_id !== undefined) branchRouteData.route_id = route_id; // ¿cambiar a otra ruta?
        // Nota: branch_id normalmente no se cambia

        // 8. Actualizar BranchRoute si hay datos
        let updatedBranchRoute = branchroute;
        if (Object.keys(branchRouteData).length > 0) {
            updatedBranchRoute = await BranchRouteRepository.update(branchroute, branchRouteData);
        }

        // 9. Respuesta exitosa
        return res.status(200).json({
            route: routeUpdate,
            branchroute: updatedBranchRoute
        });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->update:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Eliminar una ruta
    async destroy(req, res) {
        logger.info(`${req.user.name} - Elimina la ruta con ID ${req.body.id}`);

        try {
            const branchroute = await BranchRouteRepository.findById(req.body.id);

            if (!branchroute) {
                return res.status(404).json({ msg: 'RouteNotFound' });
            }

            const { route_id } = branchroute;
            await branchroute.destroy();
            const route = await RouteRepository.findById(route_id);
             await route.destroy();
            res.status(200).json({ msg: 'RouteDeleted' });
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido';
            logger.error('RouteController->destroy:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },
};

module.exports = RouteController;

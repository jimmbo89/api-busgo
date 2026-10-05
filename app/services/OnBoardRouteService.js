'use strict';

const {
  BranchVehicleRepository,
  BranchRouteRepository,
  VehicleRoutePreferenceRepository,
} = require('../repositories');
const OnBoardContextService = require('./OnBoardContextService');
const OnBoardCommercialService = require('./OnBoardCommercialService');

const mapBranch = (branch) => branch
  ? {
      id: branch.id,
      name: branch.name,
      image: branch.image,
      address: branch.address,
    }
  : null;

const mapRoute = (route) => ({
  id: route.id,
  route_id: route.id,
  code: route.code,
  route_code: route.code,
  name: route.name,
  estimated: route.estimated,
  origin_id: route.origin_id,
  destination_id: route.destination_id,
  distance: route.distance,
  status: route.status,
  origin: route.origin
    ? {
        id: route.origin.id,
        address: route.origin.address,
        image: route.origin.image,
      }
    : null,
  destination: route.destination
    ? {
        id: route.destination.id,
        address: route.destination.address,
        image: route.destination.image,
      }
    : null,
});

const buildAvailableRoutes = async ({ context, branchIds = null }) => {
    const branchVehicles = await BranchVehicleRepository.findByVehicle(context.vehicle.id);
    const selectedBranchIds = branchIds
      ? new Set(branchIds.map((branchId) => Number(branchId)))
      : null;
    const branchesById = new Map();

    for (const branchVehicle of branchVehicles) {
      if (
        selectedBranchIds &&
        !selectedBranchIds.has(Number(branchVehicle.branch_id))
      ) {
        continue;
      }

      const branch = mapBranch(branchVehicle.branch);
      if (branch) {
        branchesById.set(Number(branch.id), branch);
      }
    }

    const [branchRoutes, preferencesByBranch] = await Promise.all([
      BranchRouteRepository.findByBranches(Array.from(branchesById.keys())),
      Promise.all(
        Array.from(branchesById.keys()).map((branchId) =>
          VehicleRoutePreferenceRepository.findByVehicle(
            context.vehicle.id,
            branchId
          )
        )
      ),
    ]);
    const preferences = preferencesByBranch.flat();
    const routesById = new Map();

    for (const branchRoute of branchRoutes) {
      const route = branchRoute.route;
      if (!route) {
        continue;
      }

      const routeId = Number(route.id);
      let availableRoute = routesById.get(routeId);
      if (!availableRoute) {
        availableRoute = {
          ...mapRoute(route),
          compatible_branch_ids: [],
          branches: [],
          priority: null,
          preferred: false,
        };
        routesById.set(routeId, availableRoute);
      }

      const branchId = Number(branchRoute.branch_id);
      if (!availableRoute.compatible_branch_ids.includes(branchId)) {
        availableRoute.compatible_branch_ids.push(branchId);

        const branch = branchesById.get(branchId);
        if (branch) {
          availableRoute.branches.push({
            id: branch.id,
            image: branch.image,
            address: branch.address,
          });
        }
      }

    }

    const preferenceByBranchAndRoute = new Map(
      preferences.map((preference) => [
        `${Number(preference.branch_id)}:${Number(preference.route_id)}`,
        Number(preference.priority),
      ])
    );
    const originalOrder = new Map(
      Array.from(routesById.keys()).map((routeId, index) => [routeId, index])
    );

    for (const route of routesById.values()) {
      const priorities = route.compatible_branch_ids
        .map((branchId) =>
          preferenceByBranchAndRoute.get(
            `${Number(branchId)}:${Number(route.route_id)}`
          )
        )
        .filter((priority) => Number.isFinite(priority));

      if (priorities.length > 0) {
        route.priority = Math.min(...priorities);
        route.preferred = true;
      }
    }

    const orderedRoutes = Array.from(routesById.values()).sort((left, right) => {
      const leftPriority = left.priority;
      const rightPriority = right.priority;

      if (leftPriority === null && rightPriority === null) {
        return originalOrder.get(left.route_id) - originalOrder.get(right.route_id);
      }

      if (leftPriority === null) {
        return 1;
      }

      if (rightPriority === null) {
        return -1;
      }

      return leftPriority - rightPriority ||
        originalOrder.get(left.route_id) - originalOrder.get(right.route_id);
    });

    const routesWithCommercialData = await Promise.all(
      orderedRoutes.map(async (route) => {
        const commercial = await OnBoardCommercialService.getCommercialData({
          route_id: route.route_id,
          route,
        });

        return {
          ...route,
          commercial: {
            saleMode: commercial.saleMode,
            tripStops: commercial.tripStops,
            segments: commercial.segments,
          },
        };
      })
    );

    return {
      vehicle: {
        id: context.vehicle.id,
        plate: context.vehicle.plate,
        internal_number: context.vehicle.internal_number,
        state: context.vehicle.state,
        seats: context.vehicle.seats,
        branch_ids: Array.from(branchesById.keys()),
        branches: Array.from(branchesById.values()),
      },
      routes: routesWithCommercialData,
    };
};

const OnBoardRouteService = {
  async findAvailable({ worker, device_id }) {
    const context = await OnBoardContextService.resolve({ worker, device_id });
    return buildAvailableRoutes({ context });
  },

  async findAvailableWeb({ worker, branch_id, vehicle_id, device_id }) {
    const context = await OnBoardContextService.resolveWeb({
      worker,
      branch_id,
      vehicle_id,
      device_id,
    });

    return buildAvailableRoutes({
      context,
      branchIds: context.authorizedBranchIds,
    });
  },
};

module.exports = OnBoardRouteService;

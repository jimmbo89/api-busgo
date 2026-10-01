'use strict';

const { sequelize } = require('../models');
const {
  BranchRepository,
  BranchRouteRepository,
  RouteRepository,
} = require('../repositories');

const normalizeId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const normalizeOperations = (branches) => {
  if (branches === undefined || branches === null) {
    return [];
  }

  if (!Array.isArray(branches)) {
    throw new Error('BranchRouteActionsInvalid');
  }

  const branchIds = new Set();

  return branches.map((item) => {
    const branchId = normalizeId(item?.branch_id);
    const associationId =
      item?.association_id === undefined ||
      item?.association_id === null ||
      item?.association_id === ''
        ? null
        : normalizeId(item.association_id);
    const action = String(item?.action || '').trim().toLowerCase();

    if (!branchId || !['associate', 'delete'].includes(action)) {
      throw new Error('BranchRouteActionInvalid');
    }

    if (branchIds.has(branchId)) {
      throw new Error('BranchRouteDuplicateOperation');
    }
    branchIds.add(branchId);

    if (action === 'associate' && associationId !== null) {
      throw new Error('BranchRouteAssociationIdNotAllowed');
    }

    if (action === 'delete' && !associationId) {
      throw new Error('BranchRouteAssociationIdRequired');
    }

    return { branchId, associationId, action };
  });
};

const ensureBranchesExist = async (operations) => {
  const branches = await Promise.all(
    operations.map((operation) => BranchRepository.findById(operation.branchId))
  );

  if (branches.some((branch) => !branch)) {
    throw new Error('BranchNotFound');
  }
};

const validateCreateOperations = (operations) => {
  if (operations.some((operation) => operation.action !== 'associate')) {
    throw new Error('BranchRouteCreateActionInvalid');
  }

  if (operations.some((operation) => operation.associationId !== null)) {
    throw new Error('BranchRouteAssociationIdNotAllowed');
  }
};

const validateUpdateOperations = ({ operations, existingRelations }) => {
  const relationById = new Map(
    existingRelations.map((relation) => [Number(relation.id), relation])
  );
  const branchIdsWithRelations = new Set(
    existingRelations.map((relation) => Number(relation.branch_id))
  );

  operations.forEach((operation) => {
    if (operation.action === 'associate') {
      if (branchIdsWithRelations.has(operation.branchId)) {
        throw new Error('BranchRouteAlreadyAssociated');
      }
      return;
    }

    const relation = relationById.get(operation.associationId);
    if (!relation) {
      throw new Error('BranchRouteAssociationNotFound');
    }

    if (Number(relation.branch_id) !== operation.branchId) {
      throw new Error('BranchRouteAssociationBranchMismatch');
    }
  });
};

const applyCreateOperations = async ({
  routeId,
  operations,
  transaction,
}) => {
  for (const operation of operations) {
    await BranchRouteRepository.create(
      {
        branch_id: operation.branchId,
        route_id: routeId,
      },
      { transaction }
    );
  }
};

const applyUpdateOperations = async ({
  routeId,
  operations,
  existingRelations,
  transaction,
}) => {
  if (operations.length === 0) {
    return;
  }

  validateUpdateOperations({ operations, existingRelations });

  const relationById = new Map(
    existingRelations.map((relation) => [Number(relation.id), relation])
  );
  const deletions = operations.filter((operation) => operation.action === 'delete');
  const associations = operations.filter((operation) => operation.action === 'associate');

  for (const operation of deletions) {
    await BranchRouteRepository.delete(
      relationById.get(operation.associationId),
      { transaction }
    );
  }

  for (const operation of associations) {
    await BranchRouteRepository.create(
      {
        branch_id: operation.branchId,
        route_id: routeId,
      },
      { transaction }
    );
  }
};

const RouteService = {
  async create({ body }) {
    const operations = normalizeOperations(body.branches);
    validateCreateOperations(operations);

    return sequelize.transaction(async (transaction) => {
      await ensureBranchesExist(operations);

      const route = await RouteRepository.create(body, { transaction });
      await applyCreateOperations({
        routeId: route.id,
        operations,
        transaction,
      });

      return route;
    });
  },

  async update({ id, body }) {
    const operations = normalizeOperations(body.branches);

    return sequelize.transaction(async (transaction) => {
      const route = await RouteRepository.findById(id, { transaction });
      if (!route) {
        throw new Error('RouteNotFound');
      }

      await ensureBranchesExist(operations);
      const existingRelations = await BranchRouteRepository.findByRoute(
        route.id,
        { transaction }
      );

      await applyUpdateOperations({
        routeId: route.id,
        operations,
        existingRelations,
        transaction,
      });

      return RouteRepository.update(route, body, { transaction });
    });
  },
};

module.exports = RouteService;

const INCIDENT_TYPES = Object.freeze([
  Object.freeze({
    id: 1,
    value: "Reimpresión",
    titlePattern: "%reimpres%",
  }),
  Object.freeze({
    id: 2,
    value: "Re-escaneo",
    titlePattern: "%escane%",
  }),
  Object.freeze({
    id: 3,
    value: "Retraso",
    titlePattern: "%retras%",
  }),
  Object.freeze({
    id: 4,
    value: "Cambio de vehículo",
    titlePattern: "%cambio%veh%",
  }),
]);

const getIncidentTypeById = (id) =>
  INCIDENT_TYPES.find((incidentType) => incidentType.id === Number(id));

module.exports = {
  INCIDENT_TYPES,
  getIncidentTypeById,
};

// Fixed rotation order shared by every patient: Cadillac -> Reformer -> Chair -> Barrel -> Cadillac...
const EQUIPMENT_SEQUENCE = ["Cadillac", "Reformer", "Chair", "Barrel"];

function getEquipmentName(index) {
  return EQUIPMENT_SEQUENCE[index % EQUIPMENT_SEQUENCE.length];
}

function nextIndex(index) {
  return (index + 1) % EQUIPMENT_SEQUENCE.length;
}

module.exports = { EQUIPMENT_SEQUENCE, getEquipmentName, nextIndex };

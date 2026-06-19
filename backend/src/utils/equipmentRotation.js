// patientEntries: [{ patientId, lastEquipment }]
// equipmentList: string[] fetched from DB by the caller
// preTaken: Set of equipment names already assigned in this slot
// Returns Map of patientId.toString() -> equipment name
function assignEquipmentsToSlot(patientEntries, equipmentList, preTaken = new Set()) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const shuffled = [...patientEntries].sort(() => Math.random() - 0.5);
    const result = new Map();
    const usedInSlot = new Set(preTaken);
    let ok = true;

    for (const { patientId, lastEquipment } of shuffled) {
      const options = equipmentList.filter(
        (e) => e !== lastEquipment && !usedInSlot.has(e)
      );
      if (options.length === 0) {
        ok = false;
        break;
      }
      const pick = options[Math.floor(Math.random() * options.length)];
      result.set(patientId.toString(), pick);
      usedInSlot.add(pick);
    }

    if (ok) return result;
  }

  // Fallback: ignore no-repeat constraint but still avoid slot conflicts
  const result = new Map();
  const usedInSlot = new Set(preTaken);
  for (const { patientId } of patientEntries) {
    const options = equipmentList.filter((e) => !usedInSlot.has(e));
    if (options.length === 0) break;
    const pick = options[0];
    result.set(patientId.toString(), pick);
    usedInSlot.add(pick);
  }
  return result;
}

module.exports = { assignEquipmentsToSlot };

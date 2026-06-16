const Appointment = require("../models/Appointment");
const { EQUIPMENT_SEQUENCE, getEquipmentName, nextIndex } = require("../utils/equipmentRotation");

// Resolves the designated equipment for every appointment of the day, advancing
// past a patient's preferred slot when another patient at the same time already
// claimed that equipment.
async function getTodaySchedule(req, res, next) {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

    const appointments = await Appointment.find({
      date: { $gte: startOfDay, $lt: endOfDay },
    })
      .populate("patient", "name equipmentIndex")
      .sort({ date: 1 });

    const slots = new Map();
    for (const appointment of appointments) {
      const key = appointment.date.getTime();
      if (!slots.has(key)) slots.set(key, []);
      slots.get(key).push(appointment);
    }

    const result = [];

    for (const slotAppointments of slots.values()) {
      const usedInSlot = new Set();

      for (const appointment of slotAppointments) {
        let index = appointment.patient.equipmentIndex || 0;
        let equipment = getEquipmentName(index);
        let attempts = 0;

        while (usedInSlot.has(equipment) && attempts < EQUIPMENT_SEQUENCE.length) {
          index = nextIndex(index);
          equipment = getEquipmentName(index);
          attempts += 1;
        }

        usedInSlot.add(equipment);

        result.push({
          appointmentId: appointment._id,
          patientId: appointment.patient._id,
          patientName: appointment.patient.name,
          date: appointment.date,
          status: appointment.status,
          equipment,
        });
      }
    }

    result.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { getTodaySchedule };

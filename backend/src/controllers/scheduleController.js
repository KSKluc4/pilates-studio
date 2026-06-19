const Appointment = require("../models/Appointment");
const { assignEquipmentsToSlot } = require("../utils/equipmentRotation");

async function getTodaySchedule(req, res, next) {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

    const appointments = await Appointment.find({
      date: { $gte: startOfDay, $lt: endOfDay },
    })
      .populate("patient", "name")
      .sort({ date: 1 });

    // Group by time slot
    const slots = new Map();
    for (const appt of appointments) {
      const key = appt.date.getTime();
      if (!slots.has(key)) slots.set(key, []);
      slots.get(key).push(appt);
    }

    // Collect unique patient IDs to look up last-used equipment in one pass
    const patientIds = [...new Set(appointments.map((a) => a.patient._id.toString()))];

    const lastEquipmentMap = new Map();
    for (const pid of patientIds) {
      const lastCompleted = await Appointment.findOne({
        patient: pid,
        status: "completed",
        date: { $lt: startOfDay },
        equipment: { $exists: true, $ne: null },
      }).sort({ date: -1 });

      lastEquipmentMap.set(pid, lastCompleted ? lastCompleted.equipment : null);
    }

    const result = [];

    for (const slotAppointments of slots.values()) {
      // Keep already-assigned appointments as-is; only assign the new ones
      const alreadyAssigned = slotAppointments.filter((a) => a.equipment);
      const needsAssignment = slotAppointments.filter((a) => !a.equipment);

      if (needsAssignment.length > 0) {
        const preTaken = new Set(alreadyAssigned.map((a) => a.equipment));

        const entries = needsAssignment.map((a) => ({
          patientId: a.patient._id,
          lastEquipment: lastEquipmentMap.get(a.patient._id.toString()),
        }));

        const assignedMap = assignEquipmentsToSlot(entries, preTaken);

        for (const appt of needsAssignment) {
          const eq = assignedMap.get(appt.patient._id.toString());
          if (eq) {
            appt.equipment = eq;
            await appt.save();
          }
        }
      }

      for (const appt of slotAppointments) {
        result.push({
          appointmentId: appt._id,
          patientId: appt.patient._id,
          patientName: appt.patient.name,
          date: appt.date,
          status: appt.status,
          equipment: appt.equipment || null,
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

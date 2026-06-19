const Appointment = require("../models/Appointment");
const { assignEquipmentsToSlot } = require("../utils/equipmentRotation");

async function buildDaySchedule(targetDate) {
  const startOfDay = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    0, 0, 0, 0
  );
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const appointments = await Appointment.find({
    date: { $gte: startOfDay, $lt: endOfDay },
  })
    .populate("patient", "name")
    .sort({ date: 1 });

  const slots = new Map();
  for (const appt of appointments) {
    const key = appt.date.getTime();
    if (!slots.has(key)) slots.set(key, []);
    slots.get(key).push(appt);
  }

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
  return result;
}

function parseDateParam(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

async function getTodaySchedule(req, res, next) {
  try {
    res.json(await buildDaySchedule(new Date()));
  } catch (error) {
    next(error);
  }
}

async function getScheduleByDate(req, res, next) {
  try {
    const target = parseDateParam(req.params.date);
    if (!target) {
      res.status(400);
      throw new Error("Use o formato YYYY-MM-DD");
    }
    res.json(await buildDaySchedule(target));
  } catch (error) {
    next(error);
  }
}

async function getWeekSchedule(req, res, next) {
  try {
    const ref = req.query.date ? parseDateParam(req.query.date) : new Date();
    if (!ref) {
      res.status(400);
      throw new Error("Use o formato YYYY-MM-DD");
    }

    // Monday of the week containing ref
    const dow = ref.getDay();
    const monday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + (dow === 0 ? -6 : 1 - dow));

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      week.push({ date: iso, appointments: await buildDaySchedule(d) });
    }

    res.json(week);
  } catch (error) {
    next(error);
  }
}

module.exports = { getTodaySchedule, getScheduleByDate, getWeekSchedule };

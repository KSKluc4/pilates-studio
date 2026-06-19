const Appointment = require("../models/Appointment");
const Equipment = require("../models/Equipment");
const { assignEquipmentsToSlot } = require("../utils/equipmentRotation");

const DEFAULT_EQUIPMENT = ["Cadillac", "Reformer", "Chair 1", "Chair 2", "Barrel"];

async function getEquipmentNames() {
  const docs = await Equipment.find().sort({ name: 1 }).select("name");
  if (docs.length === 0) {
    // Auto-seed defaults if the collection is empty (backward compatibility)
    await Equipment.insertMany(DEFAULT_EQUIPMENT.map((name) => ({ name })));
    return DEFAULT_EQUIPMENT;
  }
  return docs.map((d) => d.name);
}

async function buildDaySchedule(targetDate, equipmentList) {
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
    const overflowPatients = new Set();

    if (needsAssignment.length > 0) {
      const preTaken = new Set(alreadyAssigned.map((a) => a.equipment));
      const entries = needsAssignment.map((a) => ({
        patientId: a.patient._id,
        lastEquipment: lastEquipmentMap.get(a.patient._id.toString()),
      }));

      const assignedMap = assignEquipmentsToSlot(entries, equipmentList, preTaken);

      for (const appt of needsAssignment) {
        const eq = assignedMap.get(appt.patient._id.toString());
        if (eq) {
          appt.equipment = eq;
          await appt.save();
        } else {
          overflowPatients.add(appt.patient._id.toString());
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
        manualEquipment: appt.manualEquipment || false,
        noEquipmentAvailable: overflowPatients.has(appt.patient._id.toString()),
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
    const equipmentList = await getEquipmentNames();
    res.json(await buildDaySchedule(new Date(), equipmentList));
  } catch (error) {
    next(error);
  }
}

async function getScheduleByDate(req, res, next) {
  try {
    const target = parseDateParam(req.params.date);
    if (!target) {
      res.status(400);
      throw new Error("Use o formato YYYY-MM-DD.");
    }
    const equipmentList = await getEquipmentNames();
    res.json(await buildDaySchedule(target, equipmentList));
  } catch (error) {
    next(error);
  }
}

async function getWeekSchedule(req, res, next) {
  try {
    const ref = req.query.date ? parseDateParam(req.query.date) : new Date();
    if (!ref) {
      res.status(400);
      throw new Error("Use o formato YYYY-MM-DD.");
    }

    // Fetch once for the whole week to avoid 7 DB round-trips
    const equipmentList = await getEquipmentNames();

    const dow = ref.getDay();
    const monday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + (dow === 0 ? -6 : 1 - dow));

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      week.push({ date: iso, appointments: await buildDaySchedule(d, equipmentList) });
    }

    res.json(week);
  } catch (error) {
    next(error);
  }
}

module.exports = { getTodaySchedule, getScheduleByDate, getWeekSchedule };

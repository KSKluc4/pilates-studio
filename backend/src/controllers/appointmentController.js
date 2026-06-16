const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const { nextIndex } = require("../utils/equipmentRotation");

const FINAL_STATUSES = ["completed", "no-show"];

async function listAppointments(req, res, next) {
  try {
    const { patientId, from, to, status } = req.query;
    const filter = {};

    if (patientId) filter.patient = patientId;
    if (status) filter.status = status;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const appointments = await Appointment.find(filter)
      .populate("patient", "name phone")
      .sort({ date: 1 });

    res.json(appointments);
  } catch (error) {
    next(error);
  }
}

async function getAppointment(req, res, next) {
  try {
    const appointment = await Appointment.findById(req.params.id).populate(
      "patient",
      "name phone"
    );
    if (!appointment) {
      res.status(404);
      throw new Error("Appointment not found");
    }
    res.json(appointment);
  } catch (error) {
    next(error);
  }
}

async function createAppointment(req, res, next) {
  try {
    const { patient, date, durationMinutes, notes } = req.body;

    if (!patient || !date) {
      res.status(400);
      throw new Error("Patient and date are required");
    }

    const patientExists = await Patient.findById(patient);
    if (!patientExists) {
      res.status(404);
      throw new Error("Patient not found");
    }

    const appointment = await Appointment.create({
      patient,
      date,
      durationMinutes,
      notes,
      createdBy: req.user._id,
    });

    res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
}

async function updateAppointment(req, res, next) {
  try {
    const { date, durationMinutes, status, notes } = req.body;

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      res.status(404);
      throw new Error("Appointment not found");
    }

    const wasFinal = FINAL_STATUSES.includes(appointment.status);
    const willBeFinal = status !== undefined && FINAL_STATUSES.includes(status);

    if (date !== undefined) appointment.date = date;
    if (durationMinutes !== undefined) appointment.durationMinutes = durationMinutes;
    if (status !== undefined) appointment.status = status;
    if (notes !== undefined) appointment.notes = notes;

    await appointment.save();

    // Attendance confirmed or missed: advance the patient to the next equipment in the rotation
    if (!wasFinal && willBeFinal) {
      const patient = await Patient.findById(appointment.patient);
      if (patient) {
        patient.equipmentIndex = nextIndex(patient.equipmentIndex || 0);
        await patient.save();
      }
    }

    res.json(appointment);
  } catch (error) {
    next(error);
  }
}

async function deleteAppointment(req, res, next) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      res.status(404);
      throw new Error("Appointment not found");
    }

    await appointment.deleteOne();
    res.json({ message: "Appointment deleted" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};

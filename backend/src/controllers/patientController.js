const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");

async function listPatients(req, res, next) {
  try {
    const { search } = req.query;
    const filter = search
      ? { name: { $regex: search, $options: "i" } }
      : {};

    const patients = await Patient.find(filter).sort({ name: 1 });
    res.json(patients);
  } catch (error) {
    next(error);
  }
}

async function getPatient(req, res, next) {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      res.status(404);
      throw new Error("Patient not found");
    }
    res.json(patient);
  } catch (error) {
    next(error);
  }
}

async function createPatient(req, res, next) {
  try {
    const { name, email, phone, birthDate, medicalNotes } = req.body;

    if (!name || !phone) {
      res.status(400);
      throw new Error("Name and phone are required");
    }

    const patient = await Patient.create({
      name,
      email,
      phone,
      birthDate,
      medicalNotes,
      createdBy: req.user._id,
    });

    res.status(201).json(patient);
  } catch (error) {
    next(error);
  }
}

async function updatePatient(req, res, next) {
  try {
    const { name, email, phone, birthDate, medicalNotes, active } = req.body;

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      res.status(404);
      throw new Error("Patient not found");
    }

    if (name !== undefined) patient.name = name;
    if (email !== undefined) patient.email = email;
    if (phone !== undefined) patient.phone = phone;
    if (birthDate !== undefined) patient.birthDate = birthDate;
    if (medicalNotes !== undefined) patient.medicalNotes = medicalNotes;
    if (active !== undefined) patient.active = active;

    await patient.save();
    res.json(patient);
  } catch (error) {
    next(error);
  }
}

async function deletePatient(req, res, next) {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      res.status(404);
      throw new Error("Patient not found");
    }

    await patient.deleteOne();
    res.json({ message: "Patient deleted" });
  } catch (error) {
    next(error);
  }
}

async function getEquipmentHistory(req, res, next) {
  try {
    const patient = await Patient.findById(req.params.id).select("name");
    if (!patient) {
      res.status(404);
      throw new Error("Patient not found");
    }

    const history = await Appointment.find({
      patient: req.params.id,
      status: "completed",
      equipment: { $exists: true, $ne: null },
    })
      .sort({ date: -1 })
      .select("date equipment notes durationMinutes");

    res.json({ patient, history });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  getEquipmentHistory,
};

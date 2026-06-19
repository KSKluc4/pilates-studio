const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");

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
      throw new Error("Agendamento não encontrado.");
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
      throw new Error("Paciente e data são obrigatórios.");
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      res.status(400);
      throw new Error("Data inválida.");
    }

    const patientDoc = await Patient.findById(patient);
    if (!patientDoc) {
      res.status(404);
      throw new Error("Paciente não encontrado.");
    }

    if (!patientDoc.active) {
      res.status(400);
      throw new Error("Não é possível agendar para um paciente inativo.");
    }

    const appointment = await Appointment.create({
      patient,
      date: parsedDate,
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
    const { date, durationMinutes, status, notes, equipment } = req.body;

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      res.status(404);
      throw new Error("Agendamento não encontrado.");
    }

    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        res.status(400);
        throw new Error("Data inválida.");
      }
      appointment.date = parsedDate;
    }
    if (durationMinutes !== undefined) appointment.durationMinutes = durationMinutes;
    if (status !== undefined) appointment.status = status;
    if (notes !== undefined) appointment.notes = notes;
    if (equipment !== undefined) {
      appointment.equipment = equipment;
      appointment.manualEquipment = true;
    }

    await appointment.save();

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
      throw new Error("Agendamento não encontrado.");
    }

    await appointment.deleteOne();
    res.json({ message: "Agendamento removido com sucesso." });
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

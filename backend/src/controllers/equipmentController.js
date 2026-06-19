const Equipment = require("../models/Equipment");
const Appointment = require("../models/Appointment");

async function listEquipment(req, res, next) {
  try {
    const equipment = await Equipment.find().sort({ name: 1 });
    res.json(equipment);
  } catch (error) {
    next(error);
  }
}

async function createEquipment(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      res.status(400);
      throw new Error("Nome do equipamento é obrigatório.");
    }

    const equipment = await Equipment.create({ name: name.trim() });
    res.status(201).json(equipment);
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      return next(new Error("Já existe um equipamento com este nome."));
    }
    next(error);
  }
}

async function deleteEquipment(req, res, next) {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      res.status(404);
      throw new Error("Equipamento não encontrado.");
    }

    const futureCount = await Appointment.countDocuments({
      equipment: equipment.name,
      date: { $gte: new Date() },
      status: "scheduled",
    });

    if (futureCount > 0) {
      res.status(400);
      throw new Error(
        `Não é possível remover: há ${futureCount} agendamento(s) futuro(s) usando este equipamento.`
      );
    }

    await equipment.deleteOne();
    res.json({ message: "Equipamento removido com sucesso." });
  } catch (error) {
    next(error);
  }
}

module.exports = { listEquipment, createEquipment, deleteEquipment };

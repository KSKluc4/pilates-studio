const Payment = require("../models/Payment");
const Patient = require("../models/Patient");

async function listPayments(req, res, next) {
  try {
    const { patientId, status } = req.query;
    const filter = {};

    if (patientId) filter.patient = patientId;
    if (status) filter.status = status;

    const payments = await Payment.find(filter)
      .populate("patient", "name")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    next(error);
  }
}

async function getPayment(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.id).populate("patient", "name");
    if (!payment) {
      res.status(404);
      throw new Error("Pagamento não encontrado.");
    }
    res.json(payment);
  } catch (error) {
    next(error);
  }
}

async function createPayment(req, res, next) {
  try {
    const { patient, amount, method, status, referenceMonth, notes } = req.body;

    if (!patient || amount === undefined || !method) {
      res.status(400);
      throw new Error("Paciente, valor e forma de pagamento são obrigatórios.");
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      res.status(400);
      throw new Error("O valor deve ser um número maior ou igual a zero.");
    }

    const patientExists = await Patient.findById(patient);
    if (!patientExists) {
      res.status(404);
      throw new Error("Paciente não encontrado.");
    }

    const payment = await Payment.create({
      patient,
      amount: numericAmount,
      method,
      status,
      referenceMonth,
      notes,
      createdBy: req.user._id,
    });

    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
}

// Restricted to admins: editing financial records
async function updatePayment(req, res, next) {
  try {
    const { amount, method, status, referenceMonth, notes } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      res.status(404);
      throw new Error("Pagamento não encontrado.");
    }

    if (amount !== undefined) {
      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount < 0) {
        res.status(400);
        throw new Error("O valor deve ser um número maior ou igual a zero.");
      }
      payment.amount = numericAmount;
    }
    if (method !== undefined) payment.method = method;
    if (status !== undefined) payment.status = status;
    if (referenceMonth !== undefined) payment.referenceMonth = referenceMonth;
    if (notes !== undefined) payment.notes = notes;

    await payment.save();
    res.json(payment);
  } catch (error) {
    next(error);
  }
}

// Restricted to admins: deleting financial records
async function deletePayment(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      res.status(404);
      throw new Error("Pagamento não encontrado.");
    }

    await payment.deleteOne();
    res.json({ message: "Pagamento removido com sucesso." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
};

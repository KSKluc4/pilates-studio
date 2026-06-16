// Seeds the database with the studio's real equipment and patient roster,
// including their recurring weekly class slots.
// Usage: node scripts/seedData.js
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const Patient = require("../src/models/Patient");
const Appointment = require("../src/models/Appointment");
const Equipment = require("../src/models/Equipment");

const EQUIPMENT = ["Cadillac", "Reformer", "Chair", "Barrel"];

// weekday follows Date#getDay(): 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta
const PATIENTS = [
  { name: "BRUNA BORDIM", schedule: [[1, "07:00"]] },
  { name: "EVANDRO BORDIM", schedule: [[1, "07:00"]] },
  { name: "KARIME FOLLADOR", schedule: [[1, "07:00"]] },
  { name: "LIZ", schedule: [[1, "08:00"], [3, "08:00"]] },
  { name: "HELOENI", schedule: [[1, "09:00"], [3, "09:00"]] },
  { name: "LILIAN", schedule: [[1, "09:00"], [3, "09:00"]] },
  { name: "SOLANGE", schedule: [[1, "09:00"], [3, "09:00"]] },
  { name: "ANA MARIA", schedule: [[1, "10:00"], [3, "10:00"]] },
  { name: "ESTER", schedule: [[1, "10:00"], [3, "10:00"]] },
  { name: "JULIA", schedule: [[1, "10:00"], [4, "08:00"]] },
  { name: "BERNADETE", schedule: [[1, "15:00"], [4, "16:00"]] },
  { name: "GILSON", schedule: [[1, "16:00"]] },
  { name: "NARA", schedule: [[1, "16:00"]] },
  { name: "EDUARDA", schedule: [[1, "16:00"], [2, "15:00"]] },
  { name: "ISIS", schedule: [[1, "17:00"], [3, "17:00"]] },
  { name: "EVA", schedule: [[1, "18:00"], [3, "18:00"]] },
  { name: "MARLON", schedule: [[1, "18:00"], [3, "18:00"], [4, "18:00"]] },
  { name: "MILAGRES", schedule: [[2, "19:00"], [4, "19:00"]] },
  { name: "BRENDA", schedule: [[1, "19:00"], [3, "19:00"]] },
  { name: "LORENA", schedule: [[1, "19:00"], [3, "19:00"]] },
  { name: "SINARA", schedule: [[1, "19:00"], [3, "19:00"]] },
  { name: "BIANCA DA ROCHA", schedule: [[2, "07:00"], [4, "07:00"], [5, "07:00"]] },
  { name: "MARIA JULIA", schedule: [[2, "07:00"], [4, "07:00"]] },
  { name: "VITORIA", schedule: [[2, "07:00"], [4, "07:00"]] },
  { name: "TATIANE LIMA", schedule: [[2, "08:00"]] },
  { name: "ADAILZE", schedule: [[2, "09:00"], [4, "09:00"]] },
  { name: "SELMA", schedule: [[2, "09:00"], [4, "09:00"]] },
  { name: "ANNE", schedule: [[2, "10:00"], [4, "10:00"]] },
  { name: "TERESINHA", schedule: [[2, "10:00"], [4, "10:00"]] },
  { name: "CARLOS BARONE", schedule: [[2, "11:00"], [4, "11:00"]] },
  { name: "SONIA COELHO", schedule: [[2, "11:00"], [4, "11:00"]] },
  { name: "BEATRIZ MOTTA", schedule: [[2, "15:00"], [4, "15:00"]] },
  { name: "FERNANDA", schedule: [[2, "15:00"]] },
  { name: "BRUNO", schedule: [[2, "16:00"], [4, "16:00"]] },
  { name: "MANU", schedule: [[2, "18:00"], [4, "18:00"]] },
  { name: "ANA CECILIA", schedule: [[2, "18:00"], [4, "18:00"]] },
  { name: "AMANDA", schedule: [[2, "19:00"], [4, "19:00"]] },
  { name: "LUIZA", schedule: [[3, "07:00"]] },
  { name: "MARCIA", schedule: [[3, "07:00"], [5, "07:00"]] },
  { name: "WILSON", schedule: [[3, "07:00"], [5, "07:00"]] },
  { name: "IRENE", schedule: [[3, "16:00"]] },
  { name: "RICARDO", schedule: [[3, "16:00"]] },
  { name: "GABRIELA", schedule: [[4, "19:00"]] },
  { name: "MARCOS VICENTE", schedule: [[4, "19:00"]] },
  { name: "BIANCA ROVERE", schedule: [[5, "08:00"]] },
  { name: "WALQUIRIA", schedule: [[5, "08:00"]] },
];

const WEEKS_AHEAD = 4;
const CLASS_DURATION_MINUTES = 50;

// Returns the next date/time on or after `base` that falls on `weekday` at `hours:minutes`.
function nextOccurrence(base, weekday, hours, minutes) {
  const date = new Date(base);
  date.setHours(hours, minutes, 0, 0);
  let diff = (weekday - date.getDay() + 7) % 7;
  if (diff === 0 && date < base) diff = 7;
  date.setDate(date.getDate() + diff);
  return date;
}

async function seed() {
  await connectDB();

  const admin = await User.findOne({ role: "admin" });
  if (!admin) {
    console.error("No admin user found. Run `npm run seed:admin` first.");
    process.exit(1);
  }

  for (const name of EQUIPMENT) {
    await Equipment.findOneAndUpdate({ name }, { name }, { upsert: true });
  }
  console.log(`Equipment seeded: ${EQUIPMENT.join(", ")}`);

  const now = new Date();
  // Anchor at midnight so today's slots are included even if their time has already
  // passed today (nextOccurrence would otherwise skip to next week).
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  let appointmentsCreated = 0;

  for (const { name, schedule } of PATIENTS) {
    const patient = await Patient.findOneAndUpdate(
      { name },
      { name, phone: "Não informado", createdBy: admin._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    for (const [weekday, time] of schedule) {
      const [hours, minutes] = time.split(":").map(Number);
      const firstOccurrence = nextOccurrence(startOfToday, weekday, hours, minutes);

      for (let week = 0; week < WEEKS_AHEAD; week += 1) {
        const date = new Date(firstOccurrence);
        date.setDate(date.getDate() + week * 7);

        const exists = await Appointment.findOne({ patient: patient._id, date });
        if (exists) continue;

        await Appointment.create({
          patient: patient._id,
          date,
          durationMinutes: CLASS_DURATION_MINUTES,
          notes: "Aula semanal recorrente",
          createdBy: admin._id,
        });
        appointmentsCreated += 1;
      }
    }
  }

  console.log(`Patients seeded: ${PATIENTS.length}`);
  console.log(`Appointments created: ${appointmentsCreated}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

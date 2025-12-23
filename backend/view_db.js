const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Student, Teacher } = require('./models');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("Connected to DB. Fetching users...");

        const students = await Student.find({}, 'name rollNo email branch year');
        const teachers = await Teacher.find({}, 'name email');

        console.log("\n=== TEACHERS ===");
        if (teachers.length === 0) console.log("No teachers found.");
        teachers.forEach(t => console.log(`- ${t.name} (${t.email}) [ID: ${t._id}]`));

        console.log("\n=== STUDENTS ===");
        if (students.length === 0) console.log("No students found.");
        students.forEach(s => console.log(`- ${s.name} (Roll: ${s.rollNo}) [Branch: ${s.branch || 'N/A'}]`));

        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

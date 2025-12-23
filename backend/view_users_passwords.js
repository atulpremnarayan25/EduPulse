const mongoose = require('mongoose');
const dotenv = require('dotenv');
// Adjust the path to where your models are exported. 
// Based on previous file views, it seems they are in ./models
const { Student, Teacher } = require('./models');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("Connected to DB. Fetching credentials...");

        // Explicitly selecting the password field if it's not selected by default, 
        // though usually it is unless Schema has select: false.
        const students = await Student.find({}, 'name email password rollNo');
        const teachers = await Teacher.find({}, 'name email password');

        console.log("\n=== TEACHERS ===");
        if (teachers.length === 0) console.log("No teachers found.");
        teachers.forEach(t => {
            console.log(`Name: ${t.name}`);
            console.log(`Email: ${t.email}`);
            console.log(`Password: ${t.password}`);
            console.log(`ID: ${t._id}`);
            console.log('---');
        });

        console.log("\n=== STUDENTS ===");
        if (students.length === 0) console.log("No students found.");
        students.forEach(s => {
            console.log(`Name: ${s.name}`);
            console.log(`Roll No: ${s.rollNo}`);
            console.log(`Password: ${s.password}`);
            console.log(`ID: ${s._id}`);
            console.log('---');
        });

        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

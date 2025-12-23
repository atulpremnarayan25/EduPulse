const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const { Student, Teacher } = require('../models');

// Serialize user into the sessions
passport.serializeUser((user, done) => {
    done(null, { id: user._id, role: user.role });
});

// Deserialize user from the sessions
passport.deserializeUser(async (data, done) => {
    try {
        let user;
        if (data.role === 'teacher') {
            user = await Teacher.findById(data.id);
            if (user) user.role = 'teacher';
        } else {
            user = await Student.findById(data.id);
            if (user) user.role = 'student';
        }
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_google_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_google_secret',
    callbackURL: "/api/auth/google/callback",
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const googleId = profile.id;

        // Check if teacher
        let teacher = await Teacher.findOne({ email });
        if (teacher) {
            teacher.googleId = googleId;
            await teacher.save();
            teacher.role = 'teacher';
            return done(null, teacher);
        }

        // Check if student
        let student = await Student.findOne({ email });
        if (student) {
            student.googleId = googleId;
            await student.save();
            student.role = 'student';
            return done(null, student);
        }

        // Create new Student by default
        // Roll No is required but we don't have it. Generate a temp one or make it random?
        // For this demo, we'll generate a random string.
        const rollNo = 'GOOGLE_' + Math.floor(Math.random() * 100000);
        student = await Student.create({
            name,
            email,
            rollNo,
            googleId,
            password: 'OAUTH_USER' // Dummy password
        });
        student.role = 'student';
        done(null, student);

    } catch (err) {
        done(err, null);
    }
}));

// GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || 'dummy_github_id',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || 'dummy_github_secret',
    callbackURL: "/api/auth/github/callback",
    scope: ['user:email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // GitHub email might be private, handle strictness if needed.
        // For now take the first one or null.
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.username}@github.com`;
        const name = profile.displayName || profile.username;
        const githubId = profile.id;

        // Check if teacher
        let teacher = await Teacher.findOne({ email });
        if (teacher) {
            teacher.githubId = githubId;
            await teacher.save();
            teacher.role = 'teacher';
            return done(null, teacher);
        }

        // Check if student
        let student = await Student.findOne({ email });
        if (student) {
            student.githubId = githubId;
            await student.save();
            student.role = 'student';
            return done(null, student);
        }

        // Create new Student
        const rollNo = 'GITHUB_' + Math.floor(Math.random() * 100000);
        student = await Student.create({
            name,
            email,
            rollNo,
            githubId,
            password: 'OAUTH_USER'
        });
        student.role = 'student';
        done(null, student);

    } catch (err) {
        done(err, null);
    }
}));

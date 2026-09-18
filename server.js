const express = require("express");
const fs = require("fs");
const path = require("path");
const EventEmitter = require("events");

const app = express();
const PORT = 3000;

// File paths
const usersFile = path.join(__dirname, "users.json");
const auditFile = path.join(__dirname, "audit.log");

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Custom EventEmitter
const userEvents = new EventEmitter();

// Read users from users.json
function readUsers() {
    try {
        const data = fs.readFileSync(usersFile, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading users.json:", error);
        return [];
    }
}

// Save users to users.json
function saveUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// Write activity to audit.log
function writeAudit(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    fs.appendFileSync(auditFile, logMessage);
}

// Signup event listener
userEvents.on("signup", (user) => {
    writeAudit(`SIGNUP: New account created for ${user.email}`);
});

// Login event listener
userEvents.on("login", (user) => {
    writeAudit(`LOGIN: User authenticated - ${user.email}`);
});

// POST /signup
app.post("/signup", (req, res) => {
    const { name, email, password } = req.body;

    // Check for missing fields
    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Please fill in all fields."
        });
    }

    const users = readUsers();

    // Check if email already exists
    const existingUser = users.find(
        user => user.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
        return res.status(409).json({
            success: false,
            message: "Email already registered."
        });
    }

    // Create new user
    const newUser = {
        name,
        email,
        password
    };

    users.push(newUser);
    saveUsers(users);

    // Emit signup event
    userEvents.emit("signup", newUser);

    res.json({
        success: true,
        message: "Account created successfully!"
    });
});

// POST /login
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    // Check for missing fields
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Please enter email and password."
        });
    }

    const users = readUsers();

    // Find matching user
    const user = users.find(
        user =>
            user.email.toLowerCase() === email.toLowerCase() &&
            user.password === password
    );

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password."
        });
    }

    // Emit login event
    userEvents.emit("login", user);

    res.json({
        success: true,
        message: "Login successful!",
        name: user.name
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
const express = require("express");
const fs = require("fs");
const EventEmitter = require("events");
const { MongoClient } = require("mongodb");

const app = express();

const PORT = 3000;


// MongoDB connection
const client = new MongoClient("mongodb://localhost:27017");

let usersCollection;


// Audit file
const auditFile = "audit.log";


// Middleware
app.use(express.json());

app.use(express.static("public"));


// Create EventEmitter
const userEvents = new EventEmitter();


// SIGN UP EVENT
userEvents.on("signup", (user) => {

    const message =
        `[${new Date().toLocaleString()}] SIGNUP: ${user.email}\n`;

    fs.appendFileSync(auditFile, message);

    console.log(message.trim());

});


// LOGIN EVENT
userEvents.on("login", (user) => {

    const message =
        `[${new Date().toLocaleString()}] LOGIN: ${user.email}\n`;

    fs.appendFileSync(auditFile, message);

    console.log(message.trim());

});


// SIGN UP ROUTE
app.post("/signup", async (req, res) => {

    try {

        const { name, email, password } = req.body;


        // Check empty fields
        if (!name || !email || !password) {

            return res.status(400).json({
                success: false,
                message: "Please fill in all fields."
            });

        }


        // Check if email already exists
        const existingUser = await usersCollection.findOne({
            email: email.toLowerCase()
        });


        if (existingUser) {

            return res.status(400).json({
                success: false,
                message: "Email already registered."
            });

        }


        // Create new user
        const newUser = {
            name: name,
            email: email.toLowerCase(),
            password: password
        };


        // Save user to MongoDB
        await usersCollection.insertOne(newUser);


        // Emit signup event
        userEvents.emit("signup", newUser);


        // Send response
        res.json({
            success: true,
            message: "Registration successful!"
        });

    } catch (error) {

        console.error("Signup error:", error);

        res.status(500).json({
            success: false,
            message: "Server error."
        });

    }

});


// LOGIN ROUTE
app.post("/login", async (req, res) => {

    try {

        const { email, password } = req.body;


        // Check empty fields
        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message: "Please enter email and password."
            });

        }


        // Find user in MongoDB
        const user = await usersCollection.findOne({
            email: email.toLowerCase(),
            password: password
        });


        // User not found
        if (!user) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });

        }


        // Emit login event
        userEvents.emit("login", user);


        // Send success response
        res.json({
            success: true,
            message: "Login successful!",
            name: user.name
        });

    } catch (error) {

        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Server error."
        });

    }

});


// Connect to MongoDB and start server
async function startServer() {

    try {

        // Connect to MongoDB
        await client.connect();

        console.log("Connected to MongoDB");


        // Select database
        const database = client.db("loginDB");


        // Select collection
        usersCollection = database.collection("users");


        console.log("Database: loginDB");
        console.log("Collection: users");


        // Start server
        app.listen(PORT, () => {

            console.log(
                `Server running at http://localhost:${PORT}`
            );

        });

    } catch (error) {

        console.error("MongoDB connection failed:", error);

    }

}


// Start application
startServer();
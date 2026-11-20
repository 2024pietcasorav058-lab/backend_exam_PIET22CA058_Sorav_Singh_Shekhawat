
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Student Schema
const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: "student"
    }
});

const Student = mongoose.model("Student", studentSchema);

// 1. Student Registration
app.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const existingStudent = await Student.findOne({ email });

        if (existingStudent) {
            return res.status(400).json({
                message: "Email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const student = await Student.create({
            name,
            email,
            password: hashedPassword
        });

        res.status(201).json({
            message: "Registration successful",
            studentId: student._id
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// 2. Student Login
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const student = await Student.findOne({ email });

        if (!student) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const match = await bcrypt.compare(
            password,
            student.password
        );

        if (!match) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: student._id,
                role: student.role
            },
            "secretkey",
            { expiresIn: "1h" }
        );

        res.json({
            message: "Login successful",
            token: token
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// 3. Authentication Middleware
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Token required"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        req.user = jwt.verify(token, "secretkey");
        next();

    } catch (error) {
        res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

// 4. Protected Student Profile
app.get("/profile", verifyToken, async (req, res) => {
    try {
        const student = await Student.findById(req.user.id)
            .select("-password");

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.json(student);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// 5. Admin Only - View All Students
app.get("/students", verifyToken, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Admin access only"
            });
        }

        const students = await Student.find()
            .select("-password");

        res.json(students);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully");

        app.listen(3001, () => {
            console.log("Student Portal running on port 3001");
        });
    })
    .catch(error => {
        console.log("MongoDB Error:", error.message);
    });

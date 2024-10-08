const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
require("dotenv").config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware

app.use(express.json());
app.use(cors());

// Connect to MongoDB

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((error) => console.error("MongoDB connection error:", error));

// Reference Schema and Model

const referenceSchema = new mongoose.Schema({
  count: { type: Number, required: true },
});
const Reference = mongoose.model("Reference", referenceSchema);


// Visitors Schema and Model

const visitorSchema = new mongoose.Schema({
  count: {
    type: Number,
    required: true,
    default: 905 // Starting point of the counter
  },
  lastUpdated: {
    type: Date,
    required: true,
    default: Date.now // Track when the last increment occurred
  }
});

const Visitor = mongoose.model('Visitor', visitorSchema);


// Helper function to get the next unique reference number

const getNextReferenceNumber = async () => {
  try {
    let reference = await Reference.findOne();
    if (!reference) {
      reference = new Reference({ count: 1 });
    } else {
      reference.count += 1;
    }
    await reference.save();

    const currentMonth = new Date().toLocaleString("en-US", {
      month: "2-digit",
    });
    const currentYear = new Date().getFullYear();
    const formattedCount = String(reference.count).padStart(3, "0");
    const referenceNumber = `${formattedCount}/${currentMonth}/${currentYear}`;
    return referenceNumber;
  } catch (error) {
    throw new Error("Could not generate reference number");
  }
};

// API to generate a unique reference number
app.post("/api/reference", async (req, res) => {
  try {
    const referenceNumber = await getNextReferenceNumber();
    res.json({ reference_number: referenceNumber });
  } catch (error) {
    res.status(500).json({ error: "Error generating reference number" });
  }
});

// Job Schema and Model
const jobSchema = new mongoose.Schema({
  title: String,
  description: String,
  location: String,
  datePosted: { type: Date, default: Date.now },
  icon: String,
});
const Job = mongoose.model("Job", jobSchema);

// POST: Create a new job
app.post("/api/jobs", async (req, res) => {
  try {
    const newJob = new Job(req.body);
    const savedJob = await newJob.save();
    res.status(201).json(savedJob);
  } catch (error) {
    res.status(500).json({ error: "Error saving job" });
  }
});

// GET: Get all jobs
app.get("/api/jobs", async (req, res) => {
  try {
    const jobs = await Job.find();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: "Error fetching jobs" });
  }
});

// PUT: Update a job
app.put("/api/jobs/:id", async (req, res) => {
  try {
    const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: "Error updating job" });
  }
});

// DELETE: Delete a job
app.delete("/api/jobs/:id", async (req, res) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: "Job deleted" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting job" });
  }
});

// User Schema and Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
});
const User = mongoose.model("User", userSchema);

// Register User
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 8); // Hash the password
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error registering user" });
  }
});

// Login User
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ error: "Invalid username or password" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(400).json({ error: "Invalid username or password" });

    res.json({
      message: "Login successful",
      user: { username: user.username },
    });
  } catch (error) {
    res.status(500).json({ error: "Error logging in" });
  }
});


app.get("/api/visitorCount", async (req, res) => {
  try {
    // Find the current visitor count from the database
    let visitorData = await Visitor.findOne();

    if (!visitorData) {
      // If there's no record, create one with the initial value
      visitorData = new Visitor({ count: 905, lastUpdated: Date.now() });
      await visitorData.save();
    }

    const currentTime = new Date().getTime();
    const lastIncrementTime = new Date(visitorData.lastUpdated).getTime();

    // Check if one hour has passed
    if (currentTime - lastIncrementTime >= 3600000) {
      // Increment the counter and update the lastIncrementTime
      visitorData.count += 1;
      visitorData.lastUpdated = new Date();
      await visitorData.save();
    }

    // Send the current count to the frontend
    res.json({ visitorCount: visitorData.count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

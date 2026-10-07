const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

const JWT_SECRET = process.env.JWT_SECRET || "silent-sos-demo-secret";

app.use(cors());
app.use(express.json());

/* =========================================================
   MONGODB CONNECTION
========================================================= */

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is missing in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

/* =========================================================
   USER SCHEMA
========================================================= */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

/* =========================================================
   CONTACT SCHEMA
========================================================= */

const contactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    relation: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Contact = mongoose.model("Contact", contactSchema);

/* =========================================================
   ALERT SCHEMA - PHASE 3
========================================================= */

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  latitude: {
    type: Number,
    required: true,
  },

  longitude: {
    type: Number,
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  status: {
    type: String,
    enum: ["SENT", "ACKNOWLEDGED", "RESOLVED"],
    default: "SENT",
  },

  demoOnly: {
    type: Boolean,
    default: true,
  },

  sentAt: {
    type: Date,
    default: Date.now,
  },

  acknowledgedAt: {
    type: Date,
    default: null,
  },

  resolvedAt: {
    type: Date,
    default: null,
  },

  responseTimeSeconds: {
    type: Number,
    default: null,
  },
});

const Alert = mongoose.model("Alert", alertSchema);

/* =========================================================
   JWT AUTHENTICATION MIDDLEWARE
========================================================= */

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Authorization token is required",
    });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      message: "Invalid authorization format",
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

/* =========================================================
   BASIC ROUTES
========================================================= */

app.get("/", (req, res) => {
  res.json({
    message: "SilentSOS backend is running",
    demoOnly: true,
  });
});

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", async (req, res) => {
  try {
    const mongoState = mongoose.connection.readyState;

    const databaseStatus =
      mongoState === 1 ? "connected" : "disconnected";

    res.json({
      status: "online",
      server: "running",
      database: databaseStatus,
      demoOnly: true,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      status: "offline",
      message: error.message,
    });
  }
});

/* =========================================================
   REGISTER
========================================================= */

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(201).json({
      message: "Registration successful",
      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      message: "Registration failed",
    });
  }
});

/* =========================================================
   LOGIN
========================================================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      message: "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Login failed",
    });
  }
});

/* =========================================================
   USER PROFILE
========================================================= */

app.get(
  "/api/auth/profile",
  authenticateToken,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.userId).select(
        "-password"
      );

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Profile error:", error);

      res.status(500).json({
        message: "Unable to load profile",
      });
    }
  }
);

/* =========================================================
   GET USER CONTACTS
========================================================= */

app.get(
  "/api/contacts",
  authenticateToken,
  async (req, res) => {
    try {
      const contacts = await Contact.find({
        userId: req.user.userId,
      }).sort({
        createdAt: -1,
      });

      res.json(contacts);
    } catch (error) {
      console.error("Get contacts error:", error);

      res.status(500).json({
        message: "Unable to load contacts",
      });
    }
  }
);

/* =========================================================
   ADD USER CONTACT
========================================================= */

app.post(
  "/api/contacts",
  authenticateToken,
  async (req, res) => {
    try {
      const { name, phone, relation } = req.body;

      if (!name || !phone) {
        return res.status(400).json({
          message: "Name and phone number are required",
        });
      }

      const contact = await Contact.create({
        userId: req.user.userId,
        name: name.trim(),
        phone: phone.trim(),
        relation: relation ? relation.trim() : "",
      });

      res.status(201).json({
        message: "Emergency contact added successfully",
        contact,
      });
    } catch (error) {
      console.error("Add contact error:", error);

      res.status(500).json({
        message: "Unable to add contact",
      });
    }
  }
);

/* =========================================================
   GET USER SOS ALERTS
========================================================= */

app.get(
  "/api/sos",
  authenticateToken,
  async (req, res) => {
    try {
      const alerts = await Alert.find({
        userId: req.user.userId,
      }).sort({
        createdAt: -1,
      });

      res.json(alerts);
    } catch (error) {
      console.error("Get SOS alerts error:", error);

      res.status(500).json({
        message: "Unable to load SOS history",
      });
    }
  }
);

/* =========================================================
   CREATE USER SOS ALERT
   DEMO ONLY
========================================================= */

app.post(
  "/api/sos",
  authenticateToken,
  async (req, res) => {
    try {
      const { latitude, longitude } = req.body;

      if (
        typeof latitude !== "number" ||
        typeof longitude !== "number"
      ) {
        return res.status(400).json({
          message: "Valid latitude and longitude are required",
        });
      }

      const sentAt = new Date();

      const alert = await Alert.create({
        userId: req.user.userId,

        latitude,
        longitude,

        status: "SENT",

        demoOnly: true,

        sentAt,

        createdAt: sentAt,
      });

      res.status(201).json({
        message:
          "Demo request saved to MongoDB. Nobody was notified.",

        alert,
      });
    } catch (error) {
      console.error("Create SOS error:", error);

      res.status(500).json({
        message: "Unable to create SOS alert",
      });
    }
  }
);

/* =========================================================
   ACKNOWLEDGE SOS ALERT
   DEMO ONLY
========================================================= */

app.patch(
  "/api/sos/:id/acknowledge",
  authenticateToken,
  async (req, res) => {
    try {
      const alert = await Alert.findOne({
        _id: req.params.id,
        userId: req.user.userId,
      });

      if (!alert) {
        return res.status(404).json({
          message: "SOS alert not found",
        });
      }

      if (alert.status !== "SENT") {
        return res.status(400).json({
          message:
            "Only SENT alerts can be acknowledged",
        });
      }

      const acknowledgedAt = new Date();

      const responseTimeSeconds = Math.max(
        0,
        Math.round(
          (acknowledgedAt.getTime() -
            new Date(alert.sentAt).getTime()) /
            1000
        )
      );

      alert.status = "ACKNOWLEDGED";

      alert.acknowledgedAt = acknowledgedAt;

      alert.responseTimeSeconds =
        responseTimeSeconds;

      await alert.save();

      res.json({
        message:
          "Demo SOS alert acknowledged successfully",

        alert,
      });
    } catch (error) {
      console.error(
        "Acknowledge SOS error:",
        error
      );

      res.status(500).json({
        message: "Unable to acknowledge SOS alert",
      });
    }
  }
);

/* =========================================================
   RESOLVE SOS ALERT
   DEMO ONLY
========================================================= */

app.patch(
  "/api/sos/:id/resolve",
  authenticateToken,
  async (req, res) => {
    try {
      const alert = await Alert.findOne({
        _id: req.params.id,
        userId: req.user.userId,
      });

      if (!alert) {
        return res.status(404).json({
          message: "SOS alert not found",
        });
      }

      if (alert.status !== "ACKNOWLEDGED") {
        return res.status(400).json({
          message:
            "Only ACKNOWLEDGED alerts can be resolved",
        });
      }

      alert.status = "RESOLVED";

      alert.resolvedAt = new Date();

      await alert.save();

      res.json({
        message:
          "Demo SOS alert resolved successfully",

        alert,
      });
    } catch (error) {
      console.error(
        "Resolve SOS error:",
        error
      );

      res.status(500).json({
        message: "Unable to resolve SOS alert",
      });
    }
  }
);

/* =========================================================
   404 HANDLER
========================================================= */

app.use((req, res) => {
  res.status(404).json({
    message: "API endpoint not found",
    path: req.originalUrl,
  });
});

/* =========================================================
   SERVER START
========================================================= */

app.listen(PORT, () => {
  console.log(
    `SilentSOS backend running at http://localhost:${PORT}`
  );

  console.log(
    "DEMO MODE: No emergency notifications are sent."
  );
});
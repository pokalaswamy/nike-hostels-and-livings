
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const prisma = require('./prisma');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. Authentication Middleware
// ==========================================

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      message: 'Authentication token is required',
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message: 'JWT configuration is missing',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: 'User account not found',
      });
    }

    req.user = {
      userId: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return res.status(403).json({
        message: 'Invalid or expired token',
      });
    }

    console.error('Authentication Error:', error);

    return res.status(500).json({
      message: 'Authentication failed',
    });
  }
}

// ==========================================
// 2. Role-Based Authorization Middleware
// ==========================================

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (
      !req.user ||
      !allowedRoles.includes(req.user.role)
    ) {
      return res.status(403).json({
        message: 'Access denied: insufficient permissions',
      });
    }

    next();
  };
}

// ==========================================
// 3. Date and Time Validation Helpers
// ==========================================

function isValidDate(date) {
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return false;
  }

  const [year, month, day] = date.split('-').map(Number);

  const parsed = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isValidTime(time) {
  return (
    typeof time === 'string' &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  );
}

function getIndiaDateTime() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const values = {};

  for (const part of parts) {
    values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

// ==========================================
// 4. Student Registration
// ==========================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      rollNumber,
      roomNumber,
      department,
    } = req.body;

    if (
      typeof name !== 'string' || !name.trim() ||
      typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' ||
      typeof rollNumber !== 'string' || !rollNumber.trim() ||
      typeof roomNumber !== 'string' || !roomNumber.trim() ||
      typeof department !== 'string' || !department.trim()
    ) {
      return res.status(400).json({
        message: 'Please provide all required registration details',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRollNumber = rollNumber.trim();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { rollNumber: normalizedRollNumber },
        ],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'Email or roll number is already registered',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone:
          typeof phone === 'string' && phone.trim()
            ? phone.trim()
            : null,
        rollNumber: normalizedRollNumber,
        roomNumber: roomNumber.trim(),
        department: department.trim(),
        role: 'STUDENT',
      },
      select: {
        id: true,
        name: true,
        email: true,
        rollNumber: true,
        roomNumber: true,
        department: true,
        role: true,
      },
    });

    res.status(201).json({
      message: 'Student registered successfully',
      data: user,
    });
  } catch (error) {
    console.error('Registration Error:', error);

    res.status(500).json({
      message: 'Student registration failed',
    });
  }
});

// ==========================================
// 5. Student Login
// ==========================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'JWT configuration is missing',
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d',
      }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        roomNumber: user.roomNumber,
        department: user.department,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);

    res.status(500).json({
      message: 'Login failed',
    });
  }
});

// ==========================================
// 6. Get Logged-in User Profile
// ==========================================

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        rollNumber: true,
        roomNumber: true,
        department: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Profile Error:', error);

    res.status(500).json({
      message: 'Failed to fetch profile',
    });
  }
});

// ==========================================
// 7. Test API
// ==========================================

app.get('/', (req, res) => {
  res.send('Hostel Gate Pass Management API is running!');
});

// ==========================================
// 8. Warden Gets All Gate Pass Requests
// ==========================================

app.get(
  '/api/gatepasses',
  authenticateToken,
  authorizeRoles('WARDEN', 'ADMIN'),
  async (req, res) => {
    try {
      const gatePasses = await prisma.gatePass.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json(gatePasses);
    } catch (error) {
      console.error('Fetch Gate Pass Error:', error);

      res.status(500).json({
        message: 'Failed to fetch Gate Pass requests',
      });
    }
  }
);

// ==========================================
// 9. Warden Views All Registered Students
// ==========================================

app.get(
  '/api/students',
  authenticateToken,
  authorizeRoles('WARDEN', 'ADMIN'),
  async (req, res) => {
    try {
      const students = await prisma.user.findMany({
        where: {
          role: 'STUDENT',
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          rollNumber: true,
          roomNumber: true,
          department: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json({
        message: 'Students retrieved successfully',
        totalStudents: students.length,
        data: students,
      });
    } catch (error) {
      console.error('Fetch Students Error:', error);

      res.status(500).json({
        message: 'Failed to fetch students',
      });
    }
  }
);

// ==========================================
// 10. Student Views Their Gate Pass History
// ==========================================

app.get(
  '/api/my-gatepasses',
  authenticateToken,
  authorizeRoles('STUDENT'),
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.user.userId,
        },
      });

      if (!user || !user.rollNumber) {
        return res.status(404).json({
          message: 'Student profile or roll number not found',
        });
      }

      const gatepasses = await prisma.gatePass.findMany({
        where: {
          rollNumber: user.rollNumber,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.status(200).json({
        message: 'Gate pass history retrieved successfully',
        data: gatepasses,
      });
    } catch (error) {
      console.error('Gate Pass History Error:', error);

      res.status(500).json({
        message: 'Failed to retrieve gate pass history',
      });
    }
  }
);

// ==========================================
// 11. Student Submits Gate Pass
// ==========================================

app.post(
  '/api/gatepass',
  authenticateToken,
  authorizeRoles('STUDENT'),
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.user.userId,
        },
      });

      if (!user || !user.rollNumber) {
        return res.status(404).json({
          message: 'Student profile not found',
        });
      }

      const {
        contactNumber,
        reason,
        description,
        departureDate,
        departureTime,
        returnDate,
        returnTime,
      } = req.body;

      const requiredFields = {
        contactNumber,
        reason,
        departureDate,
        departureTime,
        returnDate,
        returnTime,
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([, value]) =>
          typeof value !== 'string' || !value.trim()
        )
        .map(([key]) => key);

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: 'Please provide all required fields',
          missingFields,
        });
      }

      if (!/^[0-9]{10}$/.test(contactNumber.trim())) {
        return res.status(400).json({
          message: 'Please enter a valid 10-digit contact number',
        });
      }

      if (
        !isValidDate(departureDate.trim()) ||
        !isValidDate(returnDate.trim())
      ) {
        return res.status(400).json({
          message: 'Invalid date. Use YYYY-MM-DD format.',
        });
      }

      if (
        !isValidTime(departureTime.trim()) ||
        !isValidTime(returnTime.trim())
      ) {
        return res.status(400).json({
          message: 'Invalid time. Use 24-hour HH:mm format.',
        });
      }

      const departureDateTime =
        `${departureDate.trim()}T${departureTime.trim()}`;

      const currentDateTime = getIndiaDateTime();

      if (departureDateTime <= currentDateTime) {
        return res.status(400).json({
          message: 'Departure date and time must be in the future.',
        });
      }

      const returnDateTime =
        `${returnDate.trim()}T${returnTime.trim()}`;

      if (returnDateTime <= departureDateTime) {
        return res.status(400).json({
          message: 'Return date and time must be after departure date and time.',
        });
      }

      const gatePass = await prisma.gatePass.create({
        data: {
          studentName: user.name,
          rollNumber: user.rollNumber,
          roomNumber: user.roomNumber,
          department: user.department,
          contactNumber: contactNumber.trim(),
          reason: reason.trim(),
          description:
            typeof description === 'string' && description.trim()
              ? description.trim()
              : null,
          departureDate: departureDate.trim(),
          departureTime: departureTime.trim(),
          returnDate: returnDate.trim(),
          returnTime: returnTime.trim(),
        },
      });

      res.status(201).json({
        message: 'Gate Pass submitted successfully!',
        data: gatePass,
      });
    } catch (error) {
      console.error('Gate Pass Submission Error:', error);

      res.status(500).json({
        message: 'Failed to submit Gate Pass',
      });
    }
  }
);

// ==========================================
// 12. Warden Approves Gate Pass
// ==========================================

app.put(
  '/api/gatepass/:id/approve',
  authenticateToken,
  authorizeRoles('WARDEN', 'ADMIN'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message: 'Invalid Gate Pass ID',
        });
      }

      const token = crypto.randomBytes(32).toString('hex');

      const result = await prisma.gatePass.updateMany({
        where: {
          id,
          status: 'PENDING',
        },
        data: {
          status: 'APPROVED',
          qrToken: token,
        },
      });

      if (result.count === 0) {
        return res.status(404).json({
          message: 'Pending Gate Pass not found or already processed',
        });
      }

      const approvedPass = await prisma.gatePass.findUnique({
        where: { id },
      });

      res.status(200).json({
        message: 'Gate Pass approved successfully!',
        data: approvedPass,
      });
    } catch (error) {
      console.error('Approval Error:', error);

      res.status(500).json({
        message: 'Failed to approve Gate Pass',
      });
    }
  }
);

// ==========================================
// 13. Warden Rejects Gate Pass
// ==========================================

app.put(
  '/api/gatepass/:id/reject',
  authenticateToken,
  authorizeRoles('WARDEN', 'ADMIN'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message: 'Invalid Gate Pass ID',
        });
      }

      const result = await prisma.gatePass.updateMany({
        where: {
          id,
          status: 'PENDING',
        },
        data: {
          status: 'REJECTED',
          qrToken: null,
        },
      });

      if (result.count === 0) {
        return res.status(404).json({
          message: 'Pending Gate Pass not found or already processed',
        });
      }

      const rejectedPass = await prisma.gatePass.findUnique({
        where: { id },
      });

      res.status(200).json({
        message: 'Gate Pass rejected successfully!',
        data: rejectedPass,
      });
    } catch (error) {
      console.error('Rejection Error:', error);

      res.status(500).json({
        message: 'Failed to reject Gate Pass',
      });
    }
  }
);

// ==========================================
// 14. Generate and Download Gate Pass PDF
// ==========================================

app.get('/api/gatepass/:id/pdf', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: 'Invalid Gate Pass ID',
      });
    }

    const gatePass = await prisma.gatePass.findUnique({
      where: { id },
    });

    if (!gatePass) {
      return res.status(404).json({
        message: 'Gate Pass not found',
      });
    }

    if (gatePass.status !== 'APPROVED' || !gatePass.qrToken) {
      return res.status(403).json({
        message: 'Only approved Gate Passes can download PDF',
      });
    }

    const qrBuffer = await QRCode.toBuffer(gatePass.qrToken, {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'H',
    });

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="GatePass-${gatePass.id}.pdf"`
    );

    doc.pipe(res);

    doc.fontSize(24).text('HOSTEL GATE PASS', {
      align: 'center',
    });

    doc.moveDown(0.5);

    doc.fontSize(12).text(`Gate Pass ID: ${gatePass.id}`, {
      align: 'center',
    });

    doc.moveDown();
    doc.fontSize(16).text('STUDENT INFORMATION');
    doc.moveDown(0.5);
    doc.fontSize(12);

    doc.text(`Student Name: ${gatePass.studentName}`);
    doc.text(`Roll Number: ${gatePass.rollNumber}`);
    doc.text(`Room Number: ${gatePass.roomNumber}`);
    doc.text(`Department: ${gatePass.department}`);
    doc.text(`Contact Number: ${gatePass.contactNumber}`);

    doc.moveDown();
    doc.fontSize(16).text('OUTING INFORMATION');
    doc.moveDown(0.5);
    doc.fontSize(12);

    doc.text(`Reason: ${gatePass.reason}`);
    doc.text(`Description: ${gatePass.description || 'N/A'}`);
    doc.text(`Departure Date: ${gatePass.departureDate}`);
    doc.text(`Departure Time: ${gatePass.departureTime}`);
    doc.text(`Return Date: ${gatePass.returnDate}`);
    doc.text(`Return Time: ${gatePass.returnTime}`);

    doc.moveDown();

    doc.fontSize(14).text('APPROVAL STATUS: APPROVED', {
      align: 'center',
    });

    doc.moveDown();

    doc.fontSize(12).text('Scan this QR code at the hostel gate:', {
      align: 'center',
    });

    doc.moveDown();

    const qrSize = 160;
    const pageWidth = doc.page.width;
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = doc.y + 10;

    doc.image(qrBuffer, qrX, qrY, {
      width: qrSize,
      height: qrSize,
    });

    doc.end();
  } catch (error) {
    console.error('PDF Generation Error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        message: 'Failed to generate Gate Pass PDF',
      });
    } else {
      res.destroy(error);
    }
  }
});

// ==========================================
// 15. Security Verifies QR Code
// ==========================================

app.post('/api/security/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (
      !token ||
      typeof token !== 'string' ||
      !token.trim()
    ) {
      return res.status(400).json({
        valid: false,
        message: 'QR token is required',
      });
    }

    const gatePass = await prisma.gatePass.findUnique({
      where: {
        qrToken: token.trim(),
      },
    });

    if (!gatePass || gatePass.status !== 'APPROVED') {
      return res.status(404).json({
        valid: false,
        message: 'Invalid Gate Pass',
      });
    }

    res.status(200).json({
      valid: true,
      message: 'Valid Gate Pass',
      data: {
        id: gatePass.id,
        studentName: gatePass.studentName,
        rollNumber: gatePass.rollNumber,
        roomNumber: gatePass.roomNumber,
        department: gatePass.department,
        reason: gatePass.reason,
        departureDate: gatePass.departureDate,
        departureTime: gatePass.departureTime,
        returnDate: gatePass.returnDate,
        returnTime: gatePass.returnTime,
      },
    });
  } catch (error) {
    console.error('QR Verification Error:', error);

    res.status(500).json({
      valid: false,
      message: 'QR verification failed',
    });
  }
});

// ==========================================
// 16. Start Backend Server
// ==========================================

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

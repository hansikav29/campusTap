const express = require('express')
const cors = require('cors') 
const { Pool } = require('pg')
const { GoogleGenAI } = require('@google/genai')

const app = express()

// 2. Battle-tested CORS middleware configuration
app.use(cors({
  origin: 'https://campus-tap.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));

app.options('*', cors())

app.use(express.json())
// Health check
app.get('/', (req, res) => {
  res.json({ status: 'CampusTap backend is running' })
})
// Ensure DATABASE_URL is set in Railway environment variables
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for some hosted Postgres instances
})

// Initialize Gemini SDK explicitly with your Railway environment key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function setupDatabase() {
  try {
    // 1. Create Tables with the new 'email' column
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        swipes INTEGER DEFAULT 0,
        dining_dollars NUMERIC(6,2) DEFAULT 0.00,
        student_nfc_id TEXT UNIQUE
      );

      CREATE TABLE IF NOT EXISTS dining_halls (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT,
        is_open BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS swipe_history (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        hall_id INTEGER REFERENCES dining_halls(id),
        swiped_at TIMESTAMP DEFAULT NOW()
      );
    `)

    // 2. Insert Demo Data if table is empty
    const check = await pool.query('SELECT COUNT(*) FROM students')
    if (check.rows[0].count === '0') {
      console.log('Seeding database with demo data...')
      
      await pool.query(`
        INSERT INTO students (name, email, swipes, dining_dollars, student_nfc_id)
        VALUES ('Hansika', 'test@uni.com', 14, 48.50, 'DEMO-001');
      `)

      await pool.query(`
        INSERT INTO dining_halls (name, location, is_open) VALUES
          ('North Dining Hall', 'North Campus', true),
          ('South Dining Hall', 'South Campus', true),
          ('The Commons', 'Central Campus', false);
      `)
    }
    console.log('Database ready and tables verified!')
  } catch (err) {
    console.error('Database setup error:', err)
  }
}

setupDatabase()

// --- ROUTES ---

// GET /student-data?email=...
app.get('/student-data', async (req, res, next) => {
  const { email } = req.query
  
  if (!email) {
    return res.status(400).json({ error: 'Email query parameter is required' })
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, swipes, dining_dollars FROM students WHERE LOWER(email) = LOWER($1)', 
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found in database' })
    }

    const student = result.rows[0];
    
    res.json({
      id: student.id,
      name: student.name,
      email: student.email,
      swipes: student.swipes,
      dining_dollars: student.dining_dollars ? parseFloat(student.dining_dollars).toFixed(2) : "0.00"
    })
    
  } catch (err) {
    next(err); 
  }
})

// AI CHATBOT ROUTE: POST /chat
app.post('/chat', async (req, res, next) => {
  const { message, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message content is required" });
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error("CRITICAL CONFIG ERROR: GEMINI_API_KEY environment variable is missing!");
    return res.status(200).json({ reply: "⚠️ Chatbot Error: My AI API key configuration is missing on the server backend." });
  }

  try {
    // Always fetch live dining hall data from DB
    let diningHalls = [];
    try {
      const hallsQuery = await pool.query(`
        SELECT d.*, COUNT(s.id) AS recent_swipes
        FROM dining_halls d
        LEFT JOIN swipe_history s ON s.hall_id = d.id AND s.swiped_at > NOW() - INTERVAL '1 hour'
        GROUP BY d.id ORDER BY d.id
      `);
      diningHalls = hallsQuery.rows.map(h => ({
        name: h.name,
        location: h.location,
        is_open: h.is_open,
        crowdedness: h.recent_swipes >= 10 ? 'Very busy' : h.recent_swipes >= 5 ? 'Busy' : h.recent_swipes >= 2 ? 'Moderate' : 'Quiet'
      }));
    } catch (dbErr) {
      console.error("Database context query failed, proceeding without it:", dbErr.message);
    }

    const studentInfo = context?.student
      ? `Student name: ${context.student.name}, Swipes remaining: ${context.student.swipes}, Dining dollars: $${context.student.dining_dollars}`
      : 'No student info available.';

    const menuInfo = context?.menus
      ? JSON.stringify(context.menus)
      : 'No menu data provided.';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: `You are CampusTap AI, a helpful assistant for university students.

    STUDENT INFO:
    ${studentInfo}
    
    LIVE DINING HALL STATUS:
    ${JSON.stringify(diningHalls)}
    
    TODAY'S MENUS (including nutrition):
    ${menuInfo}
    
    Use all of the above to answer questions about the student's swipe balance, dining dollars, menu items, nutrition facts, hall crowding, and open hours. Be helpful, brief, and conversational.`
          }
        });
    
        return res.json({ reply: response.text });
    
      } catch (err) {
        console.error("PROCESSED GEMINI FAULT:", err);
        next(err);
      }
    });

// GET /student/:id
app.get('/student/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM students WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Student not found' })
    res.json(result.rows[0])
  } catch (err) {
    next(err);
  }
})

// GET /student/nfc/:nfc_id
app.get('/student/nfc/:nfc_id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM students WHERE student_nfc_id = $1', [req.params.nfc_id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Student not found' })
    res.json(result.rows[0])
  } catch (err) {
    next(err);
  }
})

// POST /swipe
app.post('/swipe', async (req, res, next) => {
  const { student_id, hall_id } = req.body
  if (!student_id || !hall_id) {
    return res.status(400).json({ error: 'student_id and hall_id are required' })
  }
  try {
    const result = await pool.query(
      'UPDATE students SET swipes = GREATEST(swipes - 1, 0) WHERE id = $1 RETURNING swipes',
      [student_id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Student not found' })

    await pool.query(
      'INSERT INTO swipe_history (student_id, hall_id, swiped_at) VALUES ($1, $2, NOW())',
      [student_id, hall_id]
    )
    res.json({ swipes_remaining: result.rows[0].swipes })
  } catch (err) {
    next(err);
  }
})

// GET /dining-halls
app.get('/dining-halls', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT d.*, COUNT(s.id) AS recent_swipes
      FROM dining_halls d
      LEFT JOIN swipe_history s ON s.hall_id = d.id AND s.swiped_at > NOW() - INTERVAL '1 hour'
      GROUP BY d.id ORDER BY d.id
    `)
    
    const halls = result.rows.map(h => ({
      ...h,
      crowdedness: h.recent_swipes >= 10 ? 'Very busy' : h.recent_swipes >= 5 ? 'Busy' : h.recent_swipes >= 2 ? 'Moderate' : 'Quiet'
    }))
    res.json(halls)
  } catch (err) {
    next(err);
  }
})

// 3. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error("GLOBAL SERVER ERROR CAUGHT:", err.stack);
  res.header("Access-Control-Allow-Origin", "https://campus-tap.vercel.app");
  res.status(500).json({ 
    error: "Internal Server Error", 
    message: err.message 
  });
});
const PORT = process.env.PORT
if (!PORT) {
  console.error('ERROR: PORT environment variable not set!')
  process.exit(1)
}
app.listen(PORT, '0.0.0.0', () => console.log(`CampusTap backend running on port ${PORT}`))

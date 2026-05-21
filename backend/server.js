const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const { GoogleGenAI } = require('@google/genai')

const app = express()

// 1. Configure CORS to specifically trust your Vercel frontend
app.use(cors({
  origin: ['https://campus-tap.vercel.app', 'http://127.0.0.1:5500', 'http://localhost:5500'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

// 2. Explicitly handle the browser preflight checks globally
app.options('*', cors())

app.use(express.json())

// Ensure DATABASE_URL is set in Railway environment variables
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for some hosted Postgres instances
})

// Initialize Gemini SDK (Reads process.env.GEMINI_API_KEY automatically)
const ai = new GoogleGenAI({});

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
      
      // IMPORTANT: Replace the email below with your Firebase tester email
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
app.get('/student-data', async (req, res) => {
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
    console.error("Route error:", err.message);
    res.status(500).json({ error: err.message })
  }
})

// NEW AI CHATBOT ROUTE: POST /chat
app.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message content is required" });
  }

  try {
    // Gather database metrics context for the AI system instruction mapping
    const hallsQuery = await pool.query(`
      SELECT d.*, COUNT(s.id) AS recent_swipes
      FROM dining_halls d
      LEFT JOIN swipe_history s ON s.hall_id = d.id AND s.swiped_at > NOW() - INTERVAL '1 hour'
      GROUP BY d.id ORDER BY d.id
    `);
    
    const contextMap = hallsQuery.rows.map(h => ({
      name: h.name,
      location: h.location,
      is_open: h.is_open,
      crowdedness: h.recent_swipes >= 10 ? 'Very busy' : h.recent_swipes >= 5 ? 'Busy' : h.recent_swipes >= 2 ? 'Moderate' : 'Quiet'
    }));

    // Call the high speed gemini-2.5-flash text model
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: `You are CampusTap AI, an assistant for university students. 
        Use this live campus database snapshot to accurately answer crowding or availability questions: 
        ${JSON.stringify(contextMap)}. Keep answers helpful, brief, and highly conversational.`
      }
    });

    res.json({ reply: response.text });
  } catch (err) {
    console.error("Gemini Route Error:", err.message);
    res.status(500).json({ error: "The campus assistant service is currently unavailable." });
  }
});

// GET /student/:id
app.get('/student/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Student not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /student/nfc/:nfc_id
app.get('/student/nfc/:nfc_id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students WHERE student_nfc_id = $1', [req.params.nfc_id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Student not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /swipe
app.post('/swipe', async (req, res) => {
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
    res.status(500).json({ error: err.message })
  }
})

// GET /dining-halls
app.get('/dining-halls', async (req, res) => {
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
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`CampusTap backend running on port ${PORT}`))

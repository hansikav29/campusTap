const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')

const app = express()
app.use(cors())
app.use(express.json())

// Railway auto-provides DATABASE_URL
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Auto-create tables when server starts
async function setupDatabase() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        swipes INTEGER DEFAULT 0,
        dining_dollars NUMERIC(6,2) DEFAULT 0.00
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
        swiped_at TIMESTAMP DEFAULT NOW()
      );
    `)
  
    // Add starting data if no students exist yet
    const check = await pool.query('SELECT COUNT(*) FROM students')
    if (check.rows[0].count === '0') {
      await pool.query(`
        INSERT INTO students (name, swipes, dining_dollars)
        VALUES ('Hansika', 14, 48.50);
  
        INSERT INTO dining_halls (name, location, is_open) VALUES
          ('North Dining Hall', 'North Campus', true),
          ('South Dining Hall', 'South Campus', true),
          ('The Commons', 'Central Campus', false);
      `)
    }
  
    console.log('Database ready!')
  }
  
  setupDatabase()

// GET /student/:id — fetch student info
app.get('/student/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM students WHERE id = $1', [req.params.id]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /swipe — log a swipe and decrement count
app.post('/swipe', async (req, res) => {
  const { student_id } = req.body
  try {
    const result = await pool.query(
      'UPDATE students SET swipes = GREATEST(swipes - 1, 0) WHERE id = $1 RETURNING swipes',
      [student_id]
    )
    await pool.query(
      'INSERT INTO swipe_history (student_id, swiped_at) VALUES ($1, NOW())',
      [student_id]
    )
    res.json({ swipes_remaining: result.rows[0].swipes })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /dining-halls — list all dining halls
app.get('/dining-halls', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM dining_halls')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(3000, () => console.log('CampusTap backend running on port 3000'))

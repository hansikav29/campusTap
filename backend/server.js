const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')

const app = express()
app.use(cors())
app.use(express.json())

// Railway auto-provides DATABASE_URL
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

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
    // Decrement swipe count (don't go below 0)
    const result = await pool.query(
      `UPDATE students SET swipes = GREATEST(swipes - 1, 0)
       WHERE id = $1 RETURNING swipes`,
      [student_id]
    )
    // Log it to history
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
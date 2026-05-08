CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  swipes INTEGER DEFAULT 0,
  dining_dollars NUMERIC(6,2) DEFAULT 0.00
);

CREATE TABLE dining_halls (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  is_open BOOLEAN DEFAULT true
);

CREATE TABLE swipe_history (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  swiped_at TIMESTAMP DEFAULT NOW()
);

-- Fake data to start
INSERT INTO students (name, swipes, dining_dollars)
VALUES ('Hansika', 14, 48.50);

INSERT INTO dining_halls (name, location, is_open) VALUES
  ('North Dining Hall', 'North Campus', true),
  ('South Dining Hall', 'South Campus', true),
  ('The Commons', 'Central Campus', false);
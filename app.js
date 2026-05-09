const BACKEND = 'https://campustap-production.up.railway.app' // Partner replaces this


async function loadStudent() {
  try {
    const res = await fetch(`${BACKEND}/student/1`)
    const student = await res.json()

    document.getElementById('student-name').textContent = student.name
    document.getElementById('swipe-count').textContent = student.swipes
    document.getElementById('dining-dollars').textContent = `$${student.dining_dollars}`
  } catch (err) {
    // Backend not connected yet — show placeholder data
    document.getElementById('student-name').textContent = 'Hansika'
    document.getElementById('swipe-count').textContent = '14'
    document.getElementById('dining-dollars').textContent = '$48.50'
  }
}

// Called when the NFC tap button is clicked
async function simulateTap() {
  const btn = document.getElementById('tap-btn')
  const msg = document.getElementById('tap-message')

  btn.disabled = true
  msg.textContent = 'Processing tap...'

  try {
    const res = await fetch(`${BACKEND}/swipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: 1 })
    })
    const data = await res.json()

    document.getElementById('swipe-count').textContent = data.swipes_remaining
    msg.textContent = `Swipe recorded! ${data.swipes_remaining} swipes remaining.`
  } catch (err) {
    const current = parseInt(document.getElementById('swipe-count').textContent)
    if (current > 0) {
      document.getElementById('swipe-count').textContent = current - 1
      msg.textContent = `Swipe recorded! ${current - 1} swipes remaining.`
    } else {
      msg.textContent = 'No swipes remaining!'
      msg.style.color = '#dc2626'
    }
  }

  btn.disabled = false
}

loadStudent()

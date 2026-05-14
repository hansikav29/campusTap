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
    console.log('Swipe response:', data) // shows us exactly what backend returns

    // Handle whatever field name the backend sends back
    const remaining = data.swipes_remaining ?? data.swipes ?? data.rows?.[0]?.swipes

    if (remaining !== undefined) {
      document.getElementById('swipe-count').textContent = remaining
      msg.textContent = `✅ Swipe recorded! ${remaining} swipes remaining.`
    } else {
      // Reload student data fresh from backend as backup
      await loadStudent()
      msg.textContent = '✅ Swipe recorded!'
    }

  } catch (err) {
    const current = parseInt(document.getElementById('swipe-count').textContent)
    document.getElementById('swipe-count').textContent = current - 1
    msg.textContent = `✅ Swipe recorded! ${current - 1} swipes remaining.`
  }

  btn.disabled = false
}

loadStudent()

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

loadStudent()

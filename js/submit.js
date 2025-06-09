document.getElementById('submitBtn').addEventListener('click', async () => {
  const studentId = document.getElementById('studentId').value.trim();
  const title = document.getElementById('titleInput').value.trim();
  const latex = document.getElementById('problemInput').getValue();

  if (!studentId || !title || !latex) {
    alert('Please fill out all fields!');
    return;
  }

  const payload = { studentId, title, latex };

  try {
    const response = await fetch('https://YOUR_CLOUD_FUNCTION_URL/assignProblem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const statusMsg = document.getElementById('statusMsg');

    if (response.ok) {
      statusMsg.textContent = '✔️ Sent successfully!';
    } else {
      const err = await response.text();
      statusMsg.textContent = '❌ Error: ' + err;
    }
  } catch (err) {
    document.getElementById('statusMsg').textContent = '❌ Request failed: ' + err.message;
  }
});
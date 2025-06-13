// public/submit.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmalQCWEtLcpsHGvSeZZfNoPblDLSqqiw",
  authDomain: "qquip-21c6e.firebaseapp.com",
  projectId: "qquip-21c6e",
  storageBucket: "qquip-21c6e.firebasestorage.app",
  messagingSenderId: "714307621081",
  appId: "1:714307621081:web:6a21b469b09c0b7fc46ec8",
  measurementId: "G-EBJ84MCBBR"
};

const app           = initializeApp(firebaseConfig);
const auth          = getAuth(app);
const db            = getFirestore(app);
const functionsBase = "https://us-central1-qquip-21c6e.cloudfunctions.net";

const authContainer      = document.getElementById("authContainer");
const submitContainer    = document.getElementById("submitContainer");
const dashboardContainer = document.getElementById("dashboardContainer");
const questionList       = document.getElementById("questionList");

function showAuth() {
  authContainer.style.display      = "block";
  submitContainer.style.display    = "none";
  dashboardContainer.style.display = "none";
}

function showTutor() {
  authContainer.style.display      = "none";
  submitContainer.style.display    = "block";
  dashboardContainer.style.display = "block";
  buildKeyboard("studentKeyboard", insertToProblem);

  // load this tutor's questions
  const uid = auth.currentUser.uid;
  const q   = query(
    collection(db, "problems"),
    where("tutorId", "==", uid),
    orderBy("createdAt", "desc")
  );
  onSnapshot(q, snap => {
    questionList.innerHTML = "";
    snap.forEach(doc => {
      const d = doc.data();
      const li = document.createElement("li");
      li.dataset.id = doc.id;
      li.innerHTML = `
        <strong>${d.title}</strong><br>
        <em>Student:</em> ${d.studentId}<br>
        <em>Problem:</em> ${d.plainText}<br>
        <em>Answer:</em> ${d.answerText || "<i>Not answered</i>"}
      `;
      questionList.appendChild(li);
    });
  });
}

onAuthStateChanged(auth, user => {
  user ? showTutor() : showAuth();
});

// Auth
window.login = async () => {
  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById("email").value.trim(),
      document.getElementById("password").value
    );
    document.getElementById("authStatusMsg").textContent = "✔️ Logged in!";
  } catch (e) {
    document.getElementById("authStatusMsg").textContent = "❌ " + e.message;
  }
};
window.signUp = async () => {
  try {
    await createUserWithEmailAndPassword(
      auth,
      document.getElementById("email").value.trim(),
      document.getElementById("password").value
    );
    document.getElementById("authStatusMsg").textContent = "✔️ Account created!";
  } catch (e) {
    document.getElementById("authStatusMsg").textContent = "❌ " + e.message;
  }
};
window.forgotPassword = async () => {
  try {
    await sendPasswordResetEmail(
      auth,
      document.getElementById("email").value.trim()
    );
    document.getElementById("authStatusMsg").textContent = "📧 Reset email sent!";
  } catch (e) {
    document.getElementById("authStatusMsg").textContent = "❌ " + e.message;
  }
};

// Math keyboard
const mathButtons = [ /* your symbols… */ ];
function buildKeyboard(containerId, insertFn) {
  const kb = document.getElementById(containerId);
  kb.innerHTML = "";
  mathButtons.forEach(sym => {
    const btn = document.createElement("button");
    btn.textContent = sym;
    btn.onclick   = () => insertFn(sym);
    kb.appendChild(btn);
  });
}
function insertToProblem(symbol) {
  const ta = document.getElementById("problemText");
  const start = ta.selectionStart,
        end   = ta.selectionEnd;
  if (symbol === "⌫") {
    ta.value = ta.value.slice(0, start - 1) + ta.value.slice(end);
    ta.selectionStart = ta.selectionEnd = start - 1;
    return;
  }
  if (symbol === "Clear") {
    ta.value = "";
    return;
  }
  const val = symbol === "␣" ? " " : symbol === "Frac" ? "/" : symbol;
  ta.value = ta.value.slice(0, start) + val + ta.value.slice(end);
  ta.selectionStart = ta.selectionEnd = start + val.length;
  ta.focus();
}

// POST to your HTTPS Function
document.getElementById("submitBtn").addEventListener("click", async () => {
  const studentId = document.getElementById("studentId").value.trim();
  const title     = document.getElementById("titleInput").value.trim();
  const plainText = document.getElementById("problemText").value.trim();
  if (!studentId || !title || !plainText) {
    return alert("Please fill out all fields!");
  }

  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch(`${functionsBase}/assignProblem`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${idToken}`
    },
    body: JSON.stringify({ studentId, title, plainText })
  });

  if (res.ok) {
    const { problemId } = await res.json();
    document.getElementById("statusMsg").textContent = `✔️ Sent! (${problemId})`;
  } else {
    document.getElementById("statusMsg").textContent = "❌ " + await res.text();
  }
});
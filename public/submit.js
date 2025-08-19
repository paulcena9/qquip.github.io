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
  onSnapshot,
  deleteDoc,
  setDoc,
  serverTimestamp,
  doc as firestoreDoc
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
import { getStorage, ref, uploadString, uploadBytes, getDownloadURL } 
  from "https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js";
let quill;
const slides = [];
const slideCreatorContainer = document.getElementById("slideCreatorContainer");
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

// Navigation functions for improved UX
window.showDashboard = () => {
  authContainer.style.display      = "none";
  submitContainer.style.display    = "none";
  slideCreatorContainer.style.display = "none";
  dashboardContainer.style.display = "block";
};

window.showProblemCreator = () => {
  authContainer.style.display      = "none";
  submitContainer.style.display    = "block";
  slideCreatorContainer.style.display = "none";
  dashboardContainer.style.display = "none";
  
  // Clear form fields
  document.getElementById("studentId").value = "";
  document.getElementById("titleInput").value = "";
  document.getElementById("problemText").value = "";
  document.getElementById("statusMsg").textContent = "";
  document.getElementById("statusMsg").className = "";
};

window.logout = async () => {
  if (confirm("Are you sure you want to logout?")) {
    try {
      await auth.signOut();
      showAuth();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }
};

function showAuth() {
  authContainer.style.display      = "block";
  submitContainer.style.display    = "none";
  dashboardContainer.style.display = "none";
}

function showTutor() {
  showDashboard();
  buildKeyboard("studentKeyboard", insertToProblem);

  const uid = auth.currentUser.uid;
  const q = query(
    collection(db, "problems"),
    where("tutorId", "==", uid),
    orderBy("createdAt", "desc")
  );
  
  onSnapshot(q, snap => {
    questionList.innerHTML = "";
    const problemCount = snap.size;
    
    // Update problem count
    const counterEl = document.getElementById("problemCount");
    if (counterEl) {
      counterEl.textContent = problemCount;
    }

    if (problemCount === 0) {
      const emptyState = document.createElement("div");
      emptyState.style.textAlign = "center";
      emptyState.style.padding = "var(--space-8)";
      emptyState.style.color = "var(--gray-500)";
      emptyState.innerHTML = `
        <div style="font-size: var(--font-size-4xl); margin-bottom: var(--space-4);">📝</div>
        <h3 style="margin: 0 0 var(--space-2) 0; color: var(--gray-600);">No problems assigned yet</h3>
        <p style="margin: 0; font-size: var(--font-size-sm);">Create your first homework problem to get started!</p>
      `;
      questionList.appendChild(emptyState);
      return;
    }

    snap.forEach(docSnap => {
      const d = docSnap.data();
      const id = docSnap.id;
      const createdAt = d.createdAt?.toDate();
      const timeAgo = createdAt ? getTimeAgo(createdAt) : "Unknown time";

      // build the list item with improved styling
      const li = document.createElement("li");
      li.dataset.id = id;
      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3);">
          <div>
            <h3 style="margin: 0 0 var(--space-1) 0; color: var(--gray-800); font-size: var(--font-size-lg);">${escapeHtml(d.title)}</h3>
            <div style="font-size: var(--font-size-xs); color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.05em;">
              Student: ${escapeHtml(d.studentId)} • ${timeAgo}
            </div>
          </div>
          <div style="background: ${d.answered ? 'var(--success-100)' : 'var(--warning-100)'}; color: ${d.answered ? 'var(--success-700)' : 'var(--warning-700)'}; padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);">
            ${d.answered ? '✅ Answered' : '⏳ Pending'}
          </div>
        </div>
        <div style="background: var(--gray-50); padding: var(--space-3); border-radius: var(--radius-md); margin-bottom: var(--space-3); font-family: var(--font-family-mono); font-size: var(--font-size-sm);">
          ${escapeHtml(d.plainText)}
        </div>
        ${d.answerText ? `
          <div style="background: var(--success-50); border-left: 4px solid var(--success-500); padding: var(--space-3); margin-bottom: var(--space-3);">
            <strong style="color: var(--success-700); display: block; margin-bottom: var(--space-1); font-size: var(--font-size-sm);">Student Answer:</strong>
            <div style="font-family: var(--font-family-mono); font-size: var(--font-size-sm);">${escapeHtml(d.answerText)}</div>
          </div>
        ` : ''}
      `;

      // create the delete button with improved styling
      const delBtn = document.createElement("button");
      delBtn.textContent = "🗑️ Delete Problem";
      delBtn.className = "button-secondary";
      delBtn.style.width = "auto";
      delBtn.style.padding = "var(--space-2) var(--space-4)";
      delBtn.style.fontSize = "var(--font-size-sm)";
      delBtn.style.marginTop = "0";
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm(`Really delete "${d.title}"?\n\nThis action cannot be undone.`)) return;
        
        delBtn.disabled = true;
        delBtn.textContent = "Deleting...";
        
        try {
          await deleteDoc(firestoreDoc(db, "problems", id));
          showStatusMessage("Problem deleted successfully", "success");
        } catch (err) {
          console.error("Delete failed:", err);
          showStatusMessage("Failed to delete problem: " + err.message, "error");
          delBtn.disabled = false;
          delBtn.textContent = "🗑️ Delete Problem";
        }
      };

      li.appendChild(delBtn);
      questionList.appendChild(li);
    });
  });
}

// Utility functions for better UX
function getTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showStatusMessage(message, type = "info", elementId = "statusMsg") {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  element.textContent = message;
  element.className = `status-${type}`;
  
  // Auto-clear success messages
  if (type === "success") {
    setTimeout(() => {
      element.textContent = "";
      element.className = "";
    }, 5000);
  }
}

onAuthStateChanged(auth, user => {
  if (user) {
    showTutor();
    initSlideCreator();
  } else {
    showAuth();
  }
});

// Auth functions with improved UX
window.login = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  
  if (!email || !password) {
    showStatusMessage("Please enter both email and password", "error", "authStatusMsg");
    return;
  }
  
  const button = event.target;
  button.disabled = true;
  button.textContent = "Logging in...";
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showStatusMessage("Welcome back! Redirecting to dashboard...", "success", "authStatusMsg");
  } catch (e) {
    let errorMessage = "Login failed. Please check your credentials.";
    if (e.code === "auth/user-not-found") {
      errorMessage = "No account found with this email address.";
    } else if (e.code === "auth/wrong-password") {
      errorMessage = "Incorrect password.";
    } else if (e.code === "auth/invalid-email") {
      errorMessage = "Please enter a valid email address.";
    }
    showStatusMessage(errorMessage, "error", "authStatusMsg");
  } finally {
    button.disabled = false;
    button.textContent = "Log In";
  }
};

window.signUp = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  
  if (!email || !password) {
    showStatusMessage("Please enter both email and password", "error", "authStatusMsg");
    return;
  }
  
  if (password.length < 6) {
    showStatusMessage("Password must be at least 6 characters long", "error", "authStatusMsg");
    return;
  }
  
  const button = event.target;
  button.disabled = true;
  button.textContent = "Creating Account...";
  
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    showStatusMessage("Account created successfully! Redirecting...", "success", "authStatusMsg");
  } catch (e) {
    let errorMessage = "Account creation failed.";
    if (e.code === "auth/email-already-in-use") {
      errorMessage = "An account with this email already exists. Try logging in instead.";
    } else if (e.code === "auth/invalid-email") {
      errorMessage = "Please enter a valid email address.";
    } else if (e.code === "auth/weak-password") {
      errorMessage = "Password is too weak. Please choose a stronger password.";
    }
    showStatusMessage(errorMessage, "error", "authStatusMsg");
  } finally {
    button.disabled = false;
    button.textContent = "Create New Account";
  }
};

window.forgotPassword = async () => {
  const email = document.getElementById("email").value.trim();
  
  if (!email) {
    showStatusMessage("Please enter your email address first", "error", "authStatusMsg");
    return;
  }
  
  const button = event.target;
  button.disabled = true;
  button.textContent = "Sending Reset Email...";
  
  try {
    await sendPasswordResetEmail(auth, email);
    showStatusMessage("Password reset email sent! Check your inbox.", "success", "authStatusMsg");
  } catch (e) {
    let errorMessage = "Failed to send reset email.";
    if (e.code === "auth/user-not-found") {
      errorMessage = "No account found with this email address.";
    } else if (e.code === "auth/invalid-email") {
      errorMessage = "Please enter a valid email address.";
    }
    showStatusMessage(errorMessage, "error", "authStatusMsg");
  } finally {
    button.disabled = false;
    button.textContent = "Reset Password";
  }
};

// Math keyboard
const mathButtons = [
  ["7","8","9","÷"],
  ["4","5","6","×"],
  ["1","2","3","−"],
  ["/","^","*","="],
  ["√","π","e","ln"],           // only 3 on this row
  ["f(x)","|","ⅆ/ⅆx","ⅆ/ⅆt"],
  ["Frac","^","⌫","Clear"]
];

function buildKeyboard(containerId, insertFn) {
  const kb = document.getElementById(containerId);
  kb.innerHTML = "";

  // 1) Remove the CSS‐grid class so it won't fight our flex styles
  kb.classList.remove("keyboard");

  // 2) Make the keyboard a vertical flex container
  kb.style.display       = "flex";
  kb.style.flexDirection = "column";
  kb.style.rowGap        = "8px";       // space between rows
  kb.style.alignItems    = "flex-start"; // left-align each row

  // 3) Build each row as a horizontal flexbox
  mathButtons.forEach(row => {
    const rowDiv = document.createElement("div");
    rowDiv.style.display    = "flex";
    rowDiv.style.columnGap  = "4px";    // space between buttons
    rowDiv.style.flexWrap   = "nowrap";

    row.forEach(sym => {
      const btn = document.createElement("button");
      btn.style.flex      = "0 0 auto";  // don't grow or shrink
      btn.style.padding   = "8px 12px";
      btn.style.boxSizing = "border-box";

      btn.textContent = sym;
      btn.onclick     = () => insertFn(sym);
      rowDiv.appendChild(btn);
    });

    kb.appendChild(rowDiv);
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
function initSlideCreator() {
  // 1) Show a "Create Lesson" button in the dashboard
  const createBtn = document.createElement("button");
  createBtn.textContent = "🎨 Create New Lesson";
  createBtn.style.width = "auto";
  createBtn.style.padding = "var(--space-2) var(--space-4)";
  createBtn.style.fontSize = "var(--font-size-sm)";
  createBtn.style.margin = "0";
  createBtn.onclick = () => {
    authContainer.style.display      = "none";
    submitContainer.style.display    = "none";
    dashboardContainer.style.display = "none";
    slideCreatorContainer.style.display = "block";
    
    // Clear lesson form
    document.getElementById("lessonStudentId").value = "";
    document.getElementById("lessonTitle").value = "";
    if (quill) quill.setContents([]);
    document.getElementById("imageUpload").value = "";
    document.getElementById("pdfUpload").value = "";
    document.getElementById("lessonStatusMsg").textContent = "";
    document.getElementById("lessonStatusMsg").className = "";
    slides.length = 0; // Clear slides array
    renderSlideList();
  };

  // Add the button to the dashboard header
  const dashboardHeader = dashboardContainer.querySelector('div[style*="justify-content: space-between"]');
  if (dashboardHeader) {
    const buttonGroup = dashboardHeader.querySelector('div[style*="display: flex"]');
    if (buttonGroup) {
      buttonGroup.insertBefore(createBtn, buttonGroup.firstChild);
    }
  }

  // 2) Init Quill editor
  quill = new Quill('#editor', { 
    theme: 'snow',
    placeholder: 'Enter lesson content here...',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline'],
        ['blockquote', 'code-block'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'size': ['small', false, 'large'] }],
        [{ 'header': [1, 2, 3, false] }],
        ['clean']
      ]
    }
  });

  // 3) Add-slide button handler with validation
  document.getElementById("addSlideBtn").onclick = () => {
    const html = quill.root.innerHTML.trim();
    
    // Check if there's actually content (not just empty tags)
    const textContent = quill.getText().trim();
    if (!textContent || textContent.length === 0) {
      showStatusMessage("Please enter some content for the slide", "error", "lessonStatusMsg");
      return;
    }
    
    const fileInput = document.getElementById("imageUpload");
    const imageFile = fileInput.files[0] || null;
    
    const button = document.getElementById("addSlideBtn");
    button.disabled = true;
    button.textContent = "Adding Slide...";

    // Use FileReader to get a dataURL for preview
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = () => {
        pushSlide(html, reader.result);
        fileInput.value = "";  // reset
        quill.setContents([]); // clear editor
        showStatusMessage(`Slide added successfully! Total: ${slides.length} slides`, "success", "lessonStatusMsg");
        button.disabled = false;
        button.textContent = "➕ Add This Slide";
      };
      reader.readAsDataURL(imageFile);
    } else {
      pushSlide(html, null);
      quill.setContents([]); // clear editor
      showStatusMessage(`Slide added successfully! Total: ${slides.length} slides`, "success", "lessonStatusMsg");
      button.disabled = false;
      button.textContent = "➕ Add This Slide";
    }
  };

  document.getElementById("publishLessonBtn").onclick = uploadSlidesAndPublish;

  async function uploadSlidesAndPublish() {
  if (slides.length === 0) {
    return alert("You need to add at least one slide before publishing!");
  }

  const studentId = document.getElementById("lessonStudentId").value.trim();
  if (!studentId) {
    return alert("Please enter a Student ID!");
  }

  const title = document.getElementById("lessonTitle").value.trim();
  const uid   = auth.currentUser.uid;
  const storage = getStorage(app);

  // 1) Upload slide images as before
  const slidesForFirestore = await Promise.all(
    slides.map(async (s, i) => {
      let imageUrl = null;
      if (s.imageDataUrl) {
        const imgRef = ref(storage, `lessons/${uid}/${Date.now()}_slide${i}.png`);
        await uploadString(imgRef, s.imageDataUrl, "data_url");
        imageUrl = await getDownloadURL(imgRef);
      }
      return {
        contentHtml: s.contentHtml,  // this is your slide content
        imageUrl,
        order: i,
      };
    })
  );

  // 2) Prepare your lesson doc reference
  const lessonRef = firestoreDoc(collection(db, "lessons"));
  const lessonId  = lessonRef.id;

  // 3) Upload PDF if provided
  let pdfUrl = null;
const pdfFile = document.getElementById("pdfUpload").files[0];
if (pdfFile) {
  // a) create a reference under your lessons folder
  const pdfRef = ref(storage, `lessons/${uid}/${lessonId}/lesson.pdf`);
  // b) upload the raw File object
  await uploadBytes(pdfRef, pdfFile);
  // c) then grab its download URL
  pdfUrl = await getDownloadURL(pdfRef);
}

  // 4) Write the lesson document (slides + optional PDF)
  await setDoc(lessonRef, {
    tutorId: uid,
    studentId,
    title,
    slides:  slidesForFirestore,
    pdfUrl,              // null if no PDF was uploaded
    createdAt: serverTimestamp(),
  });

  document.getElementById("lessonStatusMsg").textContent =
    `✔️ Lesson published! (ID: ${lessonId})`;
}
}


function pushSlide(contentHtml, imageDataUrl) {
  const slide = { contentHtml, imageDataUrl };
  slides.push(slide);
  renderSlideList();
}

function renderSlideList() {
  const ul = document.getElementById("slideList");
  const slideCountEl = document.getElementById("slideCount");
  
  ul.innerHTML = "";
  
  // Update slide counter
  if (slideCountEl) {
    slideCountEl.textContent = `${slides.length} slide${slides.length !== 1 ? 's' : ''}`;
  }
  
  if (slides.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.style.textAlign = "center";
    emptyState.style.padding = "var(--space-8)";
    emptyState.style.color = "var(--gray-500)";
    emptyState.innerHTML = `
      <div style="font-size: var(--font-size-4xl); margin-bottom: var(--space-4);">🎬</div>
      <h3 style="margin: 0 0 var(--space-2) 0; color: var(--gray-600);">No slides created yet</h3>
      <p style="margin: 0; font-size: var(--font-size-sm);">Add your first slide using the editor above!</p>
    `;
    ul.appendChild(emptyState);
    return;
  }
  
  slides.forEach((s, i) => {
    const li = document.createElement("li");
    
    // Slide header with number and controls
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.marginBottom = "var(--space-3)";
    header.innerHTML = `
      <div style="background: var(--primary-100); color: var(--primary-700); padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);">
        Slide ${i + 1}
      </div>
    `;

    // Content preview
    const preview = document.createElement("div");
    preview.innerHTML = s.contentHtml;
    preview.style.maxHeight = "100px";
    preview.style.overflow = "hidden";
    preview.style.marginBottom = "var(--space-3)";
    preview.style.padding = "var(--space-3)";
    preview.style.background = "var(--gray-50)";
    preview.style.borderRadius = "var(--radius-md)";
    preview.style.fontSize = "var(--font-size-sm)";

    // Image preview if any
    if (s.imageDataUrl) {
      const imgContainer = document.createElement("div");
      imgContainer.style.marginBottom = "var(--space-3)";
      
      const img = document.createElement("img");
      img.src = s.imageDataUrl;
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.borderRadius = "var(--radius-md)";
      img.style.border = "2px solid var(--gray-200)";
      
      imgContainer.appendChild(img);
      li.appendChild(imgContainer);
    }

    // Action buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "var(--space-2)";
    buttonContainer.style.justifyContent = "flex-end";

    // Move up button
    if (i > 0) {
      const moveUpBtn = document.createElement("button");
      moveUpBtn.textContent = "↑";
      moveUpBtn.className = "button-secondary";
      moveUpBtn.style.width = "auto";
      moveUpBtn.style.padding = "var(--space-1) var(--space-2)";
      moveUpBtn.style.fontSize = "var(--font-size-sm)";
      moveUpBtn.style.margin = "0";
      moveUpBtn.onclick = () => {
        [slides[i-1], slides[i]] = [slides[i], slides[i-1]];
        renderSlideList();
      };
      buttonContainer.appendChild(moveUpBtn);
    }

    // Move down button
    if (i < slides.length - 1) {
      const moveDownBtn = document.createElement("button");
      moveDownBtn.textContent = "↓";
      moveDownBtn.className = "button-secondary";
      moveDownBtn.style.width = "auto";
      moveDownBtn.style.padding = "var(--space-1) var(--space-2)";
      moveDownBtn.style.fontSize = "var(--font-size-sm)";
      moveDownBtn.style.margin = "0";
      moveDownBtn.onclick = () => {
        [slides[i], slides[i+1]] = [slides[i+1], slides[i]];
        renderSlideList();
      };
      buttonContainer.appendChild(moveDownBtn);
    }

    // Delete button
    const del = document.createElement("button");
    del.textContent = "🗑️ Remove";
    del.className = "button-secondary";
    del.style.width = "auto";
    del.style.padding = "var(--space-1) var(--space-3)";
    del.style.fontSize = "var(--font-size-sm)";
    del.style.margin = "0";
    del.onclick = () => {
      if (confirm(`Remove slide ${i + 1}?`)) {
        slides.splice(i, 1);
        renderSlideList();
        showStatusMessage(`Slide removed. ${slides.length} slides remaining.`, "info", "lessonStatusMsg");
      }
    };
    buttonContainer.appendChild(del);

    li.appendChild(header);
    li.appendChild(preview);
    li.appendChild(buttonContainer);
    ul.appendChild(li);
  });
}
// Improved problem submission with better UX
document.getElementById("submitBtn").addEventListener("click", async () => {
  const studentId = document.getElementById("studentId").value.trim();
  const title     = document.getElementById("titleInput").value.trim();
  const plainText = document.getElementById("problemText").value.trim();
  
  if (!studentId || !title || !plainText) {
    showStatusMessage("Please fill out all required fields!", "error");
    return;
  }

  const button = document.getElementById("submitBtn");
  button.disabled = true;
  button.textContent = "📤 Sending Problem...";

  try {
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
      showStatusMessage(`Problem sent successfully to ${studentId}!`, "success");
      
      // Clear the form
      document.getElementById("studentId").value = "";
      document.getElementById("titleInput").value = "";
      document.getElementById("problemText").value = "";
      
      // Auto-navigate back to dashboard after success
      setTimeout(() => {
        showDashboard();
      }, 2000);
      
    } else {
      const errorText = await res.text();
      showStatusMessage(`Failed to send problem: ${errorText}`, "error");
    }
  } catch (error) {
    console.error("Problem submission error:", error);
    showStatusMessage("Network error. Please check your connection and try again.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "📤 Send to Student";
  }
});
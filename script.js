/************ FIREBASE CONFIG (REPLACE THESE) ************/
firebase.initializeApp({
  apiKey: "AIzaSyDdPTN-HI6S7vgXXKHtAtGnFdOtOOoc5FQ",
    authDomain: "pnrbk-15236.firebaseapp.com",
    projectId: "pnrbk-15236",
    storageBucket: "pnrbk-15236.firebasestorage.app",
    messagingSenderId: "633237652808",
    appId: "1:633237652808:web:c626786f0811ec60271f7d"
});

/************ GLOBALS ************/
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const WORKSPACE_ID = "team-accounting-001";
let entries = [];
let chart;

/************ UI HELPERS ************/
function toast(message, type = "success") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = message;
  document.body.appendChild(t);

  setTimeout(() => t.classList.add("show"), 50);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

function setLoading(btn, state) {
  if (!btn) return;
  btn.disabled = state;
  btn.style.opacity = state ? "0.6" : "1";
  btn.textContent = state ? "⏳ Working..." : btn.dataset.label;
}

/************ AUTH ************/
function register() {
  setLoading(event.target, true);
  auth.createUserWithEmailAndPassword(email.value, password.value)
    .then(() => toast("🎉 Account created"))
    .catch(e => toast(e.message, "error"))
    .finally(() => setLoading(event.target, false));
}

function login() {
  setLoading(event.target, true);
  auth.signInWithEmailAndPassword(email.value, password.value)
    .then(() => toast("✅ Logged in"))
    .catch(e => toast(e.message, "error"))
    .finally(() => setLoading(event.target, false));
}

function logout() {
  auth.signOut().then(() => toast("👋 Logged out"));
}

auth.onAuthStateChanged(user => {
  authDiv.style.display = user ? "none" : "block";
  logoutBtn.style.display = user ? "block" : "none";
  entrySection.style.display = user ? "block" : "none";

  if (user) loadEntries();
});

/************ ADD ENTRY ************/
async function addEntry() {
  const user = auth.currentUser;
  if (!user) return toast("Not logged in", "error");

  setLoading(event.target, true);

  try {
    let receiptURL = "";
    const file = receipt.files[0];

    if (file) {
      const ref = storage.ref(`receipts/${Date.now()}_${file.name}`);
      await ref.put(file);
      receiptURL = await ref.getDownloadURL();
    }

    await db.collection("entries").add({
      workspaceId: WORKSPACE_ID,
      desc: desc.value,
      amount: Number(amount.value),
      type: type.value,
      category: category.value,
      receipt: receiptURL,
      created: new Date(),
      createdBy: user.email
    });

    desc.value = amount.value = "";
    receipt.value = "";
    toast("💾 Entry added");
  } catch (e) {
    toast(e.message, "error");
  }

  setLoading(event.target, false);
}

/************ LOAD + RENDER ************/
function loadEntries() {
  db.collection("entries")
    .where("workspaceId", "==", WORKSPACE_ID)
    .orderBy("created")
    .onSnapshot(snapshot => {
      entries = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      render(entries);
    });
}

function render(data) {
  list.innerHTML = "";
  let balance = 0;
  let totals = {};

  data.forEach(e => {
    balance += e.type === "income" ? e.amount : -e.amount;
    if (e.type === "expense") {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    }

    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${e.desc}</strong> (${e.category})<br>
      ${e.type === "income" ? "🟢 +" : "🔴 -"}$${e.amount}<br>
      <small>${e.createdBy}</small><br>
      ${e.receipt ? `<a href="${e.receipt}" target="_blank">📸 Receipt</a>` : ""}
    `;
    li.style.opacity = 0;
    list.appendChild(li);
    requestAnimationFrame(() => li.style.opacity = 1);
  });

  balanceEl.textContent = "$" + balance;
  balanceEl.style.color = balance >= 0 ? "#2e7d32" : "#c62828";

  buildChart(totals);
}

/************ CHART ************/
function buildChart(data) {
  if (chart) chart.destroy();

  chart = new Chart(chartEl, {
    type: "doughnut",
    data: {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: [
          "#ff6b6b",
          "#4dabf7",
          "#ffd43b",
          "#69db7c",
          "#b197fc"
        ]
      }]
    },
    options: {
      animation: {
        animateScale: true,
        animateRotate: true
      },
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
}

/************ ELEMENTS ************/
const authDiv = document.getElementById("auth");
const logoutBtn = document.getElementById("logoutBtn");
const entrySection = document.getElementById("entrySection");
const balanceEl = document.getElementById("balance");
const list = document.getElementById("list");
const chartEl = document.getElementById("chart");

/************ BUTTON LABELS ************/
document.querySelectorAll("button").forEach(b => {
  b.dataset.label = b.textContent;
});

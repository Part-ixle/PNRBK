/************ FIREBASE CONFIG (REPLACE THESE) ************/
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com"
});

/************ GLOBALS ************/
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const WORKSPACE_ID = "team-accounting-001";

let entries = [];
let chart;

/************ AUTH ************/
function register() {
  auth.createUserWithEmailAndPassword(email.value, password.value)
    .catch(e => alert(e.message));
}

function login() {
  auth.signInWithEmailAndPassword(email.value, password.value)
    .catch(e => alert(e.message));
}

function logout() {
  auth.signOut();
}

auth.onAuthStateChanged(user => {
  if (user) {
    authDiv.style.display = "none";
    logoutBtn.style.display = "block";
    entrySection.style.display = "block";
    loadEntries();
  } else {
    authDiv.style.display = "block";
    logoutBtn.style.display = "none";
    entrySection.style.display = "none";
  }
});

/************ ADD ENTRY ************/
async function addEntry() {
  const user = auth.currentUser;
  if (!user) return;

  let receiptURL = "";
  const file = receipt.files[0];

  if (file) {
    const ref = storage.ref("receipts/" + Date.now() + "_" + file.name);
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

  desc.value = "";
  amount.value = "";
}

/************ LOAD + RENDER ************/
function loadEntries() {
  db.collection("entries")
    .where("workspaceId", "==", WORKSPACE_ID)
    .orderBy("created")
    .onSnapshot(snapshot => {
      entries = [];
      snapshot.forEach(doc => {
        entries.push({ ...doc.data(), id: doc.id });
      });
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

    list.innerHTML += `
      <li>
        <strong>${e.desc}</strong> (${e.category})<br />
        ${e.type === "income" ? "+" : "-"}$${e.amount}<br />
        <small>${e.createdBy}</small><br />
        ${e.receipt ? `<a href="${e.receipt}" target="_blank">📸 Receipt</a>` : ""}
      </li>
    `;
  });

  balanceEl.textContent = "$" + balance;
  buildChart(totals);
}

/************ CHART ************/
function buildChart(data) {
  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"), {
    type: "pie",
    data: {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: [
          "#ff6384",
          "#36a2eb",
          "#ffce56",
          "#4caf50",
          "#9c27b0"
        ]
      }]
    }
  });
}

/************ ELEMENTS ************/
const authDiv = document.getElementById("auth");
const logoutBtn = document.getElementById("logoutBtn");
const entrySection = document.getElementById("entrySection");
const balanceEl = document.getElementById("balance");

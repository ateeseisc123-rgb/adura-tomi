import { initializeApp } from "https://gstatic.com";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://gstatic.com";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from "https://gstatic.com";

// Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCGSp8NnVe3TSS80-ee4Lsfo95OfFfirxY",
  authDomain: "://firebaseapp.com",
  projectId: "isc-bussines",
  storageBucket: "isc-bussines.firebasestorage.app",
  messagingSenderId: "460922910248",
  appId: "1:460922910248:web:b44f4349962b2bf00ae71d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Bundle Catalog with Loyalty Points (1 point per GB)
const packages = {
  MTN: [
    { label: "1 GB — GHS 5.00", points: 1 },
    { label: "2 GB — GHS 9.50", points: 2 },
    { label: "3 GB — GHS 13.50", points: 3 },
    { label: "5 GB — GHS 22.00", points: 5 },
    { label: "10 GB — GHS 42.00", points: 10 }
  ],
  Telecel: [
    { label: "2 GB — GHS 9.00", points: 2 },
    { label: "5 GB — GHS 20.00", points: 5 },
    { label: "10 GB — GHS 38.00", points: 10 },
    { label: "15 GB — GHS 55.00", points: 15 }
  ]
};

let currentUser = null;
let selectedNetwork = "";
let isSignUpMode = false;
let unsubscribeOrders = null;

// DOM Elements
const orderModal = document.getElementById("orderModal");
const modalTitle = document.getElementById("modalTitle");
const bundleSelect = document.getElementById("bundleSelect");
const bundleForm = document.getElementById("bundleForm");
const ordersList = document.getElementById("ordersList");
const orderCountBadge = document.getElementById("orderCountBadge");

const authModal = document.getElementById("authModal");
const authForm = document.getElementById("authForm");
const openAuthBtn = document.getElementById("openAuthBtn");
const welcomeHeading = document.getElementById("welcomeHeading");
const userPointsBadge = document.getElementById("userPointsBadge");
const dropdownMenu = document.getElementById("dropdownMenu");
const menuLogout = document.getElementById("menuLogout");

// Toggle Login / Sign Up Mode
document.getElementById("toggleAuthModeBtn").addEventListener("click", () => {
  isSignUpMode = !isSignUpMode;
  document.getElementById("authModalTitle").textContent = isSignUpMode
    ? "Create ISC Account"
    : "Login to ISC ENTERPRISE";
  document.getElementById("authSubmitBtn").textContent = isSignUpMode ? "Sign Up" : "Login";
  document.getElementById("authSwitchPrompt").textContent = isSignUpMode
    ? "Already have an account?"
    : "Don't have an account?";
  document.getElementById("toggleAuthModeBtn").textContent = isSignUpMode ? "Login" : "Create Account";
  document.getElementById("nameGroup").style.display = isSignUpMode ? "block" : "none";
  document.getElementById("phoneGroup").style.display = isSignUpMode ? "block" : "none";
  document.getElementById("authName").required = isSignUpMode;
  document.getElementById("authPhone").required = isSignUpMode;
});

// Open & Close Auth Modal
openAuthBtn.addEventListener("click", () => {
  if (currentUser) {
    signOut(auth);
  } else {
    authModal.style.display = "flex";
  }
});

document.getElementById("profileIconBtn").addEventListener("click", () => {
  if (!currentUser) authModal.style.display = "flex";
});

document.getElementById("closeAuthBtn").addEventListener("click", () => {
  authModal.style.display = "none";
});

// Handle Login / Sign Up Submit
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const submitBtn = document.getElementById("authSubmitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Please wait...";

  try {
    if (isSignUpMode) {
      const fullName = document.getElementById("authName").value.trim();
      const phone = document.getElementById("authPhone").value.trim();
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", cred.user.uid), {
        name: fullName,
        phone: phone,
        email: email,
        points: 0,
        createdAt: new Date().toISOString()
      });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    authModal.style.display = "none";
    authForm.reset();
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isSignUpMode ? "Sign Up" : "Login";
  }
});

// Monitor User Login State
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    openAuthBtn.textContent = "Logout";
    menuLogout.style.display = "block";

    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (userSnap.exists()) {
      const data = userSnap.data();
      welcomeHeading.textContent = `Mema wo akye, ${data.name}!`;
      userPointsBadge.textContent = `Loyalty Points: ${data.points || 0} pts`;
    }
    listenToUserOrders(user.uid);
  } else {
    openAuthBtn.textContent = "Login";
    menuLogout.style.display = "none";
    welcomeHeading.textContent = "Mema wo akye, Welcome!";
    userPointsBadge.textContent = "Sign in to earn loyalty points";
    ordersList.innerHTML = `<p class="empty-text">Log in to view and save your data orders.</p>`;
    orderCountBadge.textContent = "0 Orders";
    if (unsubscribeOrders) unsubscribeOrders();
  }
});

// Open Bundle Order Modal
function openOrderModal(network) {
  if (!currentUser) {
    alert("Please log in or create an account first to place an order.");
    authModal.style.display = "flex";
    return;
  }

  selectedNetwork = network;
  modalTitle.textContent = `Buy ${network} Data`;
  bundleSelect.innerHTML = "";

  packages[network].forEach((pkg, idx) => {
    const option = document.createElement("option");
    option.value = idx;
    option.textContent = `${pkg.label} (+${pkg.points} pts)`;
    bundleSelect.appendChild(option);
  });

  orderModal.style.display = "flex";
}

document.getElementById("selectMtn").addEventListener("click", () => openOrderModal("MTN"));
document.getElementById("selectTelecel").addEventListener("click", () => openOrderModal("Telecel"));
document.getElementById("closeModalBtn").addEventListener("click", () => {
  orderModal.style.display = "none";
});

// Submit Data Order to Firestore
bundleForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const pkgIndex = parseInt(bundleSelect.value, 10);
  const chosenPkg = packages[selectedNetwork][pkgIndex];
  const phone = document.getElementById("recipientPhone").value.trim();

  if (phone.length < 10) {
    alert("Please enter a valid 10-digit Ghana phone number.");
    return;
  }

  const submitBtn = document.getElementById("submitOrderBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving Order...";

  try {
    await addDoc(collection(db, "orders"), {
      userId: currentUser.uid,
      network: selectedNetwork,
      bundle: chosenPkg.label,
      pointsEarned: chosenPkg.points,
      recipientPhone: phone,
      status: "Pending Payment",
      createdAt: new Date().toISOString()
    });

    // Update customer points
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      points: increment(chosenPkg.points)
    });

    const updatedUser = await getDoc(userRef);
    if (updatedUser.exists()) {
      userPointsBadge.textContent = `Loyalty Points: ${updatedUser.data().points} pts`;
    }

    orderModal.style.display = "none";
    bundleForm.reset();
    document.getElementById("orders-section").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    alert("Error saving order: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Place Order";
  }
});

// Real-time User Orders Listener
function listenToUserOrders(uid) {
  const q = query(
    collection(db, "orders"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );

  unsubscribeOrders = onSnapshot(q, (snapshot) => {
    orderCountBadge.textContent = `${snapshot.size} Order${snapshot.size === 1 ? "" : "s"}`;
    if (snapshot.empty) {
      ordersList.innerHTML = `<p class="empty-text">No recent orders yet. Select MTN or Telecel above to buy data.</p>`;
      return;
    }

    ordersList.innerHTML = snapshot.docs.map(docSnap => {
      const o = docSnap.data();
      const timeStr = new Date(o.createdAt).toLocaleString([], {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
      });
      return `
        <div class="order-item">
          <div class="order-info">
            <strong>${o.network} • ${o.bundle}</strong>
            <span>To: ${o.recipientPhone} • ${timeStr}</span>
          </div>
          <span class="status-badge">${o.status}</span>
        </div>
      `;
    }).join("");
  });
}

// Real-time Top 10 Customers Leaderboard Listener
const leaderboardQuery = query(
  collection(db, "users"),
  orderBy("points", "desc"),
  limit(10)
);

onSnapshot(leaderboardQuery, (snapshot) => {
  const tbody = document.getElementById("leaderboardBody");
  const rows = [];
  let rank = 1;

  snapshot.forEach(docSnap => {
    const userData = docSnap.data();
    rows.push(`
      <tr class="${rank === 1 ? "rank-1" : ""}">
        <td><span class="rank-badge">${rank}</span></td>
        <td>${userData.name || "Customer"}</td>
        <td>${userData.points || 0}</td>
      </tr>
    `);
    rank++;
  });

  while (rank <= 10) {
    rows.push(`
      <tr>
        <td><span class="rank-badge">${rank}</span></td>
     


import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  deleteUser,
  GoogleAuthProvider,
  reauthenticateWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCyiN8rCLivNQe9SXAZZzC26_oWrcXvZtE",
  authDomain: "gradian-ai.firebaseapp.com",
  projectId: "gradian-ai",
  storageBucket: "gradian-ai.appspot.com",
  messagingSenderId: "578027234132",
  appId: "1:578027234132:web:1fbd792f445d1302495ec1",
  measurementId: "G-FRKDDRQ09S"
};
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const settingsBtn   = document.getElementById("settingsBtn");
const settingsPopup = document.getElementById("settingsPopup");
const settingsClose = document.getElementById("settingsClose");
const userName  = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userPfp   = document.getElementById("userPfp");
const addProfileBtn = document.getElementById("addProfile");
const signOutBtn    = document.getElementById("signOut");
const deleteBtn     = document.getElementById("deleteAccount");
const profileListEl = document.getElementById("profileList");
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    userName.textContent  = "Guest";
    userEmail.textContent = "guest@example.com";
    userPfp.src           = "https://api.dicebear.com/7.x/personas/svg?seed=anon";
    return;
  }
  userName.textContent  = user.displayName ?? "Unnamed User";
  userEmail.textContent = user.email ?? "No email";
  userPfp.src           = user.photoURL
      ?? "https://api.dicebear.com/7.x/personas/svg?seed=anon";
      

  if (profileListEl) renderProfiles(user.uid);
});

async function renderProfiles(uid) {
  profileListEl.innerHTML = "Loading…";
  try {
    const q   = query(
      collection(db, "users", uid, "profiles"),
      orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);
    profileListEl.innerHTML = "";

    snap.forEach((doc) => {
      const li = document.createElement("li");
      li.textContent = doc.data().name;
      profileListEl.appendChild(li);
    });

    if (snap.empty) profileListEl.innerHTML = "<i>No profiles yet</i>";
  } catch (err) {
    profileListEl.innerHTML = "<i>Profile load error</i>";
    console.error(err);
  }
}
addProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Login first.");

  const name = prompt("Profile name:");
  if (!name) return;

  try {
    await addDoc(collection(db, "users", user.uid, "profiles"), {
      name,
      createdAt: Date.now()
    });
    alert("Profile added!");
    if (profileListEl) renderProfiles(user.uid);
  } catch (err) {
    alert("Add failed: " + err.message);
  }
});

signOutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    alert("Signed out");
    settingsPopup.classList.remove("open");
     window.location.href = "../../main.html"; 
  } catch (e) {
    alert("Sign‑out error: " + e.message);
  }
});
deleteBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  if (!confirm("Delete your account permanently?")) return;

  try {
    await deleteUser(user);
    alert("Account deleted");
    settingsPopup.classList.remove("open");
    window.location.href = "../../main.html";
  } catch (err) {
    if (err.code === "auth/requires-recent-login") {
      try {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
        await deleteUser(user);
        alert("Account deleted");
        settingsPopup.classList.remove("open");
      } catch (reauthErr) {
        alert("Delete failed: " + reauthErr.message);
      }
    } else {
      alert("Delete failed: " + err.message);
    }
  }
});


settingsBtn.addEventListener("click", () =>
  settingsPopup.classList.add("open")
);
settingsClose.addEventListener("click", () =>
  settingsPopup.classList.remove("open")
);


settingsBtn.classList.add("show");

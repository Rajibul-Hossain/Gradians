// ================= SERVICE WORKER =================
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./service-worker.js") // ✅ fixed path
    .then((reg) => {
      console.log("Service Worker registered with scope:", reg.scope);
    })
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
}

// ================= TOUCH FIXES =================
document.addEventListener("DOMContentLoaded", () => {
  // Disable auto-focus on inputs & prevent touch triggering keyboard
  document.querySelectorAll("input, textarea").forEach((el) => {
    el.setAttribute("autocomplete", "off");
    el.setAttribute("readonly", "true"); // Prevents auto-popup
    el.addEventListener("focus", () => el.removeAttribute("readonly")); // Enables input when tapped
  });

  // Debug: Log which element is being clicked
  document.body.addEventListener("pointerdown", (event) => {
    console.log("Tapped element:", event.target);
  });

  // Prevent touch triggering focus anywhere except actual inputs
  document.addEventListener("touchstart", (event) => {
    if (!event.target.matches("input, textarea")) {
      event.preventDefault();
    }
  });

  console.log("Touch fixes applied!");
});

// ================= FIREBASE IMPORTS =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app-check.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-analytics.js";
import { getStorage, ref } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  setDoc,
  doc,
  getDoc,
  writeBatch,
  getDocs,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged,
  TwitterAuthProvider,
  FacebookAuthProvider,
  signInAnonymously,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  deleteUser,
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-functions.js";

// ================= FIREBASE CONFIG =================
const firebaseConfig = {
  apiKey: "AIzaSyCyiN8rCLivNQe9SXAZZzC26_oWrcXvZtE",
  authDomain: "gradian-ai.firebaseapp.com",
  projectId: "gradian-ai",
  storageBucket: "gradian-ai.appspot.com",
  messagingSenderId: "578027234132",
  appId: "1:578027234132:web:1fbd792f445d1302495ec1",
  measurementId: "G-FRKDDRQ09S"
};

const app = initializeApp(firebaseConfig);

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider("6LdNP6kpAAAAAJsZk10ZrVwOdiquE2MFWqROm_Wj"),
  isTokenAutoRefreshEnabled: true
});

const auth = getAuth(app);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// ================= ELEMENTS =================
const name = document.getElementById("newName");
const mail = document.getElementById("newMail");
const sign = document.getElementById("sign");
const subscribeBtn = document.getElementById("subscribeBtn");

var dbRef, storRef;

// ================= DELETE ACCOUNT =================
export function delAcc() {
  deleteUser(auth.currentUser)
    .then(() => {
      localStorage.clear();
      alert("Your account is deleted from Gradians AI.");
      history.go(0);
    })
    .catch((err) => alert(err.code.substring(5)));
}

auth.useDeviceLanguage();

// ================= AUTH STATE =================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Auto delete guest after 2 days
    user.isAnonymous ? (Date.now() - user.createdAt > 172800000 ? delAcc() : null) : null;

    // ================= VERIFIED OR GUEST USER =================
    if (user.emailVerified || user.isAnonymous) {

      // ✅ Redirect to mm.html after login (ONLY ONCE)
      if (!sessionStorage.getItem("redirected")) {
        sessionStorage.setItem("redirected", "true");
        window.location.href = "mm.html";
        return;
      }

      // (This code will not run because redirect happens, but kept safe)
      mail.value = user.email;
      name.value = user.displayName;
      sign.style.display = "none";

      dbRef = doc(db, "userData", auth.currentUser.uid);
      storRef = ref(storage, auth.currentUser.uid);

      fetch("https://api.ipify.org?format=json")
        .then((response) => response.json())
        .then(async (data) => {
          await setDoc(dbRef, { IP: data.ip }, { merge: true });
        });

      document.getElementById("resetPass").addEventListener("click", () => changePass(auth.currentUser.email));
      name.addEventListener("change", (e) => changeName(e.target.value, true));

      showHistory();

      document.getElementById("signOut").addEventListener("click", () =>
        confirm(`Do you want to sign out of ${auth.currentUser.email}`)
          ? auth
              .signOut()
              .then(() => {
                alert("You're signed out of Gradians AI successfully.");
                localStorage.clear();
                sessionStorage.clear();
                history.go(0);
              })
              .catch((err) => alert(err.code.substring(5)))
          : null
      );

    } 
    // ================= NOT VERIFIED USER =================
    else {
      confirm(
        `If you want to keep this account, you'll need to verify this email address: ${user.email}. Do you want to continue?`
      )
        ? sendEmailVerification(auth.currentUser)
            .then(() => alert("Email verification mail sent."))
            .catch((err) => alert(err.code.substring(5)))
        : delAcc();

      document.getElementById("deleteAcc").addEventListener("click", () =>
        confirm(`Do you want to delete your account? (${auth.currentUser.email})`) ? delAcc() : null
      );
    }

    const userDoc = await getDoc(doc(db, "userData", user.uid));

  } 
  // ================= NOT LOGGED IN =================
  else {
    sign.style.display = "flex";

    document.querySelectorAll(".loginBtns > button").forEach((elm) => {
      elm.addEventListener("click", () => {
        const providers = {
          google: new GoogleAuthProvider(),
          microsoft: new OAuthProvider("microsoft.com"),
          github: new GithubAuthProvider(),
          twitter: new TwitterAuthProvider(),
          yahoo: new OAuthProvider("yahoo.com"),
          fb: new FacebookAuthProvider()
        };

        signInWithPopup(auth, providers[elm.id])
          .then(() => alert(auth.currentUser.displayName + " signed in successfully."))
          .catch((err) => alert(err.code.substring(5)));
      });
    });

    document.getElementById("guest").addEventListener("click", () =>
      signInAnonymously(auth)
        .then(() => alert("You're signed in as Guest successfully.👤 "))
        .catch((err) => alert(err.code.substring(5)))
    );

    document.getElementById("createUser").addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);

      if (!formData.getAll("new-password").every((value, _, arr) => value === arr[0] || value == null)) {
        if (confirm("Your passwords didn't match. Do you want a password-less log in?")) {
          emailLinkLogIn(formData.get("email"));
        } else {
          alert("Please enter the same password in both fields.");
          document.querySelectorAll("[name='new-password']").forEach((elm) => (elm.value = null));
        }
      } else {
        createUserWithEmailAndPassword(auth, formData.get("email"), formData.get("new-password"))
          .then(() => {
            changeName(formData.get("name"), false);
            alert("User created successfully.");
          })
          .catch((err) => alert(err.code.substring(5)));
      }
    });

    document.getElementById("signInUser").addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);

      signInWithEmailAndPassword(auth, formData.get("email"), formData.get("current-password"))
        .then(() => {
          changeName(formData.get("name"), false);
          alert("User signed in successfully.");
        })
        .catch((err) => {
          alert(err.code.substring(5));
          confirm("Want to reset your password?")
            ? sendPasswordResetEmail(auth, formData.get("email"))
                .then(() => alert("Password reset mail sent to " + formData.get("email")))
                .catch((err) => alert(err.code.substring(5)))
            : null;
        });
    });

    function emailLinkLogIn(email) {
      sendSignInLinkToEmail(auth, email, {
        url: window.location.href,
        handleCodeInApp: true
      })
        .then(() => {
          localStorage.setItem("emailForSignIn", email);
          alert("Check your email for the sign in link.🔗");
        })
        .catch((err) => alert(err.code.substring(5)));
    }

    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = localStorage.emailForSignIn,
        naa = localStorage.nameForSignIn;

      if (!email) {
        email = prompt("Looks like you're logging in with a different browser. Enter your email to confirm it's you.");
        naa = prompt("Enter your name");
      }

      signInWithEmailLink(auth, email, window.location.href)
        .then(() => {
          localStorage.removeItem("emailForSignIn");
          naa ? changeName(naa, true) : null;
          localStorage.removeItem("nameForSignIn");
          window.location.href = "index.html";
        })
        .catch((err) => alert(err.code.substring(5)));
    }

    document.getElementById("resetPassMail").addEventListener("click", () =>
      changePass(document.getElementById("tempmail").value)
    );
  }
});

// ================= HISTORY DISPLAY =================
function showHistory() {
  const delHis = document.querySelector("[tip='Delete History']");
  const parentElm = document.querySelector("nav > div");

  onSnapshot(collection(dbRef, "History"), (snap) => {
    delHis.classList.remove("scale0");
    const changes = snap.docChanges();
    changes.reverse().forEach((change, index) => {
      if (change.type === "removed") {
        snap.docChanges().length < 2 ? delHis.classList.add("scale0") : null;
        document.getElementById(change.doc.id).remove();
      } else {
        const pouch = document.createElement("div"),
          ss = change.doc.data();

        pouch.classList.add("pouch");
        pouch.style.animationDelay = `${index * 0.2}s`;
        pouch.setAttribute("id", change.doc.id);

        pouch.innerHTML = `${ss.Title ? ss.Title : "🚫 No Title"}<time>${timeAgo(change.doc.id)}</time>`;
        changes.length > 1 ? parentElm.appendChild(pouch) : parentElm.insertBefore(pouch, parentElm.firstChild);

        const samePouch = document.querySelector(".pouch:last-child");
        let timeoutId;

        const startHold = (id) =>
          (timeoutId = setTimeout(() => {
            document.getElementById(id).remove();
          }, 1000));

        const endHold = () => clearTimeout(timeoutId);

        samePouch.onclick = () => {
          textarea.value = ss.Prompt.Text;
          reply.innerHTML = ss.Response;
          [reply, ansSubmit, ttsBtn].forEach((elm) => elm.classList.remove("scale0"));
          load.classList.add("scale0");
        };

        samePouch.onmousedown = (event) => startHold(event.target.id);
        samePouch.onmouseup = () => endHold();
      }
    });
  });

  delHis.addEventListener("click", async () => {
    const batch = writeBatch(db);
    const querySnapshot = await getDocs(collection(dbRef, "History"));

    querySnapshot.forEach((docu) => {
      batch.delete(docu.ref);
    });

    await batch.commit();
    alert("History deleted 🫡");
  });
}

// ================= SAVE HISTORY =================
export async function history(title, prompt, analysis) {
  try {
    await setDoc(doc(dbRef, "History", Date.now().toString()), {
      Title: title,
      Prompt: {
        Text: prompt,
        Images: null
      },
      Response: analysis
    });
  } catch (err) {
    console.error(err);
  }
}

// ================= CHANGE NAME =================
function changeName(naam, toast) {
  updateProfile(auth.currentUser, {
    displayName: naam,
    photoURL: auth.currentUser.photoURL
  })
    .then(() => (toast ? alert(`Name changed to '${auth.currentUser.displayName}'`) : null))
    .catch((err) => alert(err.code.substring(5)));
}

// ================= CHANGE PASSWORD =================
function changePass(cmail) {
  if (confirm("Do you want to change your password?")) {
    sendPasswordResetEmail(auth, cmail)
      .then(() => {
        alert(`Password reset mail sent to ${cmail}`);
        auth
          .signOut()
          .then(() => alert("Sign in here again after changing your password."))
          .catch((err) => alert(err.code.substring(5)));
      })
      .catch((err) => alert(err.code.substring(5)));
  }
}

// ================= TIME AGO =================
function timeAgo(timestamp) {
  const now = new Date();
  const date = new Date(parseInt(timestamp));
  const diff = now - date;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  let timeString;

  if (weeks > 0) timeString = `${weeks} wk${weeks > 1 ? "s" : ""} ago`;
  else if (days > 0) timeString = `${days} dy${days > 1 ? "s" : ""} ago`;
  else if (hours > 0) timeString = `${hours} hr${hours > 1 ? "s" : ""} ago`;
  else if (minutes > 0) timeString = `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  else timeString = `${seconds} sec${seconds > 1 ? "s" : ""} ago`;

  const timeElement = document.createElement("div");
  timeElement.className = "time-ago";
  timeElement.textContent = timeString;
  timeElement.title = date.toLocaleString();

  timeElement.addEventListener("click", () => {
    alert(`The time when it was open is ${date.toLocaleString()}`);
  });

  return timeElement.outerHTML;
}

// By Rajibul

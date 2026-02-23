const GEMINI_API_KEY = "AIzaSyCDI_le44rk_KWjRz68krpemtZrm7U-2jU";
const firebaseConfig = {
  apiKey: "AIzaSyCyiN8rCLivNQe9SXAZZzC26_oWrcXvZtE",
  authDomain: "gradian-ai.firebaseapp.com",
  projectId: "gradian-ai",
  storageBucket: "gradian-ai.appspot.com",
  messagingSenderId: "578027234132",
  appId: "1:578027234132:web:1fbd792f445d1302495ec1",
  measurementId: "G-FRKDDRQ09S"
};
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  let currentUser = null;
  let flashcards = [];
  let currentIndex = 0;
  let quizMode = false;
  let score = 0;
  let streak = 0;
  const glow = document.getElementById("cursorGlow");
  document.addEventListener("mousemove", (e) => {
    glow.style.left = e.clientX + "px";
    glow.style.top = e.clientY + "px";
  });
  function setStatus(text){
    document.getElementById("statusText").innerText = text;
  }
  function showLoading(show){
    document.getElementById("loadingBox").style.display = show ? "block" : "none";
  }
  function showError(msg){
    const err = document.getElementById("errorText");
    if(msg){
      err.style.display = "block";
      err.innerText = msg;
    } else {
      err.style.display = "none";
      err.innerText = "";
    }
  }


  async function login(){
    try{
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
      setStatus("Logged In ✅");
    } catch(e){
      showError("Login failed: " + e.message);
    }
  }
  async function logout(){
    await auth.signOut();
    setStatus("Logged Out");
  }
  auth.onAuthStateChanged((user)=>{
    currentUser = user;
    if(user){
      document.getElementById("userEmailText").innerText = user.email + " • Cloud Sync Enabled";
      setStatus("Synced ☁");
    } else {
      document.getElementById("userEmailText").innerText = "Not logged in • Firebase Auth";
    }
  });
  function updateCard(){
    if(flashcards.length === 0){
      document.getElementById("frontText").innerHTML =
        "Enter a topic and generate flashcards 🚀<div class='meta'>Tap to flip • Swipe left/right supported</div>";

      document.getElementById("backText").innerHTML =
        "Flashcard answer will appear here.";

      document.getElementById("progressText").innerText = "0 / 0";
      return;
    }
    const card = flashcards[currentIndex];
    document.getElementById("frontText").innerHTML =
      card.front + `<div class="meta">Tap to flip • Type: ${card.type || "general"}</div>`;
    document.getElementById("backText").innerHTML =
      card.back + `<div class="meta">Difficulty: ${card.difficulty || "medium"}</div>`;
    document.getElementById("progressText").innerText =
      `${currentIndex + 1} / ${flashcards.length}`;
    document.getElementById("flashcardBox").classList.remove("flipped");
  }
  function flipCard(){
    if(flashcards.length === 0) return;
    document.getElementById("flashcardBox").classList.toggle("flipped");
  }
  function swipeAnim(direction){
    const inner = document.getElementById("flashInner");
    inner.style.transform = `translateX(${direction * 90}px) rotate(${direction * 6}deg) scale(0.96)`;
    inner.style.opacity = "0";
    setTimeout(()=>{
      updateCard();
      inner.style.transform = "translateX(0px) rotate(0deg) scale(1)";
      inner.style.opacity = "1";
    }, 220);
  }
  function nextCard(){
    if(flashcards.length === 0) return;
    currentIndex = (currentIndex + 1) % flashcards.length;
    swipeAnim(1);
  }
  function prevCard(){
    if(flashcards.length === 0) return;
    currentIndex = (currentIndex - 1 + flashcards.length) % flashcards.length;
    swipeAnim(-1);
  }
  let startX = 0;
  document.getElementById("flashcardBox").addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
  });
  document.getElementById("flashcardBox").addEventListener("touchend", (e) => {
    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX;
    if(Math.abs(diff) > 60){
      if(diff < 0) nextCard();
      else prevCard();
    }
  });
  function openQuizMode(){
    if(flashcards.length === 0){
      showError("Generate flashcards first.");
      return;
    }
    quizMode = true;
    score = 0;
    streak = 0;
    updateQuizText();
    setStatus("Quiz Mode 🎯");
    showError(null);
  }
  function markCorrect(){
    if(!quizMode) return;
    score++;
    streak++;
    updateQuizText();
    nextCard();
  }
  function markWrong(){
    if(!quizMode) return;
    streak = 0;
    updateQuizText();
    nextCard();
  }
  async function generateFlashcards(){
    const topic = document.getElementById("topicInput").value.trim();
    const count = document.getElementById("countSelect").value;
    const difficulty = document.getElementById("difficultySelect").value;

    if(!topic){
      showError("⚠️ Enter a topic first.");
      return;
    }
    if(GEMINI_API_KEY.includes("PASTE_GEMINI")){
      showError("⚠️ Paste your Gemini API key in the code.");
      return;
    }
    setStatus("Generating...");
    showLoading(true);
    showError(null);
    quizMode = false;

    const prompt = `
You are an expert teacher and flashcard creator.

Generate exactly ${count} high-quality flashcards for the topic: "${topic}".

Rules:
- Output ONLY valid JSON array. No markdown. No extra text.
- Each flashcard must contain:
  - "front": max 12 words
  - "back": max 70 words
  - "type": one of ["definition","concept","formula","example","true_false"]
  - "difficulty": "${difficulty}"
- Mix types evenly.
- Make it exam-oriented and simple.

Return JSON only.
`;
document.getElementById("topicInput").value = topic;

    try{
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" + GEMINI_API_KEY,
        {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await res.json();

      if(!data.candidates || !data.candidates[0]){
        throw new Error("No response from Gemini.");
      }

      const rawText = data.candidates[0].content.parts[0].text;

      const jsonStart = rawText.indexOf("[");
      const jsonEnd = rawText.lastIndexOf("]");

      if(jsonStart === -1 || jsonEnd === -1){
        throw new Error("Gemini did not return valid JSON.");
      }

      const cleanJson = rawText.substring(jsonStart, jsonEnd + 1);

      flashcards = JSON.parse(cleanJson);

      if(!Array.isArray(flashcards) || flashcards.length === 0){
        throw new Error("Invalid flashcards format.");
      }

      currentIndex = 0;
      updateCard();

      localStorage.setItem("latest_flashcards", JSON.stringify(flashcards));
      setStatus("Done ✅");
    }
    catch(err){
      console.error(err);
      showError("❌ " + err.message);
      setStatus("Error");
    }

    showLoading(false);
  }

  function openPDFImport(){
    document.getElementById("pdfInput").click();
  }

  document.getElementById("pdfInput").addEventListener("change", async (e)=>{
    const file = e.target.files[0];
    if(!file) return;

    setStatus("Reading PDF...");
    showLoading(true);
    showError(null);

    try{
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;

      let fullText = "";

      for(let i=1; i<=pdf.numPages; i++){
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map(item => item.str).join(" ");
        fullText += text + "\n";
      }

      setStatus("Generating from PDF...");
      await generateFlashcardsFromText(fullText);
    }
    catch(err){
      showError("PDF Error: " + err.message);
      setStatus("Error");
    }

    showLoading(false);
  });

  async function generateFlashcardsFromText(text){
    const count = document.getElementById("countSelect").value;
    const difficulty = document.getElementById("difficultySelect").value;

    if(GEMINI_API_KEY.includes("PASTE_GEMINI")){
      showError("⚠️ Paste your Gemini API key in the code.");
      return;
    }

    const prompt = `
You are an expert flashcard creator.

From the given notes, generate exactly ${count} flashcards.

Rules:
- Output JSON only (array).
- Each flashcard has:
  front (max 12 words),
  back (max 70 words),
  type (definition/concept/formula/example/true_false),
  difficulty ("${difficulty}").

Make it exam-focused and high quality.

NOTES:

`;

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" + GEMINI_API_KEY,
      {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await res.json();
    const rawText = data.candidates[0].content.parts[0].text;

    const jsonStart = rawText.indexOf("[");
    const jsonEnd = rawText.lastIndexOf("]");

    if(jsonStart === -1 || jsonEnd === -1){
      throw new Error("Gemini did not return valid JSON.");
    }

    flashcards = JSON.parse(rawText.substring(jsonStart, jsonEnd + 1));

    currentIndex = 0;
    updateCard();
    setStatus("PDF Cards Ready ✅");
  }
  function saveLocal(){
    if(flashcards.length === 0){
      showError("Generate flashcards first.");
      return;
    }

    const topic = document.getElementById("topicInput").value.trim();

    let vault = JSON.parse(localStorage.getItem("local_flashcard_vault") || "[]");

    vault.unshift({
      id: crypto.randomUUID(),
      topic,
      createdAt: new Date().toISOString(),
      count: flashcards.length,
      cards: flashcards
    });

    localStorage.setItem("local_flashcard_vault", JSON.stringify(vault));
    setStatus("Saved Local 💾");
    showError(null);
  }
 async function saveToFirestore(){
  if(!currentUser){
    showError("Not logged in.");
    return;
  }

  if(flashcards.length === 0){
    showError("No flashcards to save.");
    return;
  }

  let topic = document.getElementById("topicInput").value.trim();

  // 🔥 If topic empty, auto use first flashcard front
  if(!topic){
    topic = flashcards[0]?.front?.slice(0, 40) || "Flashcard Set";
    document.getElementById("topicInput").value = topic; // auto fill input also
  }

  try{
    await db.collection("userData")
      .doc(currentUser.uid)
      .collection("flashcardSets")
      .add({
        topic,
        count: flashcards.length,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        cards: flashcards
      });

    setStatus("Saved to Vault 🔥 (" + topic + ")");
  }
  catch(err){
    console.error(err);
    showError("Firestore save failed.");
  }
}

  async function openVault(){
    document.getElementById("vaultModal").style.display = "flex";
    await renderVault();
  }

  function closeVault(){
    document.getElementById("vaultModal").style.display = "none";
  }

  async function renderVault(){
    const vaultList = document.getElementById("vaultList");
    vaultList.innerHTML = "";

    if(!currentUser){
      vaultList.innerHTML = `
        <div style="color:rgba(255,255,255,0.65);font-size:13px;padding:14px;font-weight:700;">
          ⚠ Login to use Cloud Vault.
        </div>
      `;
      return;
    }

    setStatus("Loading Vault...");
    const snap = await db.collection("userData")
      .doc(currentUser.uid)
      .collection("flashcardSets")
      .orderBy("createdAt", "desc")
      .get();

    if(snap.empty){
      vaultList.innerHTML = `
        <div style="color:rgba(255,255,255,0.55);font-size:13px;padding:14px;font-weight:700;">
          No Flashcards Found 💔.
        </div>
      `;
      setStatus("Ready");
      return;
    }

    snap.forEach(doc => {
      const item = doc.data();

      const div = document.createElement("div");
      div.className = "vault-item";

      div.innerHTML = `
        <div class="vault-info">
          <strong>${item.topic || "Untitled"}</strong>
          <span>${item.count || 0} cards • ${(item.createdAt?.toDate?.() ? item.createdAt.toDate().toLocaleString() : "Unknown date")}</span>
        </div>

        <div class="vault-actions">
          <button class="mini-btn" onclick="loadFirestoreSet('${doc.id}')">Load</button>
          <button class="mini-btn mini-danger" onclick="deleteFirestoreSet('${doc.id}')">Delete</button>
        </div>
      `;
      vaultList.appendChild(div);
    });
    setStatus("Vault Ready");
  }
  async function loadFirestoreSet(id){
    if(!currentUser) return;
    const docRef = db.collection("userData")
      .doc(currentUser.uid)
      .collection("flashcardSets")
      .doc(id);
    const snap = await docRef.get();
    if(!snap.exists){
      showError("Set not found.");
      return;
    }
    const data = snap.data();
    flashcards = data.cards || [];
    currentIndex = 0;
    document.getElementById("topicInput").value = data.topic || "";
    updateCard();
    quizMode = false;
 
    setStatus("Loaded ☁");
    closeVault();
  }
  async function deleteFirestoreSet(id){
    if(!currentUser) return;
    await db.collection("userData")
      .doc(currentUser.uid)
      .collection("flashcardSets")
      .doc(id)
      .delete();
    setStatus("Deleted 🗑");
    renderVault();
  }
  function exportJSON(){
    if(flashcards.length === 0){
      showError("No flashcards to export.");
      return;
    }
    const topic = document.getElementById("topicInput").value.trim() || "flashcards";
    const blob = new Blob([JSON.stringify(flashcards, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = topic.replaceAll(" ", "_") + "_flashcards.json";
    a.click();

    URL.revokeObjectURL(url);
    setStatus("Exported JSON ⬇");
  }
  function exportCSV(){
    if(flashcards.length === 0){
      showError("No flashcards to export.");
      return;
    }
    const rows = flashcards.map(c => {
      const front = (c.front || "").replaceAll('"', '""');
      const back = (c.back || "").replaceAll('"', '""');
      return `"${front}","${back}"`;
    });
    const csvContent = "Front,Back\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type:"text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flashcards_anki.csv";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Exported CSV 📄");
  }
  async function exportPDF(){
    if(flashcards.length === 0){
      showError("No flashcards to export.");
      return;
    } 
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("poppins", "bold");
    doc.setFontSize(16);
    doc.text("Gradians Flashcards Export", 14, 18);

    doc.setFont("poppins", "normal");
    doc.setFontSize(12);

    let y = 30;

    flashcards.forEach((c, i) => {
      doc.setFont("poppins", "bold");
      doc.text(`${i+1}. ${c.front}`, 14, y);

      y += 8;
      doc.setFont("poppins", "normal");
      doc.text(doc.splitTextToSize(c.back, 180), 14, y);

      y += 18;

      if(y > 270){
        doc.addPage();
        y = 20;
      }
    });

    doc.save("flashcards.pdf");
    setStatus("Exported PDF 🧾");
  }

  function clearCurrent(){
    flashcards = [];
    currentIndex = 0;
    quizMode = false;
    updateQuizText();
    updateCard();
    localStorage.removeItem("latest_flashcards");
    setStatus("Cleared 🗑");
    showError(null);
  }
  window.onload = () => {
    const latest = localStorage.getItem("latest_flashcards");
    if(latest){
      flashcards = JSON.parse(latest);
      currentIndex = 0;
      updateCard();
      setStatus("Loaded");
    }
  };

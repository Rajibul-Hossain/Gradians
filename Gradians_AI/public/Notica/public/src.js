
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  limit 
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

    const GEMINI_KEY  = "AIzaSyCDI_le44rk_KWjRz68krpemtZrm7U-2jU";
    const YOUTUBE_KEY = "AIzaSyDYtam2R7UVdFnnCpsTr2EIIm0VdtimXvE";

    const topicInput  = document.getElementById("topicInput");
    const modelSelect = document.getElementById("modelSelect");
    const generateBtn = document.getElementById("generateBtn");
    const summaryBox  = document.getElementById("summaryBox");
    const loading     = document.getElementById("loading");
    const videoCard   = document.getElementById("videoCard");
    const videoLink   = document.getElementById("videoLink");
    const thumb       = document.getElementById("thumb");
    const videoTitle  = document.getElementById("videoTitle");
    const chatBtn   = document.getElementById("chatBtn");
    const chatPopup = document.getElementById("chatPopup");
    const chatBody  = document.getElementById("chatBody");
    const chatInput = document.getElementById("chatInput");
    const chatSend  = document.getElementById("chatSend");
    const chatClose = document.getElementById("chatClose");

    generateBtn.addEventListener("click", run);
    topicInput.addEventListener("keydown", e => { if (e.key === "Enter") run(); });
async function run () {
  const topic = topicInput.value.trim();
  if (!topic) return alert("Enter a topic first 🙂");

  summaryBox.textContent = "";
  summaryBox.classList.remove("typing");
  loading.style.display  = "block";
  videoCard.style.display = "none";

  try {
    const model  = modelSelect.value;
    const videos = await searchYouTube(topic, 1);          
    if (!videos.length) throw new Error("No videos found.");

    let   finalSummary = "";
    let   firstRec     = {};                              
    for (const [i, { id, title, thumbnail }] of videos.entries()) {
      const transcript = await fetchTranscript(id).catch(() => "");

      const summary = model === "gemini"
        ? await callGemini(topic, title, id, transcript)
        : await callClaude(topic, title, id, transcript);

      finalSummary += `📌 Video ${i + 1}: ${title}\n${summary.trim()}\n\n`;

      if (i === 0) {                                        
        firstRec = { id, title, thumbnail };
        videoLink.href = `https://www.youtube.com/watch?v=${id}`;
        thumb.src      = thumbnail;
        thumb.alt      = title;
        videoTitle.textContent = title;
        videoCard.style.display = "flex";
      }
    }

    await typeAndFormat(summaryBox, finalSummary.trim());

    await saveHistory({
      topic,
      title:   firstRec.title,
      summary: finalSummary.trim(),
      videoId: firstRec.id,
      thumbnail: firstRec.thumbnail,
      ts: Date.now()
    });
    loadHistory();                                        

  } catch (err) {
    summaryBox.textContent = "❌ " + err.message;
  } finally {
    loading.style.display = "none";

    downloadBtn.style.display  = "inline-block";
    downloadBtn.style.animation = "popIn 0.5s ease-out forwards";

    showChatButton();                                      
  }
}
document.getElementById("downloadBtn").addEventListener("click", () => {
  const summary = summaryBox.textContent;
  const topic   = topicInput.value.trim().replace(/\s+/g, "_");
  const title   = videoTitle?.textContent || "";
  const link    = videoLink?.href || "";

  const fullText = `📘 Topic: ${topic.replace(/_/g, " ")}\n🎞️ Video: ${title}\n🔗 Link: ${link}\n\n📝 Summary:\n${summary}`;
  const blob = new Blob([fullText], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `${topic}_Summary.txt`; a.click();
  URL.revokeObjectURL(url);
});
async function typeText(elem, text, speed = 18) {
  elem.textContent = "";
  elem.classList.add("typing");          
  for (let i = 0; i < text.length; i++) {
    elem.textContent += text[i];
    await new Promise(r => setTimeout(r, speed));
  }
  elem.classList.remove("typing");
}
async function typeAndFormat(elem, rawText, speed = 18) {
  await typeText(elem, rawText, speed);
  elem.style.opacity = 0;                
  elem.innerHTML = formatGeminiText(rawText);
  requestAnimationFrame(() => {          
    elem.style.transition = "opacity 0.35s ease";
    elem.style.opacity = 1;
  });
}
    async function searchYouTube(q, MAX_RESULTS = 1) {
      const endpoint = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_KEY}&part=snippet&type=video&maxResults=${MAX_RESULTS}&q=${encodeURIComponent(q)}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("YouTube search error " + res.status);
      const data = await res.json();
      if (!data.items.length) throw new Error("No videos found.");
      return data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url
      }));
    }
async function fetchTranscript(videoId) {
  const target = `https://youtubetranscript.com/?server_vid2=${videoId}&lang=en`;
  const proxies = [
    u => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,          
    u => `https://everyorigin.jwvbremen.nl/raw?url=${encodeURIComponent(u)}`, 
    u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`  
  ];

  let lastErr;
  for (const wrap of proxies) {
    try {
      const res = await fetch(wrap(target));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();         
      return json.map(x => x.text).join(' ').replace(/\s+/g, ' ').trim();
    } catch (err) {
      lastErr = err;            
    }
  }
  throw lastErr || new Error('Transcript fetch failed');
}



    async function callGemini(topic, title, vid, transcript) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`;
      const prompt = transcript ?
        `Create a concise study note based on this YouTube lecture transcript:\n\n${transcript}` :
        `The following YouTube lecture is titled "${title}" (https://youtu.be/${vid}). Produce a concise and elaborate study note on the material it likely covers. If uncertain, outline the topics the video would generally contain.`;
      const body = { contents: [{ parts: [{ text: prompt }] }] };
      const res  = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Gemini error " + res.status);
      const json = await res.json();
      return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
       async function callGemini2(topic, title, vid, transcript) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`;
      const prompt = transcript ?
        `Create a short study note based on this YouTube lecture transcript:\n\n${transcript}` :
        `The following YouTube lecture is titled "${title}" (https://youtu.be/${vid}). Produce a breif short study note on the material it likely covers. If uncertain, outline the topics the video would generally contain.`;
      const body = { contents: [{ parts: [{ text: prompt }] }] };
      const res  = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Gemini error " + res.status);
      const json = await res.json();
      return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    async function callClaude(topic, title, vid, transcript) {
      return callGemini2(topic, title, vid, transcript);
    }



function showChatButton(){
  chatBtn.classList.add("show");
  chatPopup.dataset.summary = summaryBox.textContent; 
}

chatBtn.addEventListener("click", openChat);
chatClose.addEventListener("click", () => chatPopup.classList.remove("open"));
function openChat(){
  chatPopup.classList.add("open");
  if(!chatBody.hasChildNodes()){
    appendMsg("ai", `Here is the summary I generated. Ask me anything!\n\n${chatPopup.dataset.summary}`);
  }
  chatInput.focus();
}

chatSend.addEventListener("click", sendChat);
chatInput.addEventListener("keydown", e=>{
  if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendChat(); }
});

function appendMsg(role, text, typing=false){
  const div = document.createElement("div");
  div.className = `msg ${role}` + (typing?" typing":"");
  if(typing){ div.innerHTML = `<span class=\"dots\"></span>`; }
  else      { div.textContent = text.trim(); }
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
  return div;          
}
async function sendChat() {
  const q = chatInput.value.trim();
  if (!q) return;

  appendMsg("user", q);
  chatInput.value = "";

  const typingDiv = appendMsg("ai", "", true);

  try {
    const answer = await callGeminiChat(
      q,
      chatPopup.dataset.summary || summaryBox.textContent
    );

    typingDiv.classList.remove("typing");
    typingDiv.innerHTML = formatGeminiText(answer);  
  } catch (err) {
    typingDiv.classList.remove("typing");
    typingDiv.textContent = "❌ " + err.message;
  }
}

function formatGeminiText(text) {
  return text
    .trim()

    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")

    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")

    .replace(/\*(.*?)\*/g, "<i>$1</i>")
    .replace(/_(.*?)_/g, "<i>$1</i>")

    .replace(/`(.*?)`/g, "<code>$1</code>")

    .replace(/^- (.*)/gm, "<ul><li>$1</li></ul>")
    .replace(/^\* (.*)/gm, "<ul><li>$1</li></ul>")

    .replace(/<\/ul>\s*<ul>/g, "")

    .replace(/\n/g, "<br>");
}


async function callGeminiChat(userMsg, ctx){
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  const prompt = `You are an AI tutor. Use the following passage as context.\n\nCONTEXT:\n${ctx}\n\nUSER:\n${userMsg}`;
  const body   = { contents:[{parts:[{text:prompt}]}] };
  const res = await fetch(endpoint,{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!res.ok) throw new Error("Gemini chat error " + res.status);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}
const historyBtn   = document.getElementById("historyBtn");
const historyPanel = document.getElementById("historyPanel");
const historyClose = document.getElementById("historyClose");
const historyList  = document.getElementById("historyList");

historyBtn.classList.add("show");              
historyBtn.addEventListener("click", () => historyPanel.classList.toggle("open"));
historyClose.addEventListener("click", () => historyPanel.classList.remove("open"));

async function saveHistory(record){
  const user = auth.currentUser;
  if (user){  
    await addDoc(collection(db, "users", user.uid, "history"), record);
  }else{     
    const arr = JSON.parse(localStorage.getItem("history") || "[]");
    arr.unshift(record);                     
    localStorage.setItem("history", JSON.stringify(arr.slice(0,50)));
  }
}

async function loadHistory(){
  historyList.innerHTML = "<li style=\"padding:1rem;text-align:center;\">Loading…</li>";
  let items = [];
  const user = auth.currentUser;

  if (user){
    const q = query(
      collection(db,"users",user.uid,"history"),
      orderBy("ts","desc"), limit(50)
    );
    const snap = await getDocs(q);
    snap.forEach(d=>items.push({...d.data(), id:d.id}));
  }else{
    items = JSON.parse(localStorage.getItem("history")||"[]");
  }
  renderHistory(items);
}
function renderHistory(items){
  historyList.innerHTML = items.length
    ? ""
    : "<li style=\"padding:1rem;text-align:center;opacity:.7;\">No history</li>";

  items.forEach((rec,i)=>{
    const li = document.createElement("li");
    li.className = "history-item";
    li.innerHTML = `
      <span class=\"title\">${rec.topic}</span>
      <span class=\"time\">${new Date(rec.ts).toLocaleString()}</span>
    `;
    li.addEventListener("click", ()=>loadHistoryItem(rec));
    historyList.appendChild(li);
  });
}
function loadHistoryItem(rec){
  summaryBox.textContent = rec.summary;
  chatPopup.dataset.summary = rec.summary;
  videoLink.href = `https://youtu.be/${rec.videoId}` || "#";
  videoTitle.textContent = rec.title || rec.topic;
  thumb.src = rec.thumbnail || "";
  videoCard.style.display = "flex";
  historyPanel.classList.remove("open");
  showChatButton();                    
}


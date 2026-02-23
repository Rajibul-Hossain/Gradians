// rajibul hossain
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app-check.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-analytics.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {delAcc} from "./firebase.js"
import { HarmBlockThreshold, HarmCategory, GoogleGenerativeAI } from "@google/generative-ai";
const firebaseConfig = {
  apiKey: "AIzaSyCyiN8rCLivNQe9SXAZZzC26_oWrcXvZtE",
  authDomain: "gradian-ai.firebaseapp.com",
  projectId: "gradian-ai",
  storageBucket: "gradian-ai.appspot.com",
  messagingSenderId: "578027234132",
  appId: "1:578027234132:web:1fbd792f445d1302495ec1",
  measurementId: "G-FRKDDRQ09S"
}; const app = initializeApp(firebaseConfig), appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider("6LdNP6kpAAAAAJsZk10ZrVwOdiquE2MFWqROm_Wj"),
  isTokenAutoRefreshEnabled: true
}), auth = getAuth(), analytics = getAnalytics(app);
onAuthStateChanged(auth, (user) => {
  if (user) {
    user.isAnonymous ? Date.now() - user.createdAt > 172800000 ? delAcc() : null : null;
    if (user.emailVerified || user.isAnonymous) {
      const input = document.getElementsByTagName("input")[0], dropbox = document.getElementById("dropbox"), response = document.getElementById("response"),
        extensions = ["png", "jpeg", "webp", "heic", "heif", "jpg"];
      let file_var;
      dropbox.ondragover = e => {
        e.preventDefault();
        dropbox.classList.add("dragover")
      };
      ["ondragleave", "ondragend"].forEach(eventName => dropbox[eventName] = () => dropbox.classList.remove("dragover"));
      dropbox.ondrop = e => {
        e.preventDefault();
        handleFile(e.dataTransfer.files[0]);
      }
      document.querySelector("span:first-of-type").onclick = () => input.click();
      input.onchange = e => handleFile(e.target.files[0]);

      function handleFile(img) {
        dropbox.classList.remove("dragover");
        if (img && extensions.includes(img.name.split(".").pop().toLowerCase())) {
          dropbox.classList.add("uploaded");
          dropbox.style.backgroundImage = `url(${URL.createObjectURL(img)})`;
          file_var = img;
          run();
        } else {
          alert(`Only ${extensions.join(", ")} file formats are allowed`);
          dropbox.classList.remove("uploaded");
          dropbox.style.backgroundImage = null;
        }
      }
      async function fileToGenerativePart(file) {
        const base64EncodedDataPromise = new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(file);
        });
        return {
          inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
        };
      }
      async function run() {
        response.innerHTML = "";
        const model = new GoogleGenerativeAI("AIzaSyCDI_le44rk_KWjRz68krpemtZrm7U-2jU").getGenerativeModel({
          model: "gemini-1.5-pro", generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.9,
            topP: 1,
            topK: 3
          }, safetySettings: [{
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          }, {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          }, {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          }, {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          }]
        });
        const result = await model.generateContentStream(["Rate this handwriting from 0 to 5. And Your response will be in HTML format in this style:-Use tags like <b>,<i>,<ul>,<hr> to emphasize some points or generate a bulleted list. Use <br> and <p> tags in different paragraphs and lines.ALWAYS GENERATE RESPONSE IN different and lines separated by <br>, <p> and make the response detailed. Use an Informal as well as formal tone and EMOJIS. and keep the gaps between lines and paragraph less", ...await Promise.all([file_var].map(fileToGenerativePart))]);
        document.getElementsByTagName("section")[0].style.gridTemplateColumns = "1fr 3fr";
        for await (const chunk of result.stream) {
          response.innerHTML += chunk.text();
        }
      }
      document.getElementById("regenerate").onclick = run;
    }
    return;
  }
  location.href = "index.html";
});
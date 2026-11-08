const $ = (id) => document.getElementById(id);
const messagesEl = $("messages");
const welcome = $("welcome");
const chatView = $("chatView");
const imageView = $("imageView");
const composerWrap = $("composerWrap");
const messageInput = $("messageInput");
const fileInput = $("fileInput");
const fileName = $("fileName");
let history = JSON.parse(localStorage.getItem("talkai-history") || "[]");
let selectedFile = null;
let busy = false;

function saveHistory() {
  localStorage.setItem("talkai-history", JSON.stringify(history.slice(-60)));
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}
function addMessage(role, text, save = true) {
  welcome.classList.add("hidden");
  const item = document.createElement("div");
  item.className = `message ${role}`;
  item.innerHTML = `<div class="message-text">${escapeHTML(text)}</div>`;
  if (role === "assistant") {
    const actions = document.createElement("div");
    actions.className = "message-actions";
    const copy = document.createElement("button");
    copy.textContent = "Copy";
    copy.onclick = () => navigator.clipboard?.writeText(text);
    actions.append(copy);
    item.append(actions);
  }
  if (role === "user") {
    const actions = document.createElement("div");
    actions.className = "message-actions";
    const edit = document.createElement("button");
    edit.textContent = "Edit";
    edit.onclick = () => { messageInput.value = text; messageInput.focus(); };
    actions.append(edit);
    item.append(actions);
  }
  messagesEl.append(item);
  item.scrollIntoView({ behavior: "smooth", block: "end" });
  if (save) {
    history.push({ role, content: text });
    saveHistory();
  }
  return item;
}
function renderHistory() {
  messagesEl.innerHTML = "";
  if (!history.length) {
    welcome.classList.remove("hidden");
    return;
  }
  welcome.classList.add("hidden");
  history.forEach(m => addMessage(m.role, m.content, false));
}
async function sendMessage(text) {
  if (busy || (!text.trim() && !selectedFile)) return;
  busy = true;
  $("sendBtn").disabled = true;
  const attachment = selectedFile;
  const displayText = text.trim() + (attachment ? `\n[Attached: ${attachment.name}]` : "");
  addMessage("user", displayText);
  const typing = document.createElement("div");
  typing.className = "typing";
  typing.textContent = "TALK AI is thinking…";
  messagesEl.append(typing);
  messageInput.value = "";
  const form = new FormData();
  form.append("message", text.trim());
  form.append("history", JSON.stringify(history.slice(0, -1).slice(-12)));
  form.append("webSearch", $("webSearch").checked ? "true" : "false");
  if (attachment) form.append("file", attachment);
  selectedFile = null;
  fileInput.value = "";
  fileName.textContent = "";
  try {
    const response = await fetch("/api/chat", { method: "POST", body: form });
    const data = await response.json();
    typing.remove();
    if (!response.ok) throw new Error(data.error || "Request failed");
    addMessage("assistant", data.reply || "No response received.");
  } catch (error) {
    typing.remove();
    addMessage("assistant", `Sorry — ${error.message}`, false);
  } finally {
    busy = false;
    $("sendBtn").disabled = false;
    messageInput.focus();
  }
}
$("chatForm").addEventListener("submit", e => {
  e.preventDefault();
  sendMessage(messageInput.value);
});
fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0] || null;
  fileName.textContent = selectedFile ? `Attached: ${selectedFile.name}` : "";
});
document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt));
});
$("newChat").onclick = () => {
  history = [];
  saveHistory();
  messagesEl.innerHTML = "";
  welcome.classList.remove("hidden");
  showChat();
};
$("chatNav").onclick = showChat;
$("imageNav").onclick = showImage;
$("historyNav").onclick = () => { showChat(); renderHistory(); };
function showChat() {
  chatView.classList.remove("hidden");
  imageView.classList.add("hidden");
  composerWrap.classList.remove("hidden");
  $("sidebar").classList.remove("open");
}
function showImage() {
  chatView.classList.add("hidden");
  imageView.classList.remove("hidden");
  composerWrap.classList.add("hidden");
  $("sidebar").classList.remove("open");
}
$("menuBtn").onclick = () => $("sidebar").classList.toggle("open");
$("createImage").onclick = async () => {
  const prompt = $("imagePrompt").value.trim();
  if (!prompt) return;
  const result = $("imageResult");
  result.textContent = "Creating your image…";
  $("createImage").disabled = true;
  try {
    const response = await fetch("/api/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Image creation failed");
    result.innerHTML = `<img alt="AI-generated image" src="${data.image}">`;
  } catch (error) {
    result.innerHTML = `<p class="error">${escapeHTML(error.message)}</p>`;
  } finally {
    $("createImage").disabled = false;
  }
};
renderHistory();

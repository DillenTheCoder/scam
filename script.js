/* =========================================
   CONFIGURATION
========================================= */
const CONFIG = {
  // Your WhatsApp number, e.g. 27821234567 (no +, spaces or brackets)
  whatsapp: "27846384919",

  // Where the finished order is sent AFTER payment. Use a form service that
  // accepts a POST, e.g. Formspree: https://formspree.io/f/xxxxxxx
  formEndpoint: "https://formspree.io/f/mdegdrnr",

  deliveryDays: 3,

  // Optional family photo shown at the top. Leave "" for none.
  bannerImage: "images/Smiling Family Portrait in the Garden.png",

  // Set to true ONLY if your family records the vocals.
  familySings: true,

  packages: [
    { id: "personal",   name: "Keepsake",            price: 350,  yoco: "",
      desc: "A personal licence. Play it, gift it, share it with family and friends. Not for earning money." },
    { id: "commercial", name: "Keepsake + Business", price: 850,  yoco: "",
      desc: "Also use it in your business, ads, videos, podcasts and monetised social media." },
    { id: "exclusive",  name: "Exclusive",           price: 2500, yoco: "",
      desc: "Everything above, and we never sell, license or reuse your song for anyone else." }
  ]
};

const TERMS = [
  "<b>How the song is made.</b> Your song is created with AI music tools from the details you give us, then checked by us. You agree to say it is AI-generated wherever the law, a platform or a client requires it.",
  "<b>What you get.</b> Once paid, you receive a licence for the song and the rights we hold in it, as set out in the package you chose. Keepsake covers private, non-commercial use. Keepsake + Business adds business use and monetised content. Exclusive adds that we will not sell, license or reuse the song for anyone else.",
  "<b>No guarantee of copyright.</b> The law on copyright in AI-generated music is still unsettled and differs between countries. We give you a licence to whatever rights exist, but we cannot promise the song can be registered as copyright or protected against copying.",
  "<b>Your input stays yours.</b> Names, lyrics and stories you supply remain yours. You promise you have the right to use them and that they do not copy someone else's work or defame anyone.",
  "<b>No imitation.</b> We do not copy existing songs, and we do not imitate the voice or name of any real artist. Style references are for general feel only.",
  "<b>Resale.</b> You may not resell the song as a stock track or register it with a collecting society as a song you wrote entirely by hand. Business and Exclusive licences may upload it to streaming and video platforms, subject to each platform's own rules.",
  "<b>Changes and delivery.</b> We aim to deliver within the stated number of days. You get one free change to the lyrics or style. Because each song is made to order, we do not refund finished work, but if we cannot deliver we refund you in full.",
  "<b>Your information.</b> We use your details only to make and deliver your song and to deal with payment. Nothing in these terms limits your rights under South African law."
];

/* =========================================
   HELPERS + STATE
========================================= */
const $ = id => document.getElementById(id);
const form = $("orderForm");
const STEPS = Array.from(form.querySelectorAll(".step"));
const LAST = STEPS.length - 1;
const KEY = "botha-songs-draft-v2";
const money = n => "R" + Number(n).toLocaleString("en-ZA");
const newRef = () => "SONG-" + Math.random().toString(36).slice(2, 7).toUpperCase();

function loadDraft() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.ref && d.data) return d; } catch (e) {}
  return null;
}
function saveDraft() {
  try { localStorage.setItem(KEY, JSON.stringify(draft)); } catch (e) {}
}
function clearDraft() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}

let draft = loadDraft() || { ref: newRef(), step: 0, data: {}, payStarted: false };
let step = 0;
let sending = false;

function collect() {
  const d = {};
  form.querySelectorAll("[name]").forEach(el => {
    if (el.name === "_gotcha") return;
    if (el.type === "radio") { if (el.checked) d[el.name] = el.value; }
    else if (el.type === "checkbox") d[el.name] = el.checked;
    else d[el.name] = el.value;
  });
  return d;
}
function restore() {
  form.querySelectorAll("[name]").forEach(el => {
    const v = draft.data[el.name];
    if (v === undefined) return;
    if (el.type === "radio") el.checked = (el.value === v);
    else if (el.type === "checkbox") el.checked = !!v;
    else el.value = v;
  });
}
function chosen() {
  const el = form.querySelector('input[name="licence"]:checked');
  return el ? CONFIG.packages.find(p => p.id === el.value) || null : null;
}

/* =========================================
   BUILD STATIC PIECES
========================================= */
document.querySelectorAll(".days").forEach(e => e.textContent = CONFIG.deliveryDays);
$("pTotal").textContent = STEPS.length;
$("track").setAttribute("aria-valuemax", STEPS.length);
$("refLine").textContent = draft.ref;

if (CONFIG.familySings) {
  $("heroLede").textContent = "Answer a few questions about someone you love. We write your song and the Botha family sings it for them. It takes about 5 minutes.";
}
if (CONFIG.bannerImage) {
  const img = $("photoImg");
  img.addEventListener("load", () => { $("photo").hidden = false; });
  img.addEventListener("error", () => { $("photo").hidden = true; });
  img.src = CONFIG.bannerImage;
}

CONFIG.packages.forEach(pkg => {
  const label = document.createElement("label");
  label.className = "pkg";
  const radio = document.createElement("input");
  radio.type = "radio"; radio.name = "licence"; radio.value = pkg.id;
  const mid = document.createElement("span");
  const t = document.createElement("b"); t.textContent = pkg.name;
  const d = document.createElement("span"); d.className = "d"; d.textContent = pkg.desc;
  mid.append(t, d);
  const price = document.createElement("span"); price.className = "price"; price.textContent = money(pkg.price);
  label.append(radio, mid, price);
  $("pkgs").appendChild(label);
});
TERMS.forEach(term => { const li = document.createElement("li"); li.innerHTML = term; $("terms").appendChild(li); });

/* =========================================
   VALIDATION
========================================= */
function validateStep(i) {
  const s = STEPS[i];
  const problems = [];
  s.querySelectorAll("[data-req]").forEach(el => {
    const v = el.value.trim();
    let ok = v.length > 0;
    if (ok && el.dataset.min) ok = v.length >= Number(el.dataset.min);
    if (ok && el.hasAttribute("data-email")) ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    if (ok && el.hasAttribute("data-phone")) ok = v.replace(/\D/g, "").length >= 9;
    el.setAttribute("aria-invalid", ok ? "false" : "true");
    if (!ok) problems.push({ msg: el.dataset.label || "This field", step: i });
  });
  if (s.querySelector("#pkgs")) {
    if (!chosen()) problems.push({ msg: "A licence", step: i });
    if (!$("agree").checked) problems.push({ msg: "Acceptance of the terms", step: i });
  }
  return problems;
}
function validateAll() {
  let all = [];
  for (let i = 0; i < LAST; i++) all = all.concat(validateStep(i));
  return all;
}
function showErr(list, intro) {
  const box = $("err");
  box.textContent = "";
  const p = document.createElement("p");
  p.textContent = intro || "Please fill in:";
  box.appendChild(p);
  if (list && list.length) {
    const ul = document.createElement("ul");
    list.forEach(x => { const li = document.createElement("li"); li.textContent = x.msg || x; ul.appendChild(li); });
    box.appendChild(ul);
  }
  box.hidden = false;
}
function hideErr() { $("err").hidden = true; }

/* =========================================
   STEP NAVIGATION
========================================= */
function show(i, focus = true) {
  step = Math.max(0, Math.min(LAST, i));
  STEPS.forEach((s, n) => { s.hidden = n !== step; });
  $("pNum").textContent = step + 1;
  $("pLabel").textContent = STEPS[step].dataset.label;
  $("fill").style.width = ((step + 1) / STEPS.length * 100) + "%";
  $("track").setAttribute("aria-valuenow", step + 1);
  $("backBtn").hidden = step === 0;
  $("nextBtn").hidden = step === LAST;
  $("intro").hidden = step !== 0;
  hideErr();
  if (step === LAST) buildReview();
  draft.step = step;
  draft.data = collect();
  saveDraft();
  if (focus) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const h = STEPS[step].querySelector("h2");
    if (h) h.focus({ preventScroll: true });
  }
}

$("nextBtn").addEventListener("click", () => {
  const errs = validateStep(step);
  if (errs.length) {
    showErr(errs);
    const bad = STEPS[step].querySelector('[aria-invalid="true"]');
    if (bad) bad.focus();
    return;
  }
  show(step + 1);
});
$("backBtn").addEventListener("click", () => show(step - 1));

form.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "checkbox" && e.target.type !== "radio") {
    e.preventDefault();
    if (step < LAST) $("nextBtn").click();
  }
});
form.addEventListener("submit", e => e.preventDefault());

form.addEventListener("input", e => {
  if (e.target.getAttribute && e.target.getAttribute("aria-invalid") === "true") e.target.setAttribute("aria-invalid", "false");
  const old = draft.data.licence;
  draft.data = collect();
  if (draft.payStarted && old !== draft.data.licence) { draft.payStarted = false; }
  saveDraft();
  if (step === LAST) buildReview();
});
form.addEventListener("change", () => { form.dispatchEvent(new Event("input")); });

/* =========================================
   REVIEW + PAYMENT
========================================= */
function clip(s, n = 120) { s = (s || "").trim(); return s.length > n ? s.slice(0, n) + "..." : s; }

function buildReview() {
  const d = collect();
  const pkg = chosen();
  const rows = [
    ["Song for", d.recipient_name + " (" + d.relationship + ")", 0],
    ["Occasion", d.occasion + (d.need_by_date ? ", needed by " + d.need_by_date : ""), 0],
    ["About them", clip(d.personality, 90), 1],
    ["Memory", clip(d.favourite_memory, 90), 2],
    ["Message", clip(d.message, 90), 3],
    ["Sound", [d.style, d.mood, d.language, d.voice].join(" · "), 4],
    ["You", d.customer_name + ", " + d.customer_phone + ", " + d.customer_email, 5],
    ["Licence", pkg ? pkg.name + " " + money(pkg.price) : "Not chosen", 6]
  ];
  const box = $("review");
  box.textContent = "";
  rows.forEach(([k, v, target]) => {
    const r = document.createElement("div"); r.className = "r";
    const a = document.createElement("span"); a.className = "k"; a.textContent = k;
    const b = document.createElement("span"); b.className = "v"; b.textContent = v;
    const c = document.createElement("button"); c.type = "button"; c.textContent = "Edit";
    c.addEventListener("click", () => show(target));
    r.append(a, b, c);
    box.appendChild(r);
  });
  $("sumPkg").textContent = pkg ? pkg.name : "No licence chosen";
  $("sumPrice").textContent = pkg ? money(pkg.price) : "R0";
  const pay = $("payBtn");
  pay.href = pkg && pkg.yoco ? pkg.yoco : "#";
  $("afterPay").hidden = !draft.payStarted;
}

$("payBtn").addEventListener("click", e => {
  const pkg = chosen();
  const errs = validateAll();
  if (errs.length) {
    e.preventDefault();
    showErr(errs, "Before you pay, please complete:");
    show(errs[0].step, false);
    showErr(errs, "Before you pay, please complete:");
    return;
  }
  if (!pkg || !pkg.yoco) {
    e.preventDefault();
    showErr([], "Online payment is not switched on yet. Please message us on WhatsApp to order.");
    return;
  }
  hideErr();
  draft.payStarted = true;
  draft.data = collect();
  saveDraft();
  $("afterPay").hidden = false;
  setTimeout(() => $("afterPay").scrollIntoView({ behavior: "smooth", block: "center" }), 300);
});

function orderText() {
  const d = collect();
  const pkg = chosen();
  const lines = ["NEW SONG ORDER", "Order number: " + draft.ref, ""];
  const labels = {
    recipient_name: "Song for", name_pronunciation: "Name said", relationship: "Relationship", occasion: "Occasion",
    need_by_date: "Need by", age: "Age", personality: "Personality", loves: "Loves",
    favourite_memory: "Memory", nicknames_jokes: "Nicknames / jokes", names_places: "Names / places",
    message: "Message", must_include: "Must include", avoid: "Avoid", own_lyrics: "Own lyrics",
    style: "Style", mood: "Mood", language: "Language", other_language: "Other language", voice: "Voice",
    tempo: "Pace", similar_songs: "Similar songs",
    customer_name: "Customer", customer_phone: "WhatsApp", customer_email: "Email",
    contact_preference: "Contact by", heard_about_us: "Heard about us"
  };
  Object.keys(labels).forEach(k => { if (d[k] && String(d[k]).trim()) lines.push(labels[k] + ": " + String(d[k]).trim()); });
  lines.push("", "Licence: " + (pkg ? pkg.name + " (" + money(pkg.price) + ")" : "Not selected"), "Terms accepted: " + (d.terms_accepted ? "Yes" : "No"));
  return lines.join("\n");
}

$("copyBtn").addEventListener("click", async () => {
  const b = $("copyBtn");
  try { await navigator.clipboard.writeText(orderText()); b.textContent = "Copied"; }
  catch (e) { b.textContent = "Copy failed"; }
  setTimeout(() => { b.textContent = "Copy order details"; }, 2000);
});

/* =========================================
   SUBMIT (only reachable after paying)
========================================= */
$("sendBtn").addEventListener("click", async () => {
  if (sending) return;
  if (!draft.payStarted) { showErr([], "Please pay with Yoco first."); return; }
  const errs = validateAll();
  if (errs.length) { show(errs[0].step, false); showErr(errs); return; }
  if (!CONFIG.formEndpoint) {
    showErr([], "Our order inbox is not connected yet. Please copy your order details and send them to us on WhatsApp with your order number.");
    return;
  }
  if (form.elements["_gotcha"].value) { finish(); return; }

  sending = true;
  const btn = $("sendBtn");
  btn.disabled = true;
  btn.textContent = "Sending...";
  hideErr();

  const pkg = chosen();
  const fd = new FormData();
  const d = collect();
  Object.keys(d).forEach(k => fd.append(k, typeof d[k] === "boolean" ? (d[k] ? "yes" : "no") : d[k]));
  fd.append("order_number", draft.ref);
  fd.append("licence_name", pkg.name);
  fd.append("price_zar", pkg.price);
  fd.append("customer_says_paid", "yes");
  fd.append("_subject", "New song order " + draft.ref + " (" + pkg.name + " " + money(pkg.price) + ")");

  try {
    const res = await fetch(CONFIG.formEndpoint, { method: "POST", body: fd, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("bad status " + res.status);
    finish();
  } catch (err) {
    sending = false;
    btn.disabled = false;
    btn.textContent = "I have paid. Send my order";
    showErr([], "We could not send your order. Please check your connection and try again. Your answers are saved. If it keeps failing, tap Copy order details and WhatsApp it to us.");
  }
});

function finish() {
  const ref = draft.ref;
  clearDraft();
  form.hidden = true;
  $("progress").hidden = true;
  $("intro").hidden = true;
  $("thanks").hidden = false;
  $("thanksRef").textContent = ref;
  if (CONFIG.whatsapp.trim()) {
    $("waBtn").href = "https://wa.me/" + CONFIG.whatsapp.trim() + "?text=" + encodeURIComponent("Hi, I just ordered a song. My order number is " + ref + ".");
    $("waBtn").hidden = false;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
  $("thanksH").focus({ preventScroll: true });
}

/* =========================================
   START
========================================= */
restore();
(function init() {
  let start = Math.min(draft.step || 0, LAST);
  const params = new URLSearchParams(location.search);
  if (params.has("paid") && Object.keys(draft.data).length) {
    draft.payStarted = true;
    start = LAST;
    history.replaceState(null, "", location.pathname);
  }
  show(start, false);
})();
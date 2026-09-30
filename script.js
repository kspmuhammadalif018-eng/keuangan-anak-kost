const STORAGE_KEY = "kostfinance_transactions";
const BUDGET_KEY = "kostfinance_budget";

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let budget = Number(localStorage.getItem(BUDGET_KEY) || 0);

const $ = (id) => document.getElementById(id);

function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  localStorage.setItem(BUDGET_KEY, budget);
}

function getMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function currentMonthTransactions() {
  const month = getMonthKey();
  return transactions.filter(t => t.date.slice(0, 7) === month);
}

function formatDate(dateString) {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function iconFor(category) {
  const icons = {
    Makan: "🍚",
    Bensin: "🛵",
    Kos: "🏠",
    Pulsa: "📱",
    Kuliah: "📚",
    Laundry: "👕",
    Warkop: "☕",
    Belanja: "🛒",
    Lainnya: "📦"
  };
  return icons[category] || "💰";
}

function todayTransactions() {
  const today = new Date().toISOString().slice(0, 10);
  return transactions.filter(t => t.date === today);
}

function renderToday() {
  const todayData = todayTransactions();

  const todayIncome = todayData
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const todayExpense = todayData
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  $("todayIncome").textContent = rupiah(todayIncome);
  $("todayExpense").textContent = rupiah(todayExpense);
  $("todayBalance").textContent = rupiah(todayIncome - todayExpense);

  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();

  const dailyLimit = budget > 0 ? budget / daysInMonth : 0;
  $("todayDailyLimit").textContent = budget > 0 ? rupiah(dailyLimit) : "Rp0";

  $("todayTransactionList").innerHTML = todayData.length
    ? [...todayData].sort((a, b) => b.id - a.id).map(t => transactionHTML(t, true)).join("")
    : '<div class="empty">Belum ada transaksi hari ini. Yuk catat dulu!</div>';
}

function renderDashboard() {
  const monthData = currentMonthTransactions();

  const totalIncome = monthData
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = monthData
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const allIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const allExpense = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  $("balance").textContent = rupiah(allIncome - allExpense);
  $("income").textContent = rupiah(totalIncome);
  $("expense").textContent = rupiah(totalExpense);

  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();

  const dailyLimit = budget > 0 ? budget / daysInMonth : 0;
  $("dailyLimit").textContent = budget > 0 ? rupiah(dailyLimit) : "Rp0";
  $("dailyInfo").textContent = budget > 0
    ? "Rata-rata batas per hari"
    : "Atur budget bulanan";

  renderCategories(monthData);
  renderRecent();
  renderBudgetStatus(totalExpense);
}

function renderCategories(monthData) {
  const expenses = {};

  monthData
    .filter(t => t.type === "expense")
    .forEach(t => {
      expenses[t.category] = (expenses[t.category] || 0) + t.amount;
    });

  const data = Object.entries(expenses).sort((a, b) => b[1] - a[1]);

  if (!data.length) {
    $("categoryChart").innerHTML = '<div class="empty">Belum ada pengeluaran bulan ini.</div>';
    return;
  }

  const max = data[0][1];

  $("categoryChart").innerHTML = data.map(([category, amount]) => `
    <div class="category-row">
      <div class="category-name">${iconFor(category)} ${category}</div>
      <div class="bar-bg">
        <div class="bar" style="width:${(amount / max) * 100}%"></div>
      </div>
      <div class="category-value">${rupiah(amount)}</div>
    </div>
  `).join("");
}

function transactionHTML(t, showDelete = false) {
  const sign = t.type === "income" ? "+" : "-";
  const colorClass = t.type === "income" ? "income-text" : "expense-text";

  return `
    <div class="transaction">
      <div class="transaction-info">
        <div class="transaction-icon">${iconFor(t.category)}</div>
        <div>
          <div class="transaction-title">${t.note || t.category}</div>
          <div class="transaction-date">${t.category} • ${formatDate(t.date)}</div>
        </div>
      </div>
      <div>
        <span class="transaction-amount ${colorClass}">
          ${sign}${rupiah(t.amount)}
        </span>
        ${showDelete ? `<button class="delete-btn" onclick="deleteTransaction('${t.id}')">Hapus</button>` : ""}
      </div>
    </div>
  `;
}

function renderRecent() {
  const recent = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id)
    .slice(0, 5);

  $("recentTransactions").innerHTML = recent.length
    ? recent.map(t => transactionHTML(t)).join("")
    : '<div class="empty">Belum ada transaksi.</div>';
}

function renderTransactions() {
  const filter = $("filterType").value;

  let data = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);

  if (filter !== "all") {
    data = data.filter(t => t.type === filter);
  }

  $("transactionList").innerHTML = data.length
    ? data.map(t => transactionHTML(t, true)).join("")
    : '<div class="empty">Belum ada transaksi yang sesuai.</div>';
}

function renderBudgetStatus(totalExpense = null) {
  if (totalExpense === null) {
    totalExpense = currentMonthTransactions()
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
  }

  $("budgetAmount").textContent = rupiah(budget);

  if (!budget) {
    $("budgetProgress").style.width = "0%";
    $("budgetMessage").textContent = "Belum ada budget. Atur budget untuk melihat batas pengeluaran.";
    return;
  }

  const percentage = Math.min((totalExpense / budget) * 100, 100);
  $("budgetProgress").style.width = percentage + "%";

  if (totalExpense > budget) {
    $("budgetMessage").textContent =
      `Budget terlewati ${rupiah(totalExpense - budget)}.`;
  } else {
    $("budgetMessage").textContent =
      `Sudah terpakai ${Math.round(percentage)}%. Sisa ${rupiah(budget - totalExpense)}.`;
  }
}

function refresh() {
  saveData();
  renderDashboard();
  renderTransactions();
  renderToday();
}

const THEME_KEY = "kostfinance_theme";

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  const btn = $("themeToggle");
  if (btn) btn.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem(THEME_KEY, theme);
}

(function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(saved === "dark" ? "dark" : "light");
})();

$("themeToggle").addEventListener("click", (e) => {
  const btn = e.currentTarget;
  btn.style.transform = "scale(0.85) rotate(-15deg)";
  setTimeout(() => { btn.style.transform = ""; }, 180);
  const next = document.body.classList.contains("dark") ? "light" : "dark";
  applyTheme(next);
});

function openModal() {
  $("modal").classList.add("show");
  $("date").value = new Date().toISOString().slice(0, 10);
}

function closeModal() {
  $("modal").classList.remove("show");
}

$("openModal").addEventListener("click", openModal);
$("closeModal").addEventListener("click", closeModal);

$("modal").addEventListener("click", (e) => {
  if (e.target === $("modal")) closeModal();
});

$("transactionForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const type = document.querySelector('input[name="type"]:checked').value;
  const amount = Number($("amount").value);
  const category = $("category").value;
  const date = $("date").value;
  const note = $("note").value.trim();

  if (!amount || amount <= 0 || !date) return;

  transactions.push({
    id: Date.now(),
    type,
    amount,
    category,
    date,
    note
  });

  e.target.reset();
  $("date").value = new Date().toISOString().slice(0, 10);

  closeModal();
  refresh();
});

$("budgetForm").addEventListener("submit", (e) => {
  e.preventDefault();

  budget = Number($("budgetInput").value) || 0;
  $("budgetInput").value = "";

  refresh();
  alert("Budget berhasil disimpan!");
});

$("filterType").addEventListener("change", renderTransactions);

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    const section = button.dataset.section;
    showSection(section);
  });
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showSection(button.dataset.go));
});

function showSection(section) {
  document.querySelectorAll(".page-section").forEach(el => {
    el.classList.remove("active");
  });

  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.remove("active");
  });

  $(section).classList.add("active");

  const nav = document.querySelector(`[data-section="${section}"]`);
  if (nav) nav.classList.add("active");

  const titles = {
    dashboard: "Dashboard",
    transactions: "Transaksi",
    budget: "Budget",
    "hari-ini": "Hari Ini"
  };

  $("pageTitle").textContent = titles[section] || "Dashboard";
}

window.deleteTransaction = function(id) {
  if (!confirm("Hapus transaksi ini?")) return;

  transactions = transactions.filter(t => String(t.id) !== String(id));
  refresh();
};

$("budgetInput").value = budget || "";
$("date").value = new Date().toISOString().slice(0, 10);

refresh();

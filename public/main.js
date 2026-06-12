function setupPageRefresh() {
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            refreshAllData();
        }
    });
}

async function refreshAllData() {
    await updateUI();
    await loadBarChart();
    await loadPieChart();
    await savingsUpdate();
    await calculateMonthlySavings();
}

async function checkAuth() {
    let res = await fetch('/api/me', { credentials: 'include' });
    if (!res.ok) {
        window.location.href = "login.html";
        return false;
    }
    let data = await res.json();
    return data.username;
}

async function getExpenses() {
    let res = await fetch('/api/expenses', { credentials: 'include' });
    return res.json();
}

async function getSavings() {
    let res = await fetch('/api/goals', { credentials: 'include' });
    return res.json();
}

async function getProfile() {
    try {
        let res = await fetch('/api/profile', { credentials: 'include' });
        if (res.ok) {
            return await res.json();
        }
        return null;
    } catch (err) {
        return null;
    }
}

async function calculateMonthlySavings() {
    let profile = await getProfile();
    let monthlyIncome = profile?.monthlyIncome || 0;
    
    let expenses = await getExpenses();
    let now = new Date();
    let currentMonthExpenses = expenses
        .filter(exp => exp.month === now.getMonth())
        .reduce((sum, exp) => sum + Number(exp.amount), 0);
    
    let savings = monthlyIncome - currentMonthExpenses;
    let savingsElement = document.getElementById('monthlySavings');
    if (savingsElement) {
        savingsElement.innerHTML = `$${Math.max(0, savings)}`;
    }
}

let pieChartInstance = null;

async function loadPieChart() {
    let expenses = await getExpenses();

    if (expenses.length == 0) {
        let pichart = document.getElementById("pichart");
        if (pichart) pichart.innerHTML = "No expenses done yet";
        return;
    }

    let latest = expenses[0];
    let filtered = expenses;

    if (currentView === "month" && expenses.length > 0) {
        filtered = expenses.filter(exp => exp.month === latest.month);
    }

    let categoryTotals = {};
    filtered.forEach((exp) => {
        let cat = exp.category;
        let amt = Number(exp.amount);
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    });

    let labels = Object.keys(categoryTotals);
    let data = Object.values(categoryTotals);

    let n = labels.length;
    let sortedIndices = labels.map((_, i) => i).sort((a, b) => data[a] - data[b]);
    let colors = new Array(n);
    sortedIndices.forEach((originalIndex, rank) => {
        let lightness = n > 1 ? 85 - (rank * (50 / (n - 1))) : 60;
        colors[originalIndex] = `hsl(265, 60%, ${lightness}%)`;
    });

    let ctx_pi = document.getElementById("pichart");

    if (pieChartInstance) {
        pieChartInstance.destroy();
    }

    pieChartInstance = new Chart(ctx_pi, {
        type: "doughnut",
        data: {
            labels: labels,
            datasets: [{
                label: "Expenses",
                backgroundColor: colors,
                data: data,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: $${context.parsed || 0}`;
                        }
                    }
                }
            },
            cutout: "65%",
        },
    });
}

async function updateUI() {
    let expenses = await getExpenses();
    
    let table = document.getElementById("table");
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }
    
    if (expenses.length === 0) {
        let row = table.insertRow(1);
        let cell = row.insertCell(0);
        cell.colSpan = 4;
        cell.innerHTML = "No expenses yet. Add your first expense!";
        cell.style.textAlign = "center";
        cell.style.padding = "2em";
        let lastTransaction = document.getElementById('last_transaction');
        if (lastTransaction) lastTransaction.innerHTML = "$0";
        return;
    }
    
    for (let i = 0; i < expenses.length; i++) {
        let expense = expenses[i];
        let row = table.insertRow(1);
        row.insertCell(0).innerHTML = `$${expense.amount}`;
        row.insertCell(1).innerHTML = expense.category;
        row.insertCell(2).innerHTML = expense.date;
        row.insertCell(3).innerHTML = expense.time;
    }
    
    let latest = expenses[0];
    let lastTransaction = document.getElementById('last_transaction');
    if (lastTransaction) lastTransaction.innerHTML = `$${latest.amount}`;
}

function getmonthlyData(expenses) {
    let monthlyTotal = new Array(12).fill(0);
    expenses.forEach((exp) => {
        monthlyTotal[exp.month] += Number(exp.amount);
    });
    return monthlyTotal;
}

let currentView = "month";
let barChartInstance = null;

async function loadBarChart() {
    let expenses = await getExpenses();
    let netExpenses = document.getElementById('net_expense');
    let ctx_bar = document.getElementById("bargraph");
    
    if (expenses.length == 0) {
        if (ctx_bar) ctx_bar.innerText = "No expenses done yet";
        if (netExpenses) netExpenses.innerHTML = "$0";
        return;
    }
    
    let latest = expenses[0];
    let monthlyData = getmonthlyData(expenses);
    
    if (ctx_bar && ctx_bar.getContext) {
        let ctx = ctx_bar.getContext("2d");
        
        if (barChartInstance) {
            barChartInstance.destroy();
        }

        if (currentView === "year") {
            let yearTotal = monthlyData.reduce((a, b) => a + b, 0);
            if (netExpenses) netExpenses.innerHTML = `$${yearTotal}`;

            barChartInstance = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
                    datasets: [{
                        label: "Money Flow",
                        backgroundColor: "rgb(137, 104, 255)",
                        borderColor: "rgb(109, 69, 255)",
                        data: monthlyData,
                        borderWidth: 1.5,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } },
                },
            });
        } else {
            if (netExpenses) netExpenses.innerHTML = `$${monthlyData[latest.month]}`;
            
            let now = new Date();
            let year = now.getFullYear();
            let month = latest.month;
            let daysInMonth = new Date(year, month + 1, 0).getDate();
            let dailyTotals = new Array(daysInMonth).fill(0);

            expenses.forEach((exp) => {
                if (exp.month === month) {
                    let day = new Date(exp.date).getDate();
                    if (!isNaN(day) && day >= 1 && day <= daysInMonth) {
                        dailyTotals[day - 1] += Number(exp.amount);
                    }
                }
            });

            let labels = [];
            for (let d = 1; d <= daysInMonth; d++) {
                labels.push(d.toString());
            }

            barChartInstance = new Chart(ctx, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Daily Expenses",
                        backgroundColor: "rgba(137, 104, 255, 0.2)",
                        borderColor: "rgb(109, 69, 255)",
                        data: dailyTotals,
                        borderWidth: 1.5,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 3,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true },
                        x: { title: { display: true, text: "Day of Month" } },
                    },
                },
            });
        }
    }
}

function toggleView() {
    currentView = currentView === "month" ? "year" : "month";

    let monthBtn = document.getElementById("month");
    let monthlyCard = document.getElementById("monthly_expense_label");
    let viewToggle = document.getElementById("view_toggle_label");

    if (currentView === "year") {
        if (monthBtn) monthBtn.innerHTML = "This month";
        if (monthlyCard) monthlyCard.innerHTML = "Yearly Expenses";
        if (viewToggle) viewToggle.innerHTML = "Click to view for the current month";
    } else {
        if (monthBtn) monthBtn.innerHTML = "This year";
        if (monthlyCard) monthlyCard.innerHTML = "Monthly Expenses";
        if (viewToggle) viewToggle.innerHTML = "Click to view for the whole year";
    }

    loadBarChart();
    loadPieChart();
}

let monthBtn = document.getElementById("month");
if (monthBtn) {
    monthBtn.addEventListener("click", toggleView);
}

let calendarBtn = document.getElementById("calendar");
if (calendarBtn) {
    calendarBtn.addEventListener("click", () => {
        alert("Calendar feature - showing current date: " + new Date().toLocaleDateString());
    });
}

async function savingsUpdate() {
    let savings = await getSavings();
    let savingsBox = document.getElementById("savingsgoal");
    if (!savingsBox) return;
    
    savingsBox.innerHTML = "<h3>Savings Goal</h3>";

    if (savings.length === 0) {
        savingsBox.innerHTML += "<p style='margin-top: 1em; color: gray;'>No savings goals yet. Add one!</p>";
        return;
    }

    savings.forEach((s) => {
        let percent = Math.min(100, Math.round((s.saved / s.target) * 100));
        let displayName = s.goal.replace(/_/g, " ");

        let div = document.createElement("div");
        div.className = "goal-item";

        div.innerHTML = `
            <div class="goal-top">
                <span class="goal-name">${displayName}</span>
                <span class="goal-amounts">$${s.saved} / $${s.target}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${percent}%"></div>
            </div>
            <div class="goal-bottom">
                <span class="goal-percent">${percent}%</span>
                <button class="add-savings-btn" data-id="${s._id}">+ Add</button>
            </div>
        `;

        savingsBox.appendChild(div);
    });

    document.querySelectorAll(".add-savings-btn").forEach(button => {
        button.addEventListener("click", async function() {
            let id = this.getAttribute("data-id");
            let amount = prompt("Enter amount to add:");
            amount = Number(amount);

            if (!amount || amount <= 0) {
                alert("Please enter a valid positive amount");
                return;
            }

            await fetch(`/api/goals/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ amount })
            });

            savingsUpdate();
        });
    });
}

(async function init() {
    let username = await checkAuth();
    if (!username) return;

    let greet = document.querySelector(".greet");
    if (greet) greet.textContent = `Hello ${username}!! View and manage your monthly expenses here`;

    setupPageRefresh();
    await refreshAllData();
})();
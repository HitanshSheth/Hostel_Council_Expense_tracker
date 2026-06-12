let categorySelect = document.getElementById('categorySelect');
let customCategoryInput = document.getElementById('customCategory');

categorySelect.addEventListener("change", function() {
    if (this.value === "custom") {
        customCategoryInput.style.display = "block";
        customCategoryInput.focus();
    } else {
        customCategoryInput.style.display = "none";
        customCategoryInput.value = "";
    }
});

document.getElementById('addBtn').addEventListener("click", function(e){
    e.preventDefault();
    
    let amount = document.getElementById('amount').value;
    let category = document.getElementById('categorySelect').value;
    let customCategory = document.getElementById("customCategory").value;

    if (category == "") {
        alert("Please select a category");
        return;
    }

    if (category == "custom") {
        if (customCategory.trim() == "") {
            alert("Please enter a custom category name");
            return;
        }
        category = customCategory.trim().toLowerCase();
    }

    if (amount <= 0 || amount == "") {
        alert("Please enter a non-zero amount");
        return;
    }

    let now = new Date();

    let single_expense = {
        amount: Number(amount),
        category: category,
        time: now.toLocaleTimeString(),
        date: now.toLocaleDateString(),
        month: now.getMonth(),
    };

    fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(single_expense)
    })
    .then(res => res.json())
    .then(() => {
        window.location.href = "index2.html";
    })
    .catch(err => alert("Error saving expense: " + err));
});
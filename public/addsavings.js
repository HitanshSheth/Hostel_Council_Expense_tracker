let btn = document.getElementById("addGoal");
let savingsGoalSelect = document.getElementById('savingsGoal');
let customGoalInput = document.getElementById('customGoal');

savingsGoalSelect.addEventListener("change", function() {
    if (this.value === "custom") {
        customGoalInput.style.display = "block";
        customGoalInput.focus();
    } else {
        customGoalInput.style.display = "none";
        customGoalInput.value = "";
    }
});

btn.addEventListener("click", function(){
    let goal_select = savingsGoalSelect.value;
    let customGoal = customGoalInput.value;

    if (goal_select == "")
    {
        alert("Please select a proper category");
        return;
    }

    if (goal_select == "custom")
    {
        if (customGoal.trim() == "") {
            alert("Please enter a custom goal name");
            return;
        }
        goal_select = customGoal.trim().toLowerCase();
    }

    let amt = document.getElementById('amount');
    if (amt.value == "" || amt.value <= 0 )
    {
        alert("Please enter a positive value");
        return;
    }

    fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ goal: goal_select, target: Number(amt.value) })
    })
    .then(res => res.json())
    .then(() => {
        window.location.href = "index2.html";
    })
    .catch(err => alert("Error saving goal: " + err));
});

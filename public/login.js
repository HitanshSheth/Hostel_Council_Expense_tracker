let isLogin = true;

document.getElementById("toggleMode").addEventListener("click", function() {
    isLogin = !isLogin;
    document.getElementById("formTitle").innerText = isLogin ? "Login" : "Register";
    document.getElementById("submitBtn").innerText = isLogin ? "Login" : "Register";
    this.innerText = isLogin ? "Need an account? Register" : "Already have an account? Login";
});

document.getElementById("submitBtn").addEventListener("click", async function() {
    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value;

    if (!username || !password) {
        alert("Please enter both username and password");
        return;
    }

    let endpoint = isLogin ? "/api/login" : "/api/register";

    try {
        let res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password })
        });

        let data = await res.json();

        if (!res.ok) {
            alert(data.error || "Something went wrong");
            return;
        }

        window.location.href = "index2.html";
    } catch (err) {
        alert("Error: " + err);
    }
});
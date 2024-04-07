function navigateToGame() {
    let path = window.location.pathname;
    if (path.endsWith("index.html")) {
        path = path.substring(0, path.length - 10);
    }
    // If path ends with /, remove it
    if (path.endsWith("/")) {
        path = path.substring(0, path.length - 1);
    }
    window.location.href = path + "/game";
}

function navigateToList() {
    let path = window.location.pathname;
    if (path.endsWith("index.html")) {
        path = path.substring(0, path.length - 10);
    }
    if (path.endsWith("/")) {
        path = path.substring(0, path.length - 1);
    }

    window.location.href = path + "/list";
}
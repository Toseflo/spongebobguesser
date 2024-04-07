function getGamePath() {
    // Extract the first path element
    const path = window.location.pathname.split("/")[1];

    // Handle edge cases (empty path or single "/")
    if (!path) {
        return window.location.origin + "/game";
    }

    // Construct the new URL with "/game" appended
    return window.location.origin + "/" + path + "/game";
}

function getListPath() {
    // Extract the first path element
    const path = window.location.pathname.split("/")[1];

    // Handle edge cases (empty path or single "/")
    if (!path) {
        return window.location.origin + "/list";
    }

    // Construct the new URL with "/game" appended
    return window.location.origin + "/" + path + "/list";
}
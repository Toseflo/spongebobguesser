const languageSelect = document.getElementById('language-select');
const imageContainer = document.getElementById('image-container');
const homeIcon = document.getElementById('home-icon');
const feedbackText = document.getElementById('feedback-text');
const imageNumberField = document.getElementById('image-number');
const episodeNumberField = document.getElementById('episode-number');
const episodeSelect = $('#episode-select');
let imagesJsonData = {};
let titlesJsonData = {};
let seasonsJsonData = {};
let episodeKeys = [];
let imageKeys = [];
let selectedImageNumber = 0;
let maxImageNumber = 0;
let selectedEpisodeNumber = 0;
let maxEpisodeNumber = 0;

let fetchDone = false;

placeRandomFlowers();

$(document).ready(function () {
    episodeSelect.select2({
        placeholder: 'Select an episode to view the images',
    });
});

tippy(homeIcon, {
    content: 'Back to the homepage',
    animation: 'shift-away-subtle',
});

episodeSelect.select2({
    closeOnSelect: false
});

// First fetch the season keys from the season-keys JSON file
fetch('../game/season-keys.json')
    .then(response => response.json())
    .then(data => {
        seasonsJsonData = data;
        for (let seasonKey of Object.keys(data)) {
            episodeKeys = episodeKeys.concat(data[seasonKey]);
        }
        maxEpisodeNumber = episodeKeys.length - 1;

        // After that fetch the image list from the image-list JSON file
        return fetch('../game/image-list.json');
    })
    .then(response => response.json())
    .then(data => {
        imagesJsonData = data;

        // After that fetch the language keys from the episode-titles JSON file and populate the language select
        return fetch('../game/episode-titles.json');
    })
    .then(response => response.json())
    .then(data => {
        titlesJsonData = data;
        for (let language in data) {
            let option = document.createElement('option');
            option.value = language; // Set the value of the option
            option.textContent = language; // Set the text displayed in the option
            languageSelect.appendChild(option);
        }

        loadConfig();
        loadEpisodeNames();
        updateEpisodeNumber();
        showImage(selectedEpisodeNumber, 0);
        fetchDone = true;
    });

function loadEpisodeNames() {
    episodeSelect.empty();

    let episodeCounter = 0;
    for (let seasonKey of Object.keys(seasonsJsonData)) {
        let seasonEpisodeKeys = seasonsJsonData[seasonKey];
        let keyedEpisodeNames = titlesJsonData[languageSelect.value];

        // Fill the episode select with the episode names for the selected language
        // Add an option group for each season
        let seasonGroup = document.createElement('optgroup');
        let seasonGroupLabel = seasonKey;
        // If it starts with S, replace it with Season
        if (seasonGroupLabel.startsWith('S')) {
            seasonGroupLabel = seasonGroupLabel.replace('S', 'Season ');
        }
        seasonGroup.label = seasonGroupLabel;
        episodeSelect.append(seasonGroup);
        for (const episodeKey of seasonEpisodeKeys) {
            let option = document.createElement('option');
            option.value = episodeCounter.toString();
            episodeCounter++;
            option.textContent = keyedEpisodeNames[episodeKey]; // Set the text displayed in the option
            episodeSelect.append(option);
        }
    }

    if (selectedEpisodeNumber) {
        episodeSelect.val(selectedEpisodeNumber);
    } else {
        episodeSelect.val(0);
    }
}

// When the language select changes, load the episode names for the selected language
languageSelect.addEventListener('change', function () {
    if (!fetchDone) return;
    loadEpisodeNames();
    saveConfig();
});

episodeSelect.on('change', function () {
    selectedEpisodeNumber = +episodeSelect.val();
    updateEpisodeNumber();
    showImage();
});

function showImage() {
    const selectedEpisodeKey = episodeKeys[selectedEpisodeNumber];
    const imageList = imagesJsonData[selectedEpisodeKey];
    const imageKey = imageList[selectedImageNumber];
    const encodedImage = encodeURI('../game/randomframes/' + imageKey);

    let imageElement = new Image();
    imageElement.src = encodedImage;
    imageElement.style.maxWidth = '100%';
    imageElement.style.maxHeight = '100%';

    // Append the image to the container
    imageContainer.innerHTML = ''; // Clear previous content
    imageContainer.appendChild(imageElement);

    // Once the image is loaded, calculate aspect ratio and adjust container size
    imageElement.onload = function() {
        let aspectRatio = imageElement.width / imageElement.height;
        imageContainer.style.paddingTop = (100 / aspectRatio) + "%";

        // Adjust the position of the image
        imageElement.style.position = 'absolute';
        imageElement.style.left = '0';
        imageElement.style.top = '0';
    };

    feedbackText.style.display = 'none';
}

function saveConfig() {
    const selectedLanguage = languageSelect.value;
    window.localStorage.setItem('selected-language', selectedLanguage);
    let selectedEpisodeKey = episodeKeys[selectedEpisodeNumber];
    window.localStorage.setItem('list-selected-episode', selectedEpisodeKey);
}

function loadConfig() {
    const selectedLanguage = window.localStorage.getItem('selected-language');
    if (selectedLanguage) {
        // Test if the language is in the language select
        const languageOption = languageSelect.querySelector('option[value="' + selectedLanguage + '"]');
        if (languageOption) {
            languageSelect.value = selectedLanguage;
        }
    }

    const selectedEpisodeKey = window.localStorage.getItem('list-selected-episode');
    if (selectedEpisodeKey) {
        // Test if the episode is in the episodeKeys
        const episodeIndex = episodeKeys.indexOf(selectedEpisodeKey);
        if (episodeIndex >= 0) {
            selectedEpisodeNumber = episodeIndex;
        }
    }
}

function updateEpisodeNumber() {
    saveConfig();
    // The episode number is "Episode" in bold in the first line. The second line is the selected episode / total episodes
    episodeNumberField.innerHTML = 'Episode <br>' + (selectedEpisodeNumber + 1) + '/' + episodeKeys.length + '</br>';

    selectedImageNumber = 0;
    imageKeys = imagesJsonData[episodeKeys[selectedEpisodeNumber]];
    maxImageNumber = imageKeys.length - 1;
    updateImageNumber();
}

function updateImageNumber() {
    // The image number is "Image" in bold in the first line. The second line is the selected image / total images
    imageNumberField.innerHTML = 'Image <br>' + (selectedImageNumber + 1) + '/' + imageKeys.length + '</br>';

}

function nextImage() {
    selectedImageNumber++;
    if (selectedImageNumber > maxImageNumber) {
        selectedImageNumber = 0;
    }
    updateImageNumber();
    showImage();
}

function prevImage() {
    selectedImageNumber--;
    if (selectedImageNumber < 0) {
        selectedImageNumber = maxImageNumber;
    }
    updateImageNumber();
    showImage();
}

function nextEpisode() {
    selectedEpisodeNumber++;
    if (selectedEpisodeNumber > maxEpisodeNumber) {
        selectedEpisodeNumber = 0;
    }
    episodeSelect.val(selectedEpisodeNumber).trigger('change');
    updateEpisodeNumber();
    showImage();
}

function prevEpisode() {
selectedEpisodeNumber--;
    if (selectedEpisodeNumber < 0) {
        selectedEpisodeNumber = maxEpisodeNumber;
    }
    episodeSelect.val(selectedEpisodeNumber).trigger('change');
    updateEpisodeNumber();
    showImage();
}

function placeRandomFlowers() {
    const flowerList = ['flower1.png', 'flower2.png', 'flower3.png', 'flower4.png', 'flower5.png', 'flower6.png'];
    const backgroundDiv = document.getElementById('random-background');
    const existingFlowers = [];

    for (let i = 0; i < 20; i++) {
        const randomFlower = document.createElement('img');
        // Add the image to the div
        randomFlower.src = '../game/background/' + flowerList[Math.floor(Math.random() * flowerList.length)];
        randomFlower.style.position = 'absolute';

        let left, top, width;
        let attempts = 0;
        // Generate new position and size until it doesn't overlap or max attempts reached
        while (attempts < 20) {
            left = Math.random() * 100;
            top = Math.random() * 100;
            width = Math.random() * 12 + 2;

            if (!checkCollision(left, top, width, existingFlowers)) {
                break; // No collision, exit loop
            }
            attempts++;
        }

        if (attempts === 20) {
            randomFlower.remove();
            continue; // Skip this flower if max attempts reached
        }

        randomFlower.style.left = left + '%';
        randomFlower.style.top = top + '%';
        randomFlower.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
        randomFlower.style.width = width + 'vw';
        randomFlower.style.userSelect = 'none';
        randomFlower.style.pointerEvents = 'none';

        backgroundDiv.appendChild(randomFlower);
        existingFlowers.push({ left, top, width });
    }
}

// Function to check collision with existing flowers
function checkCollision(newLeft, newTop, newWidth, existingFlowers) {
    for (const flower of existingFlowers) {
        const left1 = newLeft;
        const right1 = newLeft + 2*newWidth;
        const top1 = newTop;
        const bottom1 = newTop + 2*newWidth;

        const left2 = flower.left;
        const right2 = flower.left + 2*flower.width;
        const top2 = flower.top;
        const bottom2 = flower.top + 2*flower.width;

        if (!(left1 >= right2 || right1 <= left2 || top1 >= bottom2 || bottom1 <= top2)) {
            return true; // Collision detected
        }
    }
    return false; // No collision detected
}
const languageSelect = document.getElementById('language-select');
const imageContainer = document.getElementById('image-container');
const guessButton = document.getElementById('guess-button');
const tryAgainButton = document.getElementById('try-again-button');
const continueButton = document.getElementById('continue-button');
const jokerButton = document.getElementById('joker-button');
const feedbackText = document.getElementById('feedback-text');
const livesLeftText = document.getElementById('lives-left');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const seasonSelectParent = document.getElementById('season-select').parentElement;
const homeIcon = document.getElementById('home-icon');
const seasonSelect = $('#season-select');
const episodeSelect = $('#episode-select');
let imagesJsonData = {};
let titlesJsonData = {};
let seasonsJsonData = {};
let keyedEpisodeNames = {};
let allowedSeasonKeyList = [];
let allowedEpisodeKeyList = [];
let episodeCount = 0;
let previouslyShownEpisodes = [];
let imagesShownDuringJoker = [];
const startingJokers = 5;
let jokerUsesLeft = startingJokers;
const scoreToGetNewJoker = 30;
const jokersToGet = 3;
let fetchDone = false;
let score = 0;
const startingLives = 3;
let livesLeft = startingLives;
let currentEpisodeKey = "";
let currentImageKey = "";
let state = "game";
let isEnterPressed = false;
let inputEntered = false;

placeRandomFlowers();

$(document).ready(function () {
    seasonSelect.select2({
        multiple: true
    });
    episodeSelect.select2({
        placeholder: 'Guess the episode...'
    });
});

function updateJokerButton(usesLeft) {
    jokerButton.innerHTML = `
            <span style="vertical-align: middle;"><b>Joker</b></span>
            <span style="font-size: 0.7em; vertical-align: middle;"> (${usesLeft} left)</span>
        `;
}

tippy(jokerButton, {
    content: 'Show another image from the same episode',
    animation: 'shift-away-subtle',
});

const seasonSelectTippy = tippy(seasonSelectParent, {
    content: 'You can select seasons again after getting a game over',
    animation: 'shift-away-subtle',
});
seasonSelectTippy.disable();

tippy(homeIcon, {
    content: 'Back to the homepage',
    animation: 'shift-away-subtle',
});

livesLeftText.innerText = "Lives: " + livesLeft;
updateJokerButton(jokerUsesLeft);
checkHighScore();

// First fetch the season keys from the season-keys JSON file
fetch('season-keys.json')
    .then(response => response.json())
    .then(data => {
        seasonsJsonData = data;
        allowedSeasonKeyList = Object.keys(seasonsJsonData);
        seasonSelect
            .empty() // Clear existing options
            .append(allowedSeasonKeyList.map(seasonKey => new Option(seasonKey, seasonKey))) // Append new options
            .val(allowedSeasonKeyList)
            .trigger('change')
            .select2({
                closeOnSelect: false
            });

        // After that fetch the image list from the image-list JSON file
        return fetch('image-list.json');
    })
    .then(response => response.json())
    .then(data => {
        imagesJsonData = data;

        // After that fetch the language keys from the episode-titles JSON file and populate the language select
        return fetch('episode-titles.json');
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
        showRandomImage();
        fetchDone = true;
    });

function loadEpisodeNames() {
    let selectedEpisode = episodeSelect.val();
    episodeSelect.empty();

    allowedEpisodeKeyList = [];
    for (let seasonKey of allowedSeasonKeyList) {
        let episodeKeys = seasonsJsonData[seasonKey];
        allowedEpisodeKeyList = allowedEpisodeKeyList.concat(episodeKeys);
        keyedEpisodeNames = titlesJsonData[languageSelect.value];

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
        for (const episodeKey of episodeKeys) {
            let option = document.createElement('option');
            option.value = episodeKey; // Set the value of the option
            option.textContent = keyedEpisodeNames[episodeKey]; // Set the text displayed in the option
            episodeSelect.append(option);
        }
    }
    episodeCount = allowedEpisodeKeyList.length;


    if (selectedEpisode) {
        episodeSelect.val(selectedEpisode).trigger('change');
    } else {
        episodeSelect.val(null).trigger('change');
    }
}

// When the language select changes, load the episode names for the selected language
languageSelect.addEventListener('change', (event) => {
    if (!fetchDone) return;
    saveConfig();
    loadEpisodeNames(event.target.value);
});

episodeSelect.on('select2:select', function () {
    // This is a workaround to prevent the keydown event from firing when enter is pressed to select an option
    inputEntered = false;
    setTimeout(() => {
        inputEntered = true;
    } , 10);
});

seasonSelect.on('change', function () {
    allowedSeasonKeyList = $(this).val();
    if (!fetchDone) return;

    if (allowedSeasonKeyList.length === 0) {
        episodeSelect.parent().hide();
        episodeSelect.select2('close');
        guessButton.style.display = 'none';
        jokerButton.style.display = 'none';
        feedbackText.innerHTML = "Please select at least one season.";
        feedbackText.style.display = 'block';
        return;
    } else {
        saveConfig();
        episodeSelect.parent().show();
        guessButton.style.display = 'block';
        jokerButton.style.display = 'block';
        feedbackText.style.display = 'none';
        jokerUsesLeft = startingJokers;
        updateJokerButton(jokerUsesLeft);
    }

    previouslyShownEpisodes = [];
    loadEpisodeNames(languageSelect.value);
    showRandomImage();
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault()
    }

    if (event.key === 'Enter' && !isEnterPressed) {
        isEnterPressed = true;

        if (state === "continue") {
            continueGame();
        } else if (state === "game-over") {
            resetGame();
        } else if (state === "game") {
            if (episodeSelect.val() === null) {
                episodeSelect.select2('open');
            } else if (inputEntered) {
                checkGuess();
            }
        }

        // Reset the flag after a short delay to allow for multiple presses
        setTimeout(() => {
            isEnterPressed = false;
        }, 200); // Adjust the delay as needed
    }
});

// Store the last 20% the episodes to prevent repeats and make it feel more random
function addToLastEpisodeList(value) {
    // Only add 50% of the episodes to the list, so you don't know which episodes won't be repeated
    if (Math.random() > 0.5) return;

    // If the list is longer than 20% of the episode count, remove the first element
    if (previouslyShownEpisodes.length > episodeCount * 0.2) {
        previouslyShownEpisodes.shift();
    }
    previouslyShownEpisodes.push(value);
}

function getRandomEpisodeKey() {
    let randomEpisodeKey = allowedEpisodeKeyList[Math.floor(Math.random() * allowedEpisodeKeyList.length)];
    if (previouslyShownEpisodes.includes(randomEpisodeKey)) {
        return getRandomEpisodeKey();
    }

    addToLastEpisodeList(randomEpisodeKey);
    return randomEpisodeKey;
}

function getRandomImageKey(imageList) {
    return imageList[Math.floor(Math.random() * imageList.length)];
}

function showNewImage(encodedImage) {
    var imageElement = new Image();
    imageElement.src = encodedImage;
    imageElement.style.maxWidth = '100%';
    imageElement.style.maxHeight = '100%';

    // Append the image to the container
    imageContainer.innerHTML = ''; // Clear previous content
    imageContainer.appendChild(imageElement);

    // Once the image is loaded, calculate aspect ratio and adjust container size
    imageElement.onload = function() {
        var aspectRatio = imageElement.width / imageElement.height;
        imageContainer.style.paddingTop = (100 / aspectRatio) + "%";

        // Adjust the position of the image
        imageElement.style.position = 'absolute';
        imageElement.style.left = '0';
        imageElement.style.top = '0';
    };

    // Reset episode selection and hide feedback text if needed
    episodeSelect.val(null).trigger('change');
    feedbackText.style.display = 'none';
}

function showRandomImage() {
    currentEpisodeKey = getRandomEpisodeKey();

    const imageList = imagesJsonData[currentEpisodeKey];
    currentImageKey = getRandomImageKey(imageList);
    const encodedImage = encodeURI('randomframes/' + currentImageKey);

    showNewImage(encodedImage);
    episodeSelect.select2('close');
    episodeSelect.select2('focus');
}

function handleJokerClick() {
    if (jokerUsesLeft > 0) {
        jokerUsesLeft--;
        updateJokerButton(jokerUsesLeft);
        imagesShownDuringJoker.push(currentImageKey);

        const imageList = imagesJsonData[currentEpisodeKey];
        if (imagesShownDuringJoker.length === imageList.length) imagesShownDuringJoker = [];

        // Prevent the same images to be shown twice during the same joker round
        while (imagesShownDuringJoker.includes(currentImageKey)) {
            currentImageKey = getRandomImageKey(imageList);
        }

        const encodedImage = encodeURI('randomframes/' + currentImageKey);
        showNewImage(encodedImage);
    } else {
        alert("You have no jokers left. You will get " + jokersToGet + " new jokers every " +
            scoreToGetNewJoker + " points.");
    }
}

function checkGuess() {
    inputEntered = false;
    if (state !== "game") return;

    let guess = episodeSelect.val();
    if (allowedEpisodeKeyList.includes(guess)) {
        seasonSelect.prop('disabled', true);
        seasonSelectTippy.enable();

        if (guess === currentEpisodeKey) {
            score++;
            showRandomImage();

            imagesShownDuringJoker = [];
            // If the score is a multiple of the scoreToGetNewJoker, give the player a new joker
            if (score % scoreToGetNewJoker === 0) {
                jokerUsesLeft += jokersToGet;
                updateJokerButton(jokerUsesLeft);
            }
        } else {
            episodeSelect.parent().hide();
            episodeSelect.select2('close');
            guessButton.style.display = 'none';
            jokerButton.style.display = 'none';
            livesLeft--;
            livesLeftText.innerText = "Lives: " + livesLeft;
            let currentEpisodeName = keyedEpisodeNames[currentEpisodeKey];
            let guessedEpisodeName = keyedEpisodeNames[guess];

            let responseString = "You guessed " + guessedEpisodeName + ", but the correct answer is " + currentEpisodeName + ".";
            if (livesLeft > 0) {
                if (livesLeft === 1) {
                    feedbackText.innerHTML = responseString + "<br><b>You have " + livesLeft + " life left</b>.";
                } else {
                    feedbackText.innerHTML = responseString + "<br><b>You have " + livesLeft + " lives left</b>.";
                }
                feedbackText.style.display = 'block';
                continueButton.style.display = 'block';
                state = "continue";
            } else {
                tryAgainButton.style.display = 'block';
                feedbackText.innerHTML = responseString + "<br><b>Game over</b>.";
                feedbackText.style.display = 'block';
                state = "game-over";
            }
        }
        scoreElement.innerText = "Score: " + score;
    } else {
        alert("Please select an episode from the list.");
    }

    checkHighScore();
}

function setHighScore(newScore, isHigher) {
    highScoreElement.innerText = 'High Score: ' + newScore;
    window.localStorage.setItem('high-score', newScore);

    if (isHigher) {
        highScoreElement.style.color = 'red';
    }
}

function checkHighScore() {
    const currentHighScore = Number(window.localStorage.getItem('high-score'));
    setHighScore(currentHighScore);

    if (!currentHighScore) {
        setHighScore(score)
    }
    if (score > currentHighScore) {
        setHighScore(score, true);
    }
}

function saveConfig() {
    // Save the selected seasons and language to local storage
    const selectedSeasons = seasonSelect.val();
    const selectedLanguage = languageSelect.value;
    window.localStorage.setItem('selected-seasons', JSON.stringify(selectedSeasons));
    window.localStorage.setItem('selected-language', selectedLanguage);
}

function loadConfig() {
    // Load the selected seasons and language from local storage
    const selectedSeasons = JSON.parse(window.localStorage.getItem('selected-seasons'));
    const selectedLanguage = window.localStorage.getItem('selected-language');

    if (selectedSeasons) {
        seasonSelect.val(selectedSeasons).trigger('change');
    }

    if (selectedLanguage) {
        languageSelect.value = selectedLanguage;
    }
}

function showGameButtons() {
    state = "game";
    episodeSelect.parent().show();
    guessButton.style.display = 'block';
    jokerButton.style.display = 'block';
    tryAgainButton.style.display = 'none';
    continueButton.style.display = 'none';
}

function resetGame() {
    if (state !== "game-over") return;
    score = 0;
    livesLeft = startingLives;
    livesLeftText.innerText = "Lives: " + livesLeft;

    showGameButtons()
    seasonSelect.prop('disabled', false);
    seasonSelectTippy.disable();

    scoreElement.innerText = "Score: " + score;
    highScoreElement.style.color = "#000";
    jokerUsesLeft = startingJokers;
    updateJokerButton(jokerUsesLeft);

    showRandomImage();
}

function continueGame() {
    if (state !== "continue") return;
    showGameButtons()
    showRandomImage();
}

function placeRandomFlowers() {
    const flowerList = ['flower1.png', 'flower2.png', 'flower3.png', 'flower4.png', 'flower5.png', 'flower6.png'];
    const backgroundDiv = document.getElementById('random-background');
    const existingFlowers = [];
2
    for (let i = 0; i < 20; i++) {
        const randomFlower = document.createElement('img');
        // Add the image to the div
        randomFlower.src = 'background/' + flowerList[Math.floor(Math.random() * flowerList.length)];
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
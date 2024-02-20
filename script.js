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

$(document).ready(function () {
    seasonSelect.select2({
        multiple: true
    });
    episodeSelect.select2({
        placeholder: 'Guess the episode...',
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

        fetchDone = true;
        loadEpisodeNames();
        showRandomImage();
    });

function loadEpisodeNames() {
    selectedEpisode = episodeSelect.val();
    episodeSelect.empty();

    allowedEpisodeKeyList = [];
    for (let seasonKey of allowedSeasonKeyList) {
        allowedEpisodeKeyList = allowedEpisodeKeyList.concat(seasonsJsonData[seasonKey]);
    }
    episodeCount = allowedEpisodeKeyList.length;

    // Fill the episode select with the episode names for the selected language
    keyedEpisodeNames = titlesJsonData[languageSelect.value];
    for (const episodeKey of allowedEpisodeKeyList) {
        let option = document.createElement('option');
        option.value = episodeKey; // Set the value of the option
        option.textContent = keyedEpisodeNames[episodeKey]; // Set the text displayed in the option
        episodeSelect.append(option);
    }

    if (selectedEpisode) {
        episodeSelect.val(selectedEpisode).trigger('change');
    }
}

// When the language select changes, load the episode names for the selected language
languageSelect.addEventListener('change', (event) => {
    loadEpisodeNames(event.target.value);
});

episodeSelect.on('select2:select', function (event) {
    // Wait 100ms to set the inputEntered flag, so that it doesn't directly check the guess
    setTimeout(() => {
        inputEntered = true;
    } , 100);
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
        episodeSelect.parent().show();
        guessButton.style.display = 'block';
        jokerButton.style.display = 'block';
        feedbackText.style.display = 'none';
    }

    previouslyShownEpisodes = [];
    loadEpisodeNames(languageSelect.value);
    showRandomImage();
});

document.addEventListener('keydown', function(event) {
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
    imageContainer.style.backgroundImage = 'url("' + encodedImage + '")';
    episodeSelect.val(null).trigger('change');
    feedbackText.style.display = 'none';
}

function showRandomImage() {
    currentEpisodeKey = getRandomEpisodeKey();

    const imageList = imagesJsonData[currentEpisodeKey];
    currentImageKey = getRandomImageKey(imageList);
    const encodedImage = encodeURI('randomframes/' + currentImageKey);

    showNewImage(encodedImage);
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

    guess = episodeSelect.val();
    if (allowedEpisodeKeyList.includes(guess)) {
        seasonSelect.prop('disabled', true);

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
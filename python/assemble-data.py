import os
import json
import shutil
import cv2
import numpy as np


def assemble_image_data(screenshot_folder, titles_folder, episode_titles_path,
                        image_folder, image_list_path, season_key_path):
    """
    Assembles the image data for the website by copying the screenshots to a folder
    and saving the image origins to a JSON file.
    Also saves the episode titles to a JSON file for multiple languages.

    Args:
        screenshot_folder: Folder containing the screenshots, sorted into sub-folders by episode code
        (S01E01P1, S01E01P2, etc.)
        titles_folder: Folder containing the episode title txt files with the language code as the filename
        episode_titles_path: JSON file containing the episode titles with the language code as the key
        image_folder: Folder to save the images to
        image_list_path: JSON file to save the image origins to
        season_key_path: JSON file to save the season keyed episodes to
    """

    # Replace wrong apostrophes in the title files
    for filename in os.listdir(titles_folder):
        if filename.endswith(".txt"):
            with open(os.path.join(titles_folder, filename), 'r', encoding='utf-8') as f:
                lines = f.readlines()
            with open(os.path.join(titles_folder, filename), 'w', encoding='utf-8') as f:
                for line in lines:
                    f.write(line.replace("’", "'"))

    english_file_name = "English.txt"
    if not os.path.isfile(os.path.join(titles_folder, english_file_name)):
        print(f"English titles file not found: '{english_file_name}'.")
        print("Change the file name to match the English language code and run the script again.")
        return

    # First create a list of all the episode codes by checking the sub-folders in the screenshot folder
    episode_codes = [subfolder for subfolder in os.listdir(screenshot_folder) if
                     os.path.isdir(os.path.join(screenshot_folder, subfolder))]
    print(f"Found {len(episode_codes)} episode codes in '{screenshot_folder}'.")

    # Create the Json file for the episode titles
    titles = {}
    # Load the English titles, because they are needed for the combined language titles
    with open(os.path.join(titles_folder, english_file_name), 'r', encoding='utf-8') as f:
        titles["English"] = {}
        for line in f.readlines():
            episode_code = line.split(":")[0].strip()
            titles["English"][episode_code] = line.strip()

    # Load all the other language titles
    for filename in os.listdir(titles_folder):
        if filename == english_file_name:
            continue
        language_code = filename.split(".")[0]
        with open(os.path.join(titles_folder, filename), 'r', encoding='utf-8') as f:
            titles[language_code] = {}

            combined_language_code = f"{language_code}-English"
            titles[combined_language_code] = {}
            for line in f.readlines():
                episode_code = line.split(":")[0].strip()
                titles[language_code][episode_code] = line.strip()

                if episode_code not in titles["English"]:
                    continue
                english_title = titles["English"][episode_code].split(": ")[1].strip()
                combined_title = f"{line.strip()} ({english_title})"
                titles[combined_language_code][episode_code] = combined_title

    # Save the episode titles to a JSON file
    with open(episode_titles_path, 'w') as f:
        json.dump(titles, f, indent=4)

    # Check for missing titles
    missing_titles = {language_code: [] for language_code in titles.keys()}
    for episode_code in episode_codes:
        for language_key, episode_list in titles.items():
            # Skip the combined language titles, since they are only a duplicate of the other languages
            if language_key.endswith("-English"):
                continue
            if episode_code not in episode_list:
                missing_titles[language_key].append(episode_code)

    bool_missing = False
    for language_code, missing in missing_titles.items():
        if len(missing) > 0:
            bool_missing = True
            print(f"Missing titles for {language_code}: {missing}")

    if bool_missing:
        print("Add missing titles to the language files and run the script again.")
        return

    print(f"Episode titles saved to '{episode_titles_path}'.")

    # Create the season key JSON file
    season_keyed_episodes = {}
    for episode_code in episode_codes:
        season_key = episode_code[:3]
        if season_key not in season_keyed_episodes:
            season_keyed_episodes[season_key] = []
        season_keyed_episodes[season_key].append(episode_code)

    with open(season_key_path, 'w') as f:
        json.dump(season_keyed_episodes, f, indent=4)

    print(f"Season keyed episodes saved to '{season_key_path}'.")

    # Create the image list JSON file and copy the images to the destination folder
    image_list = {}

    # Clear the image folder and create a new one
    if os.path.exists(image_folder):
        shutil.rmtree(image_folder)
    os.makedirs(image_folder)
    for episode_code in episode_codes:
        image_list[episode_code] = []
        print(f"Processing images for '{episode_code}'...")
        for filename in os.listdir(os.path.join(screenshot_folder, episode_code)):
            # Convert webp to jpg
            if filename.lower().endswith('.webp'):
                webp_path = os.path.join(screenshot_folder, episode_code, filename)
                jpg_path = os.path.join(screenshot_folder, episode_code, filename.replace('.webp', '.jpg'))
                os.system(f"magick convert {webp_path} {jpg_path}")
                os.remove(webp_path)
                filename = filename.replace('.webp', '.jpg')

            if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                image_list[episode_code].append(filename)

                # Load the image, remove black borders and save it to the destination folder
                image_source_path = os.path.join(screenshot_folder, episode_code, filename)
                image = cv2.imread(image_source_path)
                new_image = remove_black_borders(image)
                destination_path = os.path.join(image_folder, filename)
                cv2.imwrite(destination_path, new_image)

    # Save the image list to a JSON file
    with open(image_list_path, 'w') as f:
        json.dump(image_list, f, indent=4)

    print(f"Image paths saved to '{image_list_path}'.")
    print(f"Screenshots saved to '{image_folder}'.")


def remove_black_borders(image, threshold=1):
    """
    Removes black borders from an image using thresholding.

    Args:
        image: The input image as a numpy array.
        threshold: The minimum number of consecutive black pixels to consider a border.

    Returns:
        The image with black borders removed.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    vertical = np.mean(mask, axis=0)

    left = np.argmax(vertical >= threshold)
    right = len(vertical) - np.argmax(vertical[::-1] >= threshold)
    return image[:, left:right]


python_folder = os.getcwd()
python_screenshot_folder = os.path.join(python_folder, "screenshots")
python_titles_folder = os.path.join(python_folder, "titles")

website_folder = os.path.dirname(os.getcwd())
website_image_folder = os.path.join(website_folder, "randomframes")
website_image_list = os.path.join(website_folder, "image-list.json")
website_episode_titles = os.path.join(website_folder, "episode-titles.json")
website_season_keys = os.path.join(website_folder, "season-keys.json")

assemble_image_data(python_screenshot_folder, python_titles_folder, website_episode_titles,
                    website_image_folder, website_image_list, website_season_keys)

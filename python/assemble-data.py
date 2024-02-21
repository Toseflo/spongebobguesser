import os
import json
import cv2
import numpy as np
from PIL import Image


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

    english_key = "English"
    english_file_name = f"{english_key}.txt"
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
        titles[english_key] = {}
        for line in f.readlines():
            episode_code = line.split(":")[0].strip()
            titles[english_key][episode_code] = line.strip()

    # Load all the other language titles
    for filename in os.listdir(titles_folder):
        if filename == english_file_name:
            continue
        language_code = filename.split(".")[0]
        with open(os.path.join(titles_folder, filename), 'r', encoding='utf-8') as f:
            titles[language_code] = {}

            combined_language_code = f"{language_code}-{english_key}"
            titles[combined_language_code] = {}
            for line in f.readlines():
                episode_code = line.split(":")[0].strip()
                titles[language_code][episode_code] = line.strip()

                if episode_code not in titles[english_key]:
                    continue
                english_title = titles[english_key][episode_code].split(": ")[1].strip()
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
            if language_key.endswith(f"-{english_key}"):
                continue
            if episode_code not in episode_list:
                missing_titles[language_key].append(episode_code)

    # Check if a screenshot folder is missing
    missing_folders = []
    for episode_code in titles[english_key]:
        if episode_code not in episode_codes:
            missing_folders.append(episode_code)

    if len(missing_folders) > 0:
        print(f"Missing screenshot folders: {missing_folders}")
        print("Add the missing folders to the screenshot folder and run the script again.")
        return

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

    # Create a list of all the images which are in the screenshot folders
    screenshot_list = []
    for subfolder in os.listdir(screenshot_folder):
        # check if the subfolder is a directory
        if os.path.isdir(os.path.join(screenshot_folder, subfolder)):
            for filename in os.listdir(os.path.join(screenshot_folder, subfolder)):
                # Convert webp to jpg
                if filename.lower().endswith('.webp'):
                    webp_path = os.path.join(screenshot_folder, subfolder, filename)
                    jpg_path = webp_path.replace('.webp', '.jpg')
                    os.system(f"magick convert {webp_path} {jpg_path}")
                    os.remove(webp_path)
                    filename = filename.replace('.webp', '.jpg')
                if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                    screenshot_list.append(filename)

    already_converted_images = []
    removed_images = []
    if os.path.exists(image_folder):
        for filename in os.listdir(image_folder):
            if filename not in screenshot_list:
                removed_images.append(filename)
                os.remove(os.path.join(image_folder, filename))
            else:
                already_converted_images.append(filename)
    else:
        os.makedirs(image_folder)

    print(f"Removed {len(removed_images)} images from '{image_folder}': {removed_images}")

    # Create the image list JSON file and copy the images to the destination folder
    image_list = {}
    reverse_image_lookup = {} # Used later in code to find the original folder of an image
    for episode_code in episode_codes:
        image_list[episode_code] = []
        printed_conversion = False
        for filename in os.listdir(os.path.join(screenshot_folder, episode_code)):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                image_list[episode_code].append(filename)
                reverse_image_lookup[filename] = episode_code
                # Skip images that have already been converted
                if filename in already_converted_images:
                    continue

                if not printed_conversion:
                    print(f"Converting images for '{episode_code}'...")
                    printed_conversion = True

                # Load the image, remove black borders and save it to the destination folder
                image_source_path = os.path.join(screenshot_folder, episode_code, filename)
                image = cv2.imread(image_source_path)
                new_image = crop_vertical_black_bars(image)
                destination_path = os.path.join(image_folder, filename)
                cv2.imwrite(destination_path, new_image)

    # Save the image list to a JSON file
    with open(image_list_path, 'w') as f:
        json.dump(image_list, f, indent=4)

    print(f"Image paths saved to '{image_list_path}'.")
    print(f"Screenshots saved to '{image_folder}'.")

    # Use PIL to get the average dimensions of the images, since it's faster than OpenCV
    width_sum = 0
    height_sum = 0
    for filename in os.listdir(image_folder):
        image = Image.open(os.path.join(image_folder, filename))
        width_sum += image.width
        height_sum += image.height

    # Get the average dimensions of the images
    image_count = len(os.listdir(image_folder))
    average_width = int(width_sum / image_count)
    average_height = int(height_sum / image_count)

    wrong_dimensions = []
    for filename in os.listdir(image_folder):
        image = Image.open(os.path.join(image_folder, filename))
        if abs(image.width - average_width) > 15 or abs(image.height - average_height) > 15:
            wrong_dimensions.append(filename)

    if len(wrong_dimensions) > 0:
        # Create a string list to print in the console
        better_output_strings = []
        for filename in wrong_dimensions:
            output_string = f"{reverse_image_lookup[filename]}/{filename}"
            output_string = output_string.replace(".jpg", "")
            better_output_strings.append(output_string)

        # Resize the images to the average dimensions
        print(f"Resizing {len(better_output_strings)} images to the average dimensions ({average_width}x{average_height}):")
        print(f"  {better_output_strings}")
        for filename in wrong_dimensions:
            original_folder = reverse_image_lookup[filename]
            original_image_path = os.path.join(screenshot_folder, original_folder, filename)
            original_image = cv2.imread(original_image_path)
            cropped_image = crop_image(original_image, average_width, average_height)
            cv2.imwrite(os.path.join(image_folder, filename), cropped_image)


def crop_image(image, target_width, target_height):
    """
    Crops an image to the target dimensions.

    Args:
      image: Image to crop.
      target_width: Target width.
      target_height: Target height.

    Returns:
      Cropped image.
    """

    # Get the dimensions of the image
    height, width, _ = image.shape

    # Calculate the dimensions of the crop
    crop_width = min(width, target_width)
    crop_height = min(height, target_height)

    # Get the center of the image
    center_x = width // 2
    center_y = height // 2

    # Calculate the crop box
    crop_x1 = max(0, center_x - crop_width // 2)
    crop_y1 = max(0, center_y - crop_height // 2)
    crop_x2 = min(width, center_x + crop_width // 2)
    crop_y2 = min(height, center_y + crop_height // 2)

    # Crop the image
    cropped_image = image[crop_y1:crop_y2, crop_x1:crop_x2]

    return cropped_image


def crop_vertical_black_bars(image, tolerance=10):
    """
    Crops black bars on the left and right sides of an image, returning the original
    image if no bars are detected.

    Args:
      image: Image to crop.
      tolerance: Threshold value for considering a pixel black (default: 5).

    Returns:
      Cropped image or the original image if no black bars were detected.
    """

    # Convert to grayscale for simplicity
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Check left side
    left_edge = 0
    while left_edge < gray.shape[1] and np.all(
            gray[:, left_edge] <= tolerance
    ):
        left_edge += 1

    # Check right side
    right_edge = gray.shape[1] - 1
    while right_edge >= 0 and np.all(
            gray[:, right_edge] <= tolerance
    ):
        right_edge -= 1

    # Crop if both sides have black bars
    if left_edge > 0 or right_edge < gray.shape[1] - 1:
        return image[:, left_edge+1:right_edge, :]
    else:
        return image


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

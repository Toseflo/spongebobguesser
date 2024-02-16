import os
import json
import shutil


def collect_image_origins(source_folder, json_file_path, destination_folder, episode_titles_file):
    """Collects paths and origins of images from multiple folders, reads episode titles from a file, and stores them
    in a JSON file, copying images to the destination.

    Args:
        source_folder: The path to the folder containing subfolders of images.
        json_file_path: The path to the JSON file where image origins and episode titles will be stored.
        destination_folder: The path to the folder where the screenshots will be saved.
        episode_titles_file: The path to the file containing episode titles in the format "S01E01P1 Title".
    """

    origin_data = {}  # Dictionary to store image origins

    with open(episode_titles_file, 'r') as f:
        episode_titles = {line.strip().split()[0]: line.strip() for line in f}  # Read episode titles into a dictionary

    for subfolder in os.listdir(source_folder):
        title = episode_titles.get(subfolder)
        if title is None:
            print(f"Episode title not found for '{subfolder}'.")
            return

        if os.path.isdir(os.path.join(source_folder, subfolder)):  # Check if it's a subfolder
            origin_data[title] = []  # Create a list for images from this subfolder

            for filename in os.listdir(os.path.join(source_folder, subfolder)):
                if filename.lower().endswith(('.jpg', '.jpeg', '.png')):  # Check if it's an image
                    source_path = os.path.join(source_folder, subfolder, filename)
                    origin_data[title].append(filename)  # Add image filename to origin data

                    # Copy the image to the destination folder
                    destination_path = os.path.join(destination_folder, filename)
                    os.makedirs(destination_folder, exist_ok=True)  # Create the destination folder if it doesn't exist
                    shutil.copyfile(source_path, destination_path)  # Copy the image to the destination folder

    # Save the origin data as JSON
    with open(json_file_path, 'w') as f:
        json.dump(origin_data, f, indent=4)

    print(f"Image origins saved to '{json_file_path}'.")
    print(f"Screenshots saved to '{destination_folder}'.")
    print("Image origins and screenshots collected successfully.")


root_folder = r""
source_folder = os.path.join(root_folder, "screenshots")
json_file_path = os.path.join(root_folder, "episodes.json")
destination_folder = os.path.join(root_folder, "randomframes")
episode_titles_file = os.path.join(root_folder, "titles.txt")

collect_image_origins(source_folder, json_file_path, destination_folder, episode_titles_file)

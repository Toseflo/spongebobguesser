I made a little game where you get a random screenshot of SpongeBob SquarePants and you have to guess which episode it is from.

Play the game at https://toseflo.github.io/spongebobguesser/

Thanks to V3ctoor for making the code of his Avatar Guesser game public.

## How to add new screenshots:

1. I used the website https://fancaps.net/search.php?q=spongebob&MoviesCB=Movies&TVCB=TV to get the screenshots for the game
2. Save the screenshots in the python/screenshots folder with subfolders named S*xx*E*yy*P*z* for the season, episode and part in the episode
3. Add the title of the episode to every language file in python/titles
4. Run the python script with the correct paths. It should update randomframes, episode-titles.json and image-list.json
5. The website should now show the new images

## How to add new languages:
1. Add a new language file to python/titles. The name of the file will be the name in the dropdown list
2. Add the name of all episodes with the format S*xx*E*yy*P*z*: *episode title*
3. Run the python script. The script will complain if an episode title is missing. It also creates the combined language with English in brackets
4. The website should now have the new languages

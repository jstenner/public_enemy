
The Public Enemy, 2016-20

Grant yourself the ability to throw the proverbial chair at the system! It feels good, momentarily, but in reality our systems are designed to be relief valves that maintain the status quo.

The Public Enemy was an online 3D environment (2016-2020) where the participant could throw a chair at either or both of the US political parties. Depending on which party was hit, a flood of contextually appropriate Twitter hashtags that were continuously mined from the network would rain from above. If a hashtag struck one of the party icons, the application would use natural language processing techniques to recombinantly generate and re-post a new tweet using the offending tweet. Tweets were a mashup of text from Avatar Emergency (Gregory Ulmer), The World of Wrestling (Roland Barthes), Walden: Economy (Henry David Thoreau), and a transcript from Extreme Championship Wrestling: One Night Stand 2006.

https://twitter.com/dapublic_nme

https://youtu.be/0jQhCzl22Cs


GENERAL:

To test locally, open loadconfig.js and change line 9 to point to the local config file:
'/config.local.json'

For deployment, of course:
'/config.json'

Make sure that in the IDEA run configuration it is set to load the /static/index.html file on launch.

The Node.js server must be running of course for everything to work.
Navigate to ~/Documents/maya/projects/chairthrow/webgl/public_enemy
and use PM to start the server:
pm2 start process.json
Check that it's running with:
pm2 show pe-server
List running processes with:
pm2 list
Quit the all apps with:
pm2 stop all

See Apple Notes: PM2 and IntelliJIDEA for more notes on dev.

DEALING WITH WebGL memory:
Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value 67108864, (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0


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
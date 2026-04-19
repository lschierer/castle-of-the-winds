In 1989 and 1992, SaadaSoft released the two part Castle of the Winds game.  In 1998 it changed to being distributed as freeware, and at some point there was an announcement in a forum by the author, Rick Saada, that it is now public domain.  It's also a 16bit Windows game that doesn't work anymore, and is difficult to get working in Wine.  Its slightly available via the Internet Archive's emulators, but that's a pain for regular play. 

The game is a [Rogue like](https://en.wikipedia.org/wiki/Roguelike) turn-based game loosely based on Norse mythology.  It features an orphan raised by godparents in an obscure village.  As the game starts, his farm is destroyed.  There is an opening narrative introducing the plot.  There's a near-by (south and east) village with a small handful of buildings, which allow purchasing a variety of things.  The items are persistent for a short time, but will change if you leave the village, go "far enough" away (I know there's a limit but not what the minimum is).  North (up) from the village is a mine.  The mine features a limited number of levels.  Each level grows in complexity and danger.  The goal is to find Hrungnir, a Hill Giant Lord, and defeat him to win back the Enchanted Amulet of Kings, stolen from your godparent's farm.   Winning and activating it ended part 1 of the game.  Part two picked up from there.  Game play in Part II is similar except the town is bigger, with more shops each of which specializes to a greater degree than the shops from the village.  Instead of a mine to the north, its a castle, but the bulk of the game is exploring the many levels below the castle (and returning to the town to sell stuff you find/win and buy stuff you need). As you progress down, again the levels increase in complexity and danger.  At different points you meet the Wolf-Man leader, Bear-Man leader, four Joton kings, a Demon Lord, and finally the main enemy Surtur.  After defeating him, if you can escape back to the top and sit on the throne you win. 

The goal is to redevelop this as a single unified game available via a web experience.  Someone previously tried this in [Elm](https://guide.elm-lang.org) but that hasn't been touched in almost a decade, never quite finished, though it is partially playable.  I have no interest in trying to develop in Elm, but it can be used as a reference to get started. 


* The project should use [mise](https://mise.jdx.dev/) to install the necessary tools like node and pnpm. and for orchestration  
* The project should assume node v24.14.1 or higher. 
* The project should use pnpm
* Development should be done in Typescript
	* set up the project to use ES6 modules
* [Greenwood](https://greenwoodjs.dev/) should be used as the stack framework
* [Lit](https://lit.dev/) Elements should be used
* The project should be fully type safe, passing checks with [ESlint](https://eslint.org/).  I have provided an eslint.config.mts that I have used before in the project root. 
* Documentation about decisions made should be in the docs directory, in Markdown format. 
* Documentation necessary to understand & run the project should be in the docs directory, in Markdown format. 
* The end result should deploy to an EC2 instance via CDK. CDK specific files should be in the infrastructure directory, but should be activated with a `mise run deploy-dev` and `mise run deploy-prod` target from the project root.
* Use the resources at https://castleofthewinds.com/ and in [the existing elm attempt](https://github.com/mordrax/cotwelm) to understand the game mechanics and to obtain information on 
  * items 
  * spells
  * bestiary (enemies)
  * characters and character stats
* The game should offer the ability to save a game to the user's local system.
* The game should offer the ability to load a game from a saved game file.
* Saved game files should be in YAML (prefered) or JSON (if there is something we need to store that would be difficult in YAML) so that we can use a saved game file as an aide to understanding bugs. 
* The game should be configured with variable log levels per package. 
  * use [loglevel](https://github.com/pimterry/loglevel) as a logging library
  * Combine the [log.getLogger](https://github.com/pimterry/loglevel#loggetloggerloggername) API with a server side configuration file that has a default log level and an optional override for that default per package.  Basically if the package name has an entry in the config file's loglevel section, the associated logging level overrides the default. 
  * logs should go to both console and a server side log file (frequently better for debugging complicated issues because I can pull the log file down to search it). 
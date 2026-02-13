import { logger } from "./lib/logger";
import { testDir, watchDirectory } from "./lib/directory-watcher";

function main() {
  watchDirectory({
    path: testDir,
    cb: (event, path) => {
      switch (event) {
        case "add": // new file added
          logger.info(`File added: ${path}`);
          break;
        case "change": // existing file changed
          logger.info(`File changed: ${path}`);
          break;
        case "unlink": // file removed
          logger.info(`File removed: ${path}`);
          break;
        default:
          logger.info(`Event: ${event}, Path: ${path}`);
      }
    },
  });
}

main();

import { logger } from "./lib/logger";
import { testDir, watchDirectory } from "./lib/directory-watcher";
import {
  handleDirectoryAddFileEvent,
  handleDirectoryRemoveFileEvent,
  handleDirectoryUpdateFileEvent,
} from "./lib/directory-event-handlers";

function main() {
  watchDirectory({
    path: testDir,
    cb: (event, path) => {
      switch (event) {
        case "add": // new file added
          handleDirectoryAddFileEvent({ event, path });
          break;
        case "change": // existing file changed
          handleDirectoryUpdateFileEvent({ event, path });
          break;
        case "unlink": // file removed
          handleDirectoryRemoveFileEvent({ event, path });
          break;
        default:
          logger.info(`Event: ${event}, Path: ${path}`);
      }
    },
  });
}

main();

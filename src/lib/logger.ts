import path from "node:path";
import fs from "node:fs";
import { createLogger, format, transports, Logger } from "winston";

const { combine, timestamp, printf, errors, splat, colorize } = format;

// Ensure logs directory exists (relative to project root)
const LOG_DIR = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// Nice readable line format
const line = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr =
    meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  // If an Error was logged, `stack` will exist (via format.errors)
  return stack
    ? `${timestamp} [${level}] ${stack}${metaStr}`
    : `${timestamp} [${level}] ${message}${metaStr}`;
});

export const logger: Logger = createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    splat(), // allows logger.info("x=%d", 5)
    errors({ stack: true }), // capture error stacks
  ),
  transports: [
    new transports.Console({
      format: combine(colorize(), line),
      stderrLevels: ["error", "warn"],
    }),
    // errors only
    new transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level: "error",
      format: combine(line),
      maxsize: 5_000_000,
      maxFiles: 5,
    }),
    // everything
    new transports.File({
      filename: path.join(LOG_DIR, "combined.log"),
      format: combine(line),
      maxsize: 5_000_000,
      maxFiles: 5,
    }),
  ],
  // keep the process alive on handled errors (good for scripts)
  exitOnError: false,
});

// Catch stuff you forget to handle:
logger.exceptions.handle(
  new transports.File({ filename: path.join(LOG_DIR, "exceptions.log") }),
);

process.on("unhandledRejection", (reason) => {
  // reason can be Error | string | unknown
  logger.error("Unhandled Rejection: %o", reason);
});

process.on("uncaughtException", (err) => {
  logger.error(err);
  // For scripts, you often WANT to exit non-zero.
  process.exitCode = 1;
});

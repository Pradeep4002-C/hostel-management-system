const serialize = (value) =>
  value instanceof Error ? value.stack || value.message : String(value);

const write = (stream, level, message, detail) => {
  const suffix = detail === undefined ? "" : ` ${serialize(detail)}`;
  stream.write(`[${level}] ${message}${suffix}\n`);
};

const logger = {
  info: (message, detail) => write(process.stdout, "INFO", message, detail),
  error: (message, detail) => write(process.stderr, "ERROR", message, detail),
};

export { logger };

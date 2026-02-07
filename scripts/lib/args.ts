/**
 * CLI argument parsing utilities
 * Supports both interactive and non-interactive modes for AI agents
 */

export interface ParsedArgs {
  [key: string]: string | boolean | undefined;
}

/**
 * Parse command line arguments
 * Supports: --flag, --key=value, --key value
 */
export function parseArgs(argv: string[] = process.argv.slice(2)): ParsedArgs {
  const args: ParsedArgs = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2);

      if (key.includes("=")) {
        const [k, v] = key.split("=");
        args[k] = v;
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
        args[key] = argv[i + 1];
        i++;
      } else {
        args[key] = true;
      }
    }
  }

  return args;
}

/**
 * Check if running in non-interactive mode (has required args)
 */
export function hasRequiredArgs(args: ParsedArgs, required: string[]): boolean {
  return required.every((key) => args[key] !== undefined && args[key] !== true);
}

/**
 * Get a string argument value
 */
export function getStringArg(args: ParsedArgs, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Get a boolean argument value
 */
export function getBooleanArg(args: ParsedArgs, key: string): boolean {
  return args[key] === true || args[key] === "true";
}

/**
 * Print usage information
 */
export function printUsage(
  scriptName: string,
  options: { flag: string; description: string; required?: boolean }[],
) {
  console.log(`\nUsage: npm run ${scriptName} [options]\n`);
  console.log("Options:");
  for (const opt of options) {
    const req = opt.required ? " (required)" : "";
    console.log(`  --${opt.flag.padEnd(20)} ${opt.description}${req}`);
  }
  console.log("");
}

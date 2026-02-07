import * as readline from "readline";

let rl: readline.Interface | null = null;

/**
 * Get or create readline interface
 */
function getReadline(): readline.Interface {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  return rl;
}

/**
 * Prompt for user input
 */
export function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    getReadline().question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt with a default value shown
 */
export function promptWithDefault(question: string, defaultValue: string): Promise<string> {
  return new Promise((resolve) => {
    getReadline().question(`${question} [${defaultValue}]: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

/**
 * Prompt for confirmation (y/n)
 */
export async function confirm(question: string, defaultValue = false): Promise<boolean> {
  const hint = defaultValue ? "[Y/n]" : "[y/N]";
  const answer = await prompt(`${question} ${hint}: `);

  if (!answer) return defaultValue;
  return answer.toLowerCase().startsWith("y");
}

/**
 * Close readline interface
 */
export function closePrompt() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

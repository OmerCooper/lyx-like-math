// Commands that wrap their arguments in boxes, and how many boxes each has.
export const ARG_COUNT: Record<string, number> = {
  frac: 2, dfrac: 2, tfrac: 2, cfrac: 2, binom: 2, dbinom: 2, tbinom: 2,
  sqrt: 1, hat: 1, bar: 1, vec: 1, dot: 1, ddot: 1, tilde: 1, widehat: 1, widetilde: 1,
  overline: 1, underline: 1, overrightarrow: 1, overleftarrow: 1,
  mathbb: 1, mathcal: 1, mathrm: 1, mathbf: 1, mathit: 1, mathsf: 1, boldsymbol: 1,
  operatorname: 1, text: 1,
};

// LaTeX to insert for a finished \command: one empty box (#?) per argument, like LyX.
export function commandTemplate(command: string): string {
  return command + "{#?}".repeat(ARG_COUNT[command.slice(1)] ?? 0);
}

// The \command being typed at the end of `beforeCaret`, or null.
export function typedCommand(beforeCaret: string): string | null {
  return /\\[a-zA-Z]+$/.exec(beforeCaret)?.[0] ?? null;
}

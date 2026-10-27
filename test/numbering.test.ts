import { renumberChanges, splitTag, withTag } from "../src/latex/numbering";

const apply = (doc: string, changes: { from: number; to: number; insert: string }[]) =>
  [...changes].reverse().reduce((d, c) => d.slice(0, c.from) + c.insert + d.slice(c.to), doc);

describe("splitTag", () => {
  test("numeric tag is split off", () => {
    expect(splitTag("E=mc^{2} \\tag{3}")).toEqual({ body: "E=mc^{2}", tag: 3 });
  });
  test("display block with newlines", () => {
    expect(splitTag("\n a \\tag{12}\n")).toEqual({ body: "a", tag: 12 });
  });
  test("non-numeric tag stays in the body", () => {
    expect(splitTag("x \\tag{A}")).toEqual({ body: "x \\tag{A}", tag: null });
  });
  test("no tag", () => {
    expect(splitTag(" x ")).toEqual({ body: "x", tag: null });
  });
});

test("withTag", () => {
  expect(withTag("a", true)).toBe("a \\tag{0}");
  expect(withTag("a", false)).toBe("a");
});

describe("renumberChanges", () => {
  test("numbers tagged display equations in order, skips untagged", () => {
    const doc = "$$\na \\tag{5}\n$$\ntext $$b$$\n$$\nc \\tag{1}\n$$";
    expect(apply(doc, renumberChanges(doc))).toBe("$$\na \\tag{1}\n$$\ntext $$b$$\n$$\nc \\tag{2}\n$$");
  });
  test("non-numeric tags are not counted", () => {
    const doc = "$$x\\tag{A}$$ $$y \\tag{9}$$";
    expect(apply(doc, renumberChanges(doc))).toBe("$$x\\tag{A}$$ $$y \\tag{1}$$");
  });
  test("already right: no changes", () => {
    expect(renumberChanges("$$a \\tag{1}$$\n$$b \\tag{2}$$")).toEqual([]);
  });
  test("inline math is ignored", () => {
    expect(renumberChanges("$x \\tag{2}$")).toEqual([]);
  });
});

test("inserting a numbered equation between (1) and (2) renumbers the later one", async () => {
  const { planCommit } = await import("../src/latex/commit");
  const doc = "$$\na \\tag{1}\n$$\n\n$$\nb \\tag{2}\n$$";
  const at = doc.indexOf("\n\n") + 1;
  const plan = planCommit({ doc, target: { from: at, to: at, display: true }, latex: withTag("c", true), dirty: true, exit: "after" });
  const inserted = doc.slice(0, plan.from) + plan.insert + doc.slice(plan.to);
  expect(apply(inserted, renumberChanges(inserted)))
    .toBe("$$\na \\tag{1}\n$$\n$$\nc \\tag{2}\n$$\n$$\nb \\tag{3}\n$$");
});

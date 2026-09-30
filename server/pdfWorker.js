import { PDFParse } from "pdf-parse";

process.once("message", async (data) => {
  let parser;
  let resultMessage;
  try {
    if (!(data instanceof Uint8Array) || !data.byteLength)
      throw new Error("Invalid PDF bytes received over IPC");
    // Copy đúng vùng byte của Buffer; không truyền underlying ArrayBuffer dư byte.
    parser = new PDFParse({
      data: new Uint8Array(data),
      verbosity: 0,
      stopAtErrors: true,
    });
    const info = await parser.getInfo();
    if (info.total > 100)
      throw Object.assign(new Error(), { code: "PDF_PAGES" });
    const result = await parser.getText();
    if (
      !Array.isArray(result.pages) ||
      result.pages.length !== info.total ||
      result.pages.some((page) => typeof page.text !== "string")
    )
      throw new Error("Unexpected PDF text result");
    const text = result.pages
      .map((page) => page.text)
      .join("\n\n")
      .trim();
    resultMessage = { text };
  } catch (error) {
    resultMessage = {
      code:
        (error.code === "PDF_PAGES" ? error.code : undefined) ||
        (error.name === "PasswordException" ? "PDF_PASSWORD" : "PDF_INVALID"),
    };
  } finally {
    try {
      await parser?.destroy();
    } catch {
      resultMessage = { code: "PDF_INVALID" };
    }
  }
  process.send({ type: "pdf-result", ...resultMessage });
});

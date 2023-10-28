import { defineLoader } from "vitepress";
import { writeFile, readFile } from "fs/promises";

interface Data {
  title?: string;
  content?: string;
  url?: string;
}
declare const data: Data;
export { data };

const page = "https://rentry.co/fmhy-guides/raw";
const regex = /\* \[([^\]]+)\]\(([^)]+)\)/g;
const rentryRe = /(?<=rentry\.(co|org)).*/;
const guides = new Set<Data>();

const f = async (url: string) => {
  const contents = await (await fetch(url))
    .text()
    .catch((error: Error) => console.error(`Failed at ${url}`, error));
  return contents;
};

export default defineLoader({
  async load(): Promise<Data> {
    const contents = await f(page);
    let match: any[] | null;
    while ((match = regex.exec(contents)) !== null) {
      const title = match[1];
      const url = match[2];
      // Fetch rentry guides
      if (url.match(rentryRe)) {
        const content = await f(url + "/raw");
        guides.add({ title, content });
      } else {
        // Everything else can be here
        guides.add({ title, url });
      }
    }
    const obj = Object.fromEntries(
      [...guides.entries()].map((entry, index) => [index.toString(), entry]),
    );
    await writeFile("./guides.json",JSON.stringify(obj, null, 4), "")
    return await readFile("./guides.json", { encoding: "utf-8"})
  },
});

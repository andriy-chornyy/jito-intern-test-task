
function convertHtml2JsonAndSet() {
  const htmlEl = document.getElementById("html");
  const jsonEl = document.getElementById("json");

  if (!htmlEl || !jsonEl) return;

  const htmlText = typeof htmlEl.value === "string" ? htmlEl.value : "";

  const result = html2json(htmlText);

  jsonEl.textContent = JSON.stringify(result, null, 2);
}

function html2json(html) {
  if (typeof html !== "string") return createRoot();

  const root = createRoot();
  const stack = [root];

  let i = 0;
  let buffer = "";

  let rawTag = null;
  let rawBuffer = "";
  let rawNode = null;

  while (i < html.length) {
    const c = html[i];

    if (rawTag) {
      const closeSeq = rawTag === "script" ? "</script>" : "</style>";
      const chunk = html.slice(i, i + closeSeq.length);

      if (chunk.toLowerCase() === closeSeq.toLowerCase()) {
        const parent = stack[stack.length - 1];

        if (rawNode) {
          rawNode.content = rawBuffer;
        }

        rawBuffer = "";
        rawTag = null;
        rawNode = null;

        i += closeSeq.length;
        continue;
      }

      rawBuffer += c;
      i++;
      continue;
    }

    if (c === "<") {
      if (buffer) {
        addText(buffer, stack);
        buffer = "";
      }

      if (html.startsWith("<!--", i)) {
        const end = html.indexOf("-->", i + 4);
        const stop = end === -1 ? html.length : end + 3;

        addComment(html.slice(i, stop), stack);
        i = stop;
        continue;
      }

      if (html.startsWith("<!DOCTYPE", i) || html.startsWith("<!doctype", i)) {
        const end = html.indexOf(">", i);
        const stop = end === -1 ? html.length : end + 1;

        const rootNode = stack[0];
        if (rootNode) {
          rootNode.doctype = cleanDoctype(html.slice(i, stop));
        }

        i = stop;
        continue;
      }

      const end = html.indexOf(">", i);
      if (end === -1) break;

      const raw = html.slice(i, end + 1);
      const isClosing = raw[1] === "/";
      const { tag, attrs } = splitTag(raw);

      if (!isClosing) {
        if (tag === "script" || tag === "style") {
          const node = createElement(tag, parseAttributes(attrs));
          const parent = stack[stack.length - 1];

          if (parent) {
            if (!Array.isArray(parent.children)) {
              parent.children = [];
            }

            parent.children.push(node);
          }

          rawTag = tag;
          rawBuffer = "";
          rawNode = node;

          i = end + 1;
          continue;
        }

        const current = stack[stack.length - 1];

        if (current && current.tag === "p" && AUTO_CLOSE_P.has(tag)) {
          stack.pop();
        }

        const node = createElement(tag, parseAttributes(attrs));
        const parent = stack[stack.length - 1];

        if (parent) parent.children.push(node);

        if (!isSelfClosing(tag, raw)) {
          stack.push(node);
        }
      } else {
        closeTag(tag, stack);
      }

      i = end + 1;
      continue;
    }

    buffer += c;
    i++;
  }

  if (buffer) addText(buffer, stack);

  function cleanEmpty(node) {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node.children)) {
      node.children.forEach(cleanEmpty);

      if (node.children.length === 0) {
        delete node.children;
      }
    }

    if (node.tag === "script" || node.tag === "style") {
      delete node.children;
    }
  }

  cleanEmpty(root);

  return root;
}

function createRoot() {
  return { nodeType: "root", doctype: null, children: [] };
}

function createElement(tag, attrs) {
  const node = {
    tag: tag || "",
    nodeType: "element",
    children: [],
  };

  if (attrs && Object.keys(attrs).length > 0) {
    node.attrs = attrs;
  }

  return node;
}

function closeTag(tag, stack) {
  if (!tag) return;

  for (let i = stack.length - 1; i > 0; i--) {
    if (stack[i].tag === tag) {
      stack.length = i;
      break;
    }
  }

  if (stack.length === 0) {
    stack.push(createRoot());
  }
}

function addText(text, stack) {
  const value = decode(text);
  if (!value || !value.trim()) return;

  const parent = stack[stack.length - 1];
  if (!parent) return;

  parent.children.push({
    nodeType: "text",
    content: value,
  });
}

function addComment(token, stack) {
  const parent = stack[stack.length - 1];
  if (!parent) return;

  const content = token.replace("<!--", "").replace("-->", "").trim();

  parent.children.push({
    nodeType: "comment",
    content,
  });
}

function parseAttributes(attrsStr) {
  const attrs = {};

  if (!attrsStr) return attrs;

  const regex = /([^\s=]+)(?:="([^"]*)"|'([^']*)'|=([^\s>]+))?/g;

  let m;
  while ((m = regex.exec(attrsStr))) {
    const key = m[1];
    let val = m[2] ?? m[3] ?? m[4] ?? true;

    attrs[key] = val;
  }

  return attrs;
}

function splitTag(raw) {
  const isClosing = raw[1] === "/";

  const start = isClosing ? 2 : 1;

  const spaceIndex = raw.indexOf(" ");

  const end = spaceIndex === -1 ? raw.length - 1 : spaceIndex;

  const tag = raw.slice(start, end);

  const attrs =
    !isClosing && spaceIndex !== -1
      ? raw.slice(spaceIndex + 1, raw.length - 1).trim()
      : "";

  return {
    tag: tag.toLowerCase(),
    attrs,
  };
}

function isSelfClosing(tag, raw) {
  return raw.endsWith("/>") || SELF_CLOSING.has(tag);
}

function cleanDoctype(str) {
  return str
    .replace(/<!doctype/i, "")
    .replace(/>/g, "")
    .trim();
}

function decode(str) {
  if (typeof str !== "string") return str;

  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

const SELF_CLOSING = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const AUTO_CLOSE_P = new Set([
  "div",
  "section",
  "article",
  "main",
  "aside",
  "header",
  "footer",
  "nav",
  "table",
  "ul",
  "ol",
  "li",
]);

async function loadHtmlSample(path) {
  try {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Failed to load: ${path}`);
    }

    const html = await response.text();

    document.getElementById("html").value = html;
    document.getElementById("json").textContent = "";
  } catch (error) {
    console.error(error);

    document.getElementById("json").textContent = `Error: ${error.message}`;
  }
}

function simple_test() {
  loadHtmlSample("./html_samples/01_simple.html");
}

function nested_test() {
  loadHtmlSample("./html_samples/02_nested.html");
}

function broken_test() {
  loadHtmlSample("./html_samples/03_broken_html.html");
}

function script_style_test() {
  loadHtmlSample("./html_samples/04_script_style.html");
}

function table_case_test() {
  loadHtmlSample("./html_samples/05_table_case.html");
}

function self_closing_test() {
  loadHtmlSample("./html_samples/06_self_closing.html");
}

function comment_doctype_test() {
  loadHtmlSample("./html_samples/07_comment_doctype.html");
}

function long_text_test() {
  loadHtmlSample("./html_samples/08_long_text.html");
}

function stress_test_test() {
  loadHtmlSample("./html_samples/09_stress_test.html");
}

function showExample1() {
  loadHtmlSample("./html_samples/showExample1.html");
}

function showExample2() {
  loadHtmlSample("./html_samples/showExample2.html");
}
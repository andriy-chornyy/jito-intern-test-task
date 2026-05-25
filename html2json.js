function convertHtml2JsonAndSet() {
  const htmlTextAreaValue = document.getElementById("html").value;
  const jsonObj = html2json(htmlTextAreaValue);
  const jsonArea = document.getElementById("json");
  jsonArea.textContent = JSON.stringify(jsonObj, null, 2);
}

/* 
  Update this function to convert html into json object.
  You can rewrite it completely, just be sure it accepts htmlText as string and outputs json object.
*/

function findAndCloseTag(stack, tagName) {
  let foundIndex = -1;

  for (let i = stack.length - 1; i > 0; i--) {
    if (stack[i].tagName === tagName) {
      foundIndex = i;
      break;
    }
  }

  if (foundIndex === -1) return;

  while (stack.length > foundIndex) {
    stack.pop();
  }
}

function normalizeText(text) {
  return text
    .replace(/\s+/g, " ")
    .trim();
}

function pushTextNode(parent, text) {
  const normalized = normalizeText(text);

  if (normalized.length === 0) {
    return;
  }

  parent.children.push({
    nodeType: "text",
    content: normalized
  });
}

const VOID_ELEMENTS = new Set([
  "img",
  "br",
  "hr",
  "meta",
  "input",
  "link"
]);

function html2json(htmlText) {
  let isInsideComment = false;

  function parseTag(tag) {
    const result = {
      tagName: "",
      attributes: {}
    };

    let i = 0;
    let mode = "tag";
    let key = "";
    let buffer = "";
    let quote = null;

    while (i < tag.length) {
      const char = tag[i];

      if (char === '"' || char === "'") {
        if (!quote) {
          quote = char;
        } else if (quote === char) {
          quote = null;
        } else {
          buffer += char;
        }

        i++;
        continue;
      }

      if (mode === "tag") {
        if (char === " ") {
          result.tagName = buffer;
          buffer = "";
          mode = "attr";
        } else {
          buffer += char;
        }

        i++;
        continue;
      }

      if (mode === "attr") {

        if (char === " " && !quote) {
          if (buffer.length > 0 && !key) {
            result.attributes[buffer] = true;
          }
          buffer = "";
          i++;
          continue;
        }

        if (char === "=" && !quote) {
          key = buffer;
          buffer = "";
          i++;
          continue;
        }

        buffer += char;
        i++;
        continue;
      }
    }

    if (buffer.length > 0) {
      if (!result.tagName) {
        result.tagName = buffer;
      } else if (!key) {
        result.attributes[buffer] = true;
      } else {
        result.attributes[key] = buffer;
      }
    }

    return result;
  }

  const result = {
    nodeType: "document",
    doctype: null,
    children: [],
    root: null
  };

  const stack = [result];

  let currentText = "";
  let currentTag = "";
  let isInsideTag = false;

  for (let i = 0; i < htmlText.length; i++) {
    const symbol = htmlText[i];

    if (!isInsideComment && htmlText.startsWith("<!--", i)) {
      isInsideComment = true;
      i += 3;
      currentTag = "";
      currentText = "";

      continue;
    }

    if (isInsideComment && htmlText.startsWith("-->", i)) {
      isInsideComment = false;
      i += 2;
      currentTag = "";
      currentText = "";

      continue;
    }

    if (isInsideComment) {
      continue;
    }

    if (symbol === "<") {

      const parent = stack[stack.length - 1];

      if (parent) {
        pushTextNode(parent, currentText);
      }

      currentText = "";
      currentTag = "";
      isInsideTag = true;

      continue;
    }

    if (symbol === ">") {
      const tag = currentTag.trim();

      if (tag.startsWith("!DOCTYPE")) {
        result.doctype = tag
          .replace("!DOCTYPE", "")
          .trim()
          .toLowerCase();

        currentTag = "";
        isInsideTag = false;

        continue;
      }

      if (tag.length > 0) {
        if (tag[0] === "/") {
          const tagName = tag.slice(1).trim();

          findAndCloseTag(stack, tagName);
        } else {
          const parsed = parseTag(tag);
          const tagName = parsed.tagName;

          const parent = stack[stack.length - 1];

          const element = {
            tagName,
            nodeType: "element",
            attributes: parsed.attributes,
            children: []
          };

          parent.children.push(element);

          const isVoid = VOID_ELEMENTS.has(tagName);

          if (!isVoid) {
            stack.push(element);
          }
        }
      }

      currentTag = "";
      isInsideTag = false;

      continue;
    }

    if (isInsideTag) {
      currentTag += symbol;
    } else {
      currentText += symbol;
    }
  }

  const parent = stack[stack.length - 1];

  if (parent) {
    pushTextNode(parent, currentText);
  }

  return result;
}

function showExample0() {
  const htmlExample = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" class="a b c">
    <title>Sample HTML</title>
    <link rel="stylesheet" href="styles.css" class="a b c">
</head>
<body>
    <header>
        <h1>Welcome to My Website</h1>
    </header>
    <nav>
        <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
        </ul>
    </nav>
    <main>
        <section id="home">
            <h2>Home Section</h2>
            <p>This is the home section of the webpage.</p>
        </section>
        <section id="about">
            <h2>About Section</h2>
            <p>This is the about section of the webpage.</p>
        </section>
    </main>
    <footer>
        <p>&copy; 2024 My Website</p>
    </footer>
    <script src="script.js"></script>
</body>
</html>
`;
  const jsonContent = {
    "Comment 1":
      "You have to think about how to take into account various html inputs so your json structure will cover them all and handle different cases.",
    "Comment 2":
      "When you make any choice in terms of selecting specific json structure for conversion - be ready to provide reasoning behind such choice.",
  };

  document.getElementById("html").value = htmlExample;
  document.getElementById("json").textContent = JSON.stringify(
    jsonContent,
    null,
    2
  );
}

function showExample1() {
  const htmlExample = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport">
    <title>Sample HTML</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Welcome to My Website</h1>
    </header>
    <nav>
        <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
        </ul>
    </nav>
    <main>
        <section id="home">
            <h2>Home Section</h2>
            <p>This is the home section of the webpage.</p>
        </section>
        <section id="about">
            <h2>About Section</h2>
            <p>This is the about section of the webpage.</p>
        </section>
    </main>
    <footer>
        <p>&copy; 2024 My Website</p>
    </footer>
    <script src="script.js"></script>
</body>
</html>
`;
  const jsonContent = {
    "Comment 1":
      "You have to think about how to take into account various html inputs so your json structure will cover them all and handle different cases.",
    "Comment 2":
      "When you make any choice in terms of selecting specific json structure for conversion - be ready to provide reasoning behind such choice.",
  };

  document.getElementById("html").value = htmlExample;
  document.getElementById("json").textContent = JSON.stringify(
    jsonContent,
    null,
    2
  );
}

function showExample2() {
  const htmlExample = `<div>
<p>Hello world!</p>
  <button>Click me!</button>
  <textarea>Some very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very long string.</textarea>
</div>
`;
  const jsonContent = {
    "Comment 1":
      "You have to think about how to take into account various html inputs so your json structure will cover them all and handle different cases.",
    "Comment 2":
      "When you make any choice in terms of selecting specific json structure for conversion - be ready to provide reasoning behind such choice.",
  };

  document.getElementById("html").value = htmlExample;
  document.getElementById("json").textContent = JSON.stringify(
    jsonContent,
    null,
    2
  );
}


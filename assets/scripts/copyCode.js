document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('div.highlighter-rouge').forEach(function (block) {
      const button = document.createElement("button");
      button.className = "copy-code-button";
      button.type = "button";
      button.innerText = "Copy";
  
      button.addEventListener("click", function () {
        const code = block.querySelector("pre code");
        navigator.clipboard.writeText(code.innerText).then(() => {
          button.innerText = "Copied!";
          setTimeout(() => (button.innerText = "Copy"), 2000);
        });
      });
  
      // Add button at the top of the code block
      block.insertBefore(button, block.firstChild);
    });
});
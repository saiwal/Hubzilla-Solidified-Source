// bbcode.ts
const rules: [RegExp, string][] = [
  [/\[b\](.*?)\[\/b\]/gis,       '<strong>$1</strong>'],
  [/\[i\](.*?)\[\/i\]/gis,       '<em>$1</em>'],
  [/\[u\](.*?)\[\/u\]/gis,       '<u>$1</u>'],
  [/\[s\](.*?)\[\/s\]/gis,       '<s>$1</s>'],
  [/\[code\](.*?)\[\/code\]/gis, '<pre><code>$1</code></pre>'],
  [/\[quote\](.*?)\[\/quote\]/gis,'<blockquote>$1</blockquote>'],
  [/\[url=(.*?)\](.*?)\[\/url\]/gi, '<a href="$1" rel="noopener">$2</a>'],
  [/\[url\](.*?)\[\/url\]/gi,    '<a href="$1" rel="noopener">$1</a>'],
  [/\[img\](.*?)\[\/img\]/gi,    '<img src="$1" alt="" />'],
  [/\[img=(.*?)\](.*?)\[\/img\]/gi, '<img src="$1" alt="$2" />'],
  [/\[color=(.*?)\](.*?)\[\/color\]/gi, '<span style="color:$1">$2</span>'],
  [/\[size=(.*?)\](.*?)\[\/size\]/gi,   '<span style="font-size:$1">$2</span>'],
  [/\[zrl=(.*?)\](.*?)\[\/zrl\]/gi, '<a href="$1">$2</a>'],
  [/\[zmg\](.*?)\[\/zmg\]/gi,    '<img src="$1" alt="" />'],
  [/\[spoiler\](.*?)\[\/spoiler\]/gis, '<details><summary>Spoiler</summary>$1</details>'],
  [/\[abstract\](.*?)\[\/abstract\]/gis, '<p class="abstract">$1</p>'],
	[/\[crypt\].*?\[\/crypt\]/gis, '<div class="encrypted-message">🔒 Encrypted message</div>'],
];

export function bbcodeToHtml(input: string): string {
  let output = input;
  for (const [pattern, replacement] of rules) {
    output = output.replace(pattern, replacement);
  }
  // Newlines to <br>
  output = output.replace(/\n/g, '<br>');
  return output;
}

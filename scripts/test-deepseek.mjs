const { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL } = process.env;

const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
  },
  body: JSON.stringify({
    model: DEEPSEEK_MODEL,
    messages: [{ role: "user", content: "Reply with exactly: DeepSeek works" }],
  }),
});

const data = await res.json();

if (!res.ok) {
  console.error(`HTTP ${res.status}`);
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log(data.choices[0].message.content);

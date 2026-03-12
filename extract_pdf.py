import fitz

doc = fitz.open('image num.pdf')
res = []

for page in doc:
    blocks = page.get_text('blocks')
    for b in blocks:
        text = b[4].strip()
        y0 = b[1]
        x0 = b[0]
        if text:
            res.append({'page': page.number, 'y0': y0, 'x0': x0, 'text': text})

# Sort by page then y0
res.sort(key=lambda item: (item['page'], item['y0'], item['x0']))

with open('pdf_layout.txt', 'w', encoding='utf-8') as f:
    for r in res:
        # replace newlines with spaces for single line output per block
        text = r['text'].replace('\n', ' ')
        f.write(f"P{r['page']} Y{r['y0']:05.1f} X{r['x0']:05.1f}: {text}\n")

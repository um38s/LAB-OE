import fitz

doc = fitz.open("d:/DATA/videCode/vibe/portfolio/2 디자인 철학.pdf")
text = ""
for page in doc:
    text += page.get_text()

with open("d:/DATA/videCode/vibe/portfolio/pdf_text.txt", "w", encoding="utf-8") as f:
    f.write(text)

print("Done writing to pdf_text.txt")

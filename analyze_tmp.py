import re
with open('client/pages/ExpenseManagement.tsx', encoding='utf-8') as f:
    lines = f.readlines()

def arabic_spans(line):
    return re.findall(r'[\u0600-\u06FF][\u0600-\u06FF 0-9%\u060c:.\-()/]*', line)

for idx in [199, 282, 283]:
    line = lines[idx]
    print(f"--- line {idx+1} (len={len(line)}) ---")
    matches = arabic_spans(line)
    seen = set()
    for m in matches:
        m2 = m.strip()
        if m2 and m2 not in seen:
            seen.add(m2)
            print(repr(m2))

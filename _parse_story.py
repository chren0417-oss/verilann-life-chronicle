# -*- coding: utf-8 -*-
import io, re, json

s = io.open('lib/story.ts', encoding='utf-8').read()
# 解析事件块
blocks = re.findall(r'(\{id:\'([^\']+)\',kind:\'([^\']+)\',title:\'([^\']+)\'.*?\}(?:,|\n\s*\n|$))', s, re.S)
out = []
for full, eid, kind, title in blocks:
    labels = re.findall(r"choice\('([^']+)'", full)
    out.append({'id': eid, 'kind': kind, 'title': title, 'choices': labels})

with io.open('_story_overview.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)

# 输出紧凑清单
cur = None
for o in out:
    if o['kind'] != cur:
        cur = o['kind']
        print('\n===== %s =====' % cur)
    c = '；'.join(o['choices']) if o['choices'] else '（自动推进）'
    print('%s：%s' % (o['id'], o['title']))
    print('  分叉: %s' % c)

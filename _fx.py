import io,re
s=io.open('lib/game.ts',encoding='utf-8').read()
i=s.find('export const gearShop')
j=s.find('export type QuestSeed')
seg=s[i:j]
names=re.findall(r"name:'([^']+)'",seg)
print('gearShop count:',len(names))
print(' | '.join(names[:60]))

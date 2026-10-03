"""Build synthetic demo reviews with cached, unreviewed NLLB language variants."""
import json, sys
from pathlib import Path
sys.path.insert(0,str(Path('ai/translation').resolve()))
from server import Engine
engine = Engine()
languages = {"English":"eng_Latn","French":"fra_Latn","Kiswahili":"swh_Latn","German":"deu_Latn","Spanish":"spa_Latn","Italian":"ita_Latn","Portuguese":"por_Latn","Arabic":"arb_Arab","Hindi":"hin_Deva","Chinese":"zho_Hans"}
scenarios = [
 (5,'tasting','The coffee tasting was the highlight of our visit and we would love a longer tasting session.'),
 (4,'directions','We enjoyed the farm but the last turn was hard to find without a clear road sign.'),
 (5,'learning','We loved learning from Noor about growing coffee and the stories of her family.'),
 (4,'tasting','The tasting was excellent and we wish we could buy a small bag of beans to take home.'),
 (3,'time','The roasting demonstration felt rushed and we needed more time to ask questions.'),
 (5,'learning','The hands-on workshop was wonderful and we would return for a full roasting class.'),
 (4,'family','Our children loved exploring the farm and we would appreciate a shorter family tour.'),
 (3,'accessibility','We needed clearer information about wheelchair access and the steps along the farm path.'),
 (5,'tasting','We loved comparing the different coffee flavours and the warm welcome made us feel at home.'),
 (4,'directions','The bus stop was easy to reach but we needed a walking map for the final part of the journey.'),
 (4,'time','We enjoyed the visit but the waiting time before the tour was longer than expected.'),
 (5,'sunset','The sunset views were wonderful and we would love an evening coffee experience.'),
 (4,'retail','We loved the local coffee and would appreciate a gift pack with a brewing guide.'),
 (5,'sustainability','Learning about composting and sustainable growing was excellent and we would love a practical workshop.'),
 (2,'time','The group was too large and we could not hear the guide clearly during the demonstration.'),
]
names = {
 'English':['Maya Thompson','Daniel Brooks','Emma Wilson','Oliver Bennett','Sarah Collins'],
 'French':['Camille Laurent','Jean Moreau','Chloé Martin','Luc Bernard','Amélie Dubois'],
 'Kiswahili':['Zawadi Mwangi','Amina Hassan','Juma Otieno','Neema Wanjiku','Baraka Kamau'],
 'German':['Lena Fischer','Felix Weber','Mia Schneider','Jonas Wagner','Anna Becker'],
 'Spanish':['Lucía García','Mateo Torres','Sofía Romero','Diego Navarro','Elena Ruiz'],
 'Italian':['Giulia Rossi','Marco Bianchi','Sofia Romano','Luca Moretti','Chiara Conti'],
 'Portuguese':['Ana Silva','João Santos','Beatriz Costa','Pedro Oliveira','Mariana Sousa'],
 'Arabic':['Layla Hassan','Omar Khalil','Nour Ibrahim','Youssef Ali','Salma Ahmed'],
 'Hindi':['Ananya Sharma','Arjun Patel','Priya Mehta','Rahul Singh','Meera Kapoor'],
 'Chinese':['Li Wei','Wang Fang','Chen Yu','Zhang Min','Liu Jing'],
}
translations={}
for language, code in languages.items():
 engine.tokenizer.src_lang='eng_Latn'
 values=[]
 for offset in range(0,15,5):
  originals=[s[2] for s in scenarios[offset:offset+5]]
  if language=='English': values.extend(originals); continue
  inputs=engine.tokenizer(originals,return_tensors='pt',padding=True,truncation=False)
  with engine.torch.inference_mode():
   outputs=engine.model.generate(**inputs,forced_bos_token_id=engine.tokenizer.convert_tokens_to_ids(code),max_new_tokens=180,num_beams=2)
  values.extend(engine.tokenizer.batch_decode(outputs,skip_special_tokens=True))
 translations[language]=values
 print(f'{language}: {len(values)} translated samples',flush=True)
 Path('.ai-cache/review-translations.json').write_text(json.dumps(translations,ensure_ascii=False))
rows=[]
for lindex, language in enumerate(languages):
 for index,(rating,theme,english) in enumerate(scenarios):
  number=index*10+lindex+1
  row={'id':f'r{number}','guest':names[language][index%5].split()[0] + ' ' + ' '.join(names[language][(index%5+index//5)%5].split()[1:]),'language':language,'rating':rating,'theme':theme,'text':translations[language][index],'demo':True,'canonicalEnglish':english,'date':f'2026-09-{28-index:02d}','origin':'Demo review import','translationProvenance':'authored-English / NLLB language variant (unreviewed)','fixtureTranslations':{lang:values[index] for lang,values in translations.items()}}
  if index in [0,3,8,12]:
   reply='Thank you for sharing your feedback with us.'
   if language!='English':
    engine.tokenizer.src_lang='eng_Latn'
    inputs=engine.tokenizer(reply,return_tensors='pt')
    with engine.torch.inference_mode(): outputs=engine.model.generate(**inputs,forced_bos_token_id=engine.tokenizer.convert_tokens_to_ids(languages[language]),max_new_tokens=80,num_beams=2)
    reply=engine.tokenizer.batch_decode(outputs,skip_special_tokens=True)[0]
   row['exampleResponse']={'text':reply,'language':language,'respondedAt':'2026-09-30','demo':True}
  rows.append(row)
rows.sort(key=lambda r:int(r['id'][1:]))
Path('src/data/review-demo.ts').write_text('import type { Review } from "./types";\n// Synthetic scenarios, with machine-translated sample text. Not imported visitor reviews.\nexport const reviewDemo: Review[] = '+json.dumps(rows,ensure_ascii=False,indent=2)+';\n')
print(f'Saved {len(rows)} reviews',flush=True)

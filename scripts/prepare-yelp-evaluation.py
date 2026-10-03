"""Stream a small LOCAL evaluation sample; never ship the full Yelp archive."""
import argparse, gzip, io, json, tarfile, zipfile
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('archive',type=Path)
parser.add_argument('--limit',type=int,default=200)
parser.add_argument('--output',type=Path,default=Path('.ai-cache/yelp-evaluation.jsonl'))
args=parser.parse_args()
if not 1<=args.limit<=1000: parser.error('Choose 1–1000 reviews.')
args.output.parent.mkdir(parents=True,exist_ok=True)
count=0
with zipfile.ZipFile(args.archive) as outer, outer.open('Yelp JSON/yelp_dataset.tar') as packed:
 with tarfile.open(fileobj=packed,mode='r|*') as archive, args.output.open('w') as output:
  for member in archive:
   if member.name != 'yelp_academic_dataset_review.json': continue
   stream=archive.extractfile(member)
   for line in stream:
    row=json.loads(line)
    if not isinstance(row.get('text'),str) or not row['text'].strip(): continue
    count+=1
    # Remove user/business IDs and reviewer identity. Text remains source material.
    sample={'id':f'yelp-eval-{count:04d}','text':row['text'],'rating':row['stars'],'language':'unknown','source':'Yelp Open Dataset','synthetic':False,'humanReviewed':False,'purpose':'local evaluation only'}
    output.write(json.dumps(sample,ensure_ascii=False)+'\n')
    if count>=args.limit: break
   break
if not count: raise ValueError('No review records found in this archive.')
print(f'Prepared {count} real review records for local evaluation. Not added to Lauda or committed.')

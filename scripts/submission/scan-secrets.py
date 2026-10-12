#!/usr/bin/env python3
"""Read-only heuristic scan of every reachable Git blob/message and current source.
Prints only service/rule, location and SHA-256 fingerprints; never secret values.
Not a guarantee that all secrets are detected. No remote credential validation.
"""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('repository', nargs='?', default='.')
parser.add_argument('--output', required=True)
args = parser.parse_args()
root = Path(args.repository).resolve()
def git(*argv):
    return subprocess.check_output(['git', '-C', str(root), *argv])

patterns = [
 ('AWS access key ID', r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'),
 ('Google/YouTube API key', r'\bAIza[0-9A-Za-z_-]{35}\b'),
 ('OpenAI/DeepSeek/Anthropic-style key', r'\bsk-(?:ant-|proj-|svcacct-)?[A-Za-z0-9_-]{20,}'),
 ('GitHub token', r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})'),
 ('Slack token', r'\bxox[baprs]-[0-9A-Za-z-]{20,}'),
 ('JWT / possible Supabase token', r'\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'),
 ('Private key', r'-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'),
 ('Credential-bearing URL', r'(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|https?)://[^\s/:]+:[^\s/@]+@[^\s\"\x27]+'),
 ('Literal credential assignment', r'''(?i)(?:[A-Z0-9_]*(?:api[_-]?key|secret|password|passwd|access[_-]?token|auth[_-]?token|service[_-]?role[_-]?key)[A-Z0-9_]*|token)["']?\s*[:=]\s*["']([^\s"'`]{8,})["']'''),
 ('Environment credential assignment', r'(?im)^(?:export\s+)?[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)[A-Z0-9_]*[ \t]*=[ \t]*([^\s#\"\x27]{8,})'),
]
compiled = [(label, re.compile(pattern)) for label, pattern in patterns]
findings = []
keywords = re.compile(r'(?i)api[_-]?key|secret|password|\bsk-|\bAKIA|\bASIA|credential|token')
keyword_blobs = 0

def scan(text, location, scope, oid=None):
    global keyword_blobs
    if keywords.search(text): keyword_blobs += 1
    for label, pattern in compiled:
        for match in pattern.finditer(text):
            value = match.group(1) if match.lastindex else match.group(0)
            # Obvious source expressions and placeholders are not credential values.
            if value.startswith(('process.env', '${', '{{', '<')): continue
            if value.lower() in {'undefined','changeme','your_api_key','your-api-key','your_secret_key','your-secret-key'}: continue
            finding = {'scope': scope, 'rule': label, 'path': location,
                       'line': text.count('\n', 0, match.start()) + 1,
                       'fingerprint': hashlib.sha256(value.encode()).hexdigest()[:16]}
            if oid: finding['object'] = oid
            findings.append(finding)

objects = git('rev-list', '--objects', '--all').decode().splitlines()
blob_count = 0
# cat-file's batch protocol avoids spawning one process per historical file.
proc = subprocess.Popen(['git','-C',str(root),'cat-file','--batch'],stdin=subprocess.PIPE,stdout=subprocess.PIPE)
for entry in objects:
    oid, _, name = entry.partition(' ')
    proc.stdin.write((oid+'\n').encode());proc.stdin.flush()
    header = proc.stdout.readline().decode().split()
    size = int(header[2]);data=proc.stdout.read(size);proc.stdout.read(1)
    if header[1] == 'blob':
        blob_count += 1
        scan(data.decode('utf-8',errors='replace'),name,'history',oid)
    elif header[1] == 'commit':
        scan(data.decode('utf-8',errors='replace').partition('\n\n')[2],oid,'commit message',oid)
proc.stdin.close();proc.wait()
paths = set(git('ls-files','-z','--cached','--others','--exclude-standard').decode().split('\0'))
current_count=0
for name in sorted(paths):
    p=root/name
    if name and p.is_file():
        current_count+=1
        scan(p.read_bytes().decode('utf-8',errors='replace'),name,'current')
report={'scanner':'read-only pattern scan v1','history_blobs':blob_count,
        'commits':int(git('rev-list','--all','--count')),'current_files':current_count,
        'keyword_matched_contents':keyword_blobs,'findings':findings}
Path(args.output).write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='findings'}))
print(f'{len(findings)} candidate matches; redacted report: {args.output}')

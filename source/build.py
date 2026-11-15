import pathlib,re,sys
root=pathlib.Path(__file__).parent; src=root/'src'
css=(src/'style.css').read_text()
js=''.join((src/f).read_text()+'\n' for f in ['data.js','core.js','logic.js','views1.js','views2.js','auth.js','views3.js'])
assert '</script' not in js.lower(), 'script terminator in JS'
html=(src/'template.html').read_text().replace('/*CSS*/',css).replace('/*JS*/',js)
out=root/'dist'/'index.html'; out.parent.mkdir(exist_ok=True); out.write_text(html)
print('built',out,len(html),'bytes')

const fs=require('fs');
fs.mkdirSync('dist/assets',{recursive:true});
for(const file of ['index.html','article.html','image.html','video.html','final.html','style.css','app.js'])fs.copyFileSync(file,'dist/'+file);
for(const file of fs.readdirSync('assets'))fs.copyFileSync('assets/'+file,'dist/assets/'+file);
for(const page of ['index','article','image','video','final']){const html=fs.readFileSync('dist/'+page+'.html','utf8');for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){if(!/^https?:/.test(match[1])&&!fs.existsSync('dist/'+match[1]))throw new Error('Missing linked file: '+match[1]);}if(!html.includes('lang="ko"'))throw new Error('Missing language');}
console.log('Static build passed. All 5 pages and local links verified.');

const dialog=document.querySelector('dialog');
document.querySelectorAll('[data-story]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();const story=document.getElementById(link.dataset.story);dialog.querySelector('.dialog-content').innerHTML=story.innerHTML;dialog.showModal()}));
document.querySelectorAll('[data-art]').forEach(button=>button.addEventListener('click',()=>{const content=dialog.querySelector('.dialog-content');content.replaceChildren();const title=document.createElement('h2');title.textContent=button.dataset.title;const image=document.createElement('img');image.src=button.dataset.art;image.alt=button.dataset.title;content.append(title,image);dialog.showModal()}));
dialog?.querySelector('.close').addEventListener('click',()=>dialog.close());
dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});

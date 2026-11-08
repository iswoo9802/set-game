import {attrs,validSet,keyOf,makeRounds,currentRound,scoresOf} from './core.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const say=s=>$('message').textContent=s,lobbySay=s=>$('lobbyMessage').textContent=s;
const labels=[['타원','마름모','물결'],['빨강','초록','보라'],['1개','2개','3개'],['꽉 채움','빗금','비어 있음']];
let api,db,uid,code='',room=null,online=false,busy=false,pending=false,selected=[],unsub,boardKey='',lastRound=-1;
const path=p=>api.ref(db,`rooms/${code}${p?'/'+p:''}`);
const isOwner=()=>room?.owner===uid;
function remember(c){try{c?localStorage.setItem('set-auto-room',c):localStorage.removeItem('set-auto-room')}catch{}}
function friendly(e){return (e.code||'').includes('permission')?'접근이 거부되었어요. 새 database.rules.json을 Firebase에 게시했는지 확인해 주세요.':(e.code||'').includes('operation-not-allowed')?'Firebase Authentication에서 익명 로그인을 켜 주세요.':'처리 오류: '+(e.message||e)}
async function guard(fn){if(busy)return;busy=true;try{await fn()}catch(e){(code?say:lobbySay)(friendly(e))}finally{busy=false;render()}}
function shape(id){let [s,c,n,f]=attrs(id),col=['#d14251','#16805b','#8450bc'][c],p=s===0?'<ellipse cx="25" cy="38" rx="18" ry="31"':s===1?'<polygon points="25,5 45,38 25,71 5,38"':'<path d="M12 6 C48 -4 49 26 32 39 C15 52 49 76 27 70 C-7 76 2 49 17 35 C31 22 -5 15 12 6 Z"';return Array.from({length:n+1},(_,i)=>`<svg viewBox="0 0 50 76" aria-hidden="true"><defs><pattern id="p${id}-${i}" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0V6" stroke="${col}" stroke-width="2"/></pattern></defs>${p} fill="${f===0?col:f===1?`url(#p${id}-${i})`:'white'}" stroke="${col}" stroke-width="3"/></svg>`).join('')}
function render(){
 $('connection').textContent=online?'● 연결됨 · 자동 정답 판정':'○ 연결을 기다립니다. 인터넷을 확인해 주세요.';
 if(!room||!code)return;let r=currentRound(room),ended=r>=room.count,owner=isOwner(),play=online&&!busy&&!pending&&!owner&&!ended;
 $('roomCode').textContent=code;$('teacher').hidden=!owner;$('submit').hidden=owner;$('clear').hidden=owner;$('hostWarning').hidden=true;
 $('phase').textContent=ended?'게임 종료':`${r+1} / ${room.count}판`;$('remaining').textContent=room.level==='easy'?'쉬움 · 채움 고정':'기본 · 네 가지 속성';$('found').textContent='완료 '+r+'판';$('notice').textContent=ended?'모든 판을 마쳤어요! 최종 점수를 확인해요.':'셋을 찾아 제출하세요. 정답이 나오면 다음 판으로 자동 이동해요.';
 if(r!==lastRound){selected=[];lastRound=r}
 let board=ended?[]:room.rounds[r].board,key=JSON.stringify([r,board,selected,play]);
 if(key!==boardKey){boardKey=key;$('board').innerHTML=board.map((id,i)=>`<button class="card" data-id="${id}" aria-pressed="${selected.includes(id)}" aria-label="${i+1}번 ${attrs(id).map((v,k)=>labels[k][v]).join(', ')}" ${play?'':'disabled'}><span class="number">${i+1}</span>${shape(id)}</button>`).join('');if(ended)$('board').innerHTML='<p class="muted" style="grid-column:1/-1">탐정 활동을 마쳤어요. 수고했어요!</p>'}
 $('submit').disabled=!play||selected.length!==3;$('submit').textContent=pending?'정답 확정 중…':'셋! 정답 제출';$('clear').disabled=pending;
 let scores=scoresOf(room),entries=Object.entries(room.members||{}).sort((a,b)=>(scores[b[0]]||0)-(scores[a[0]]||0)||a[1].joinedAt-b[1].joinedAt);
 $('memberCount').textContent=`참여자 ${entries.length}명 · ${ended?'최종 점수':'점수'}`;$('ranking').innerHTML=entries.map(([id,m],i)=>`<div class="listrow ${id===uid?'mine':''}"><span>${i+1}. ${esc(m.name)}${id===uid?' (나)':''}</span><strong>${scores[id]||0}점</strong></div>`).join('')||'<p class="muted">학생 입장을 기다립니다.</p>';
}
function leave(){unsub?.();unsub=null;code='';room=null;selected=[];lastRound=-1;boardKey='';$('room').hidden=true;$('lobby').hidden=false;remember(null)}
async function enter(c){let snap=await api.get(api.ref(db,'rooms/'+c));if(!snap.exists())throw Error('방이 없어요. 참여코드를 확인해 주세요.');if(snap.val().version!==3)throw Error('이전 버전 게임방이에요. 새 게임방을 만들어 주세요.');code=c;room=snap.val();remember(c);$('room').hidden=false;$('lobby').hidden=true;say(isOwner()?'방이 준비됐어요. 참여코드를 안내한 뒤 이 화면을 닫아도 됩니다.':'입장했어요! 셋을 찾아 바로 제출해 보세요.');unsub=api.onValue(path(''),s=>{if(!s.exists()){leave();lobbySay('방이 삭제되었어요.');return}room=s.val();render()},e=>say(friendly(e)));render()}
$('create').onclick=()=>guard(async()=>{if(!online)throw Error('인터넷 연결을 확인해 주세요.');let rounds=makeRounds($('level').value,+$('roundCount').value);for(let i=0;i<12;i++){let a=new Uint32Array(1);crypto.getRandomValues(a);let c=String(100000+a[0]%900000),ref=api.ref(db,'rooms/'+c);if((await api.get(ref)).exists())continue;let result=await api.runTransaction(ref,v=>v?undefined:{version:3,owner:uid,level:$('level').value,count:+$('roundCount').value,createdAt:api.serverTimestamp(),rounds},{applyLocally:false});if(result.committed){await enter(c);return}}throw Error('방 생성에 실패했어요. 다시 시도해 주세요.')});
$('join').onclick=()=>guard(async()=>{let c=$('codeInput').value.trim(),name=$('nickname').value.trim();if(!/^\d{6}$/.test(c))throw Error('숫자 코드 6자리를 입력해 주세요.');let snap=await api.get(api.ref(db,'rooms/'+c));if(!snap.exists())throw Error('방이 없어요. 참여코드를 확인해 주세요.');let data=snap.val();if(data.version!==3)throw Error('이전 버전 게임방이에요. 새 방을 만들어 주세요.');if(data.owner!==uid){if(!name||name.length>12)throw Error('별명을 1~12자로 입력해 주세요.');await api.set(api.ref(db,`rooms/${c}/members/${uid}`),{name,joinedAt:data.members?.[uid]?.joinedAt||api.serverTimestamp()})}await enter(c)});
$('board').onclick=e=>{let b=e.target.closest('[data-id]');if(!b||!online||busy||pending||isOwner()||currentRound(room)>=room.count)return;let id=+b.dataset.id;if(selected.includes(id))selected=selected.filter(x=>x!==id);else if(selected.length<3)selected.push(id);else say('3장을 골랐어요. 제출하거나 다시 눌러 취소해요.');render()};
$('clear').onclick=()=>{if(!pending){selected=[];render()}};
$('submit').onclick=async()=>{
 if(pending||!online||selected.length!==3||!room||isOwner())return;
 const ids=[...selected],r=currentRound(room),c=code;
 if(r>=room.count)return;
 if(!validSet(ids)){let properties=['모양','색깔','개수','채움'],bad=properties.filter((_,k)=>new Set(ids.map(id=>attrs(id)[k])).size===2);say('다시 찾아요. '+bad.join('·')+'에서 두 장만 같아요. 각 속성이 모두 같거나 모두 달라야 해요.');return}
 pending=true;say('셋이 맞아요! 점수를 확정하고 있어요.');render();
 try{let result=await api.runTransaction(api.ref(db,`rooms/${c}/rounds/${r}/winner`),v=>v?undefined:{uid,key:keyOf(ids),at:api.serverTimestamp()},{applyLocally:false});if(code===c)say(result.committed?'정답! 1점을 얻었어요. 다음 판에 도전해요.':'다른 탐정이 먼저 정답을 확정했어요. 다음 판에서 찾아요.')}
 catch(e){if(code===c){try{let s=await api.get(api.ref(db,`rooms/${c}/rounds/${r}/winner`));if(s.exists())say(s.val().uid===uid?'정답이 반영됐어요!':'다른 탐정이 먼저 정답을 확정했어요.');else say(friendly(e))}catch{say(friendly(e))}}}
 finally{pending=false;selected=[];render()}
};
$('leave').onclick=()=>{if(!pending)leave();else say('제출 결과를 확인한 뒤 나가 주세요.')};
$('delete').onclick=()=>guard(async()=>{if(isOwner()&&confirm('이 게임방과 모든 점수를 삭제할까요?'))await api.remove(path(''))});
$('copy').onclick=async()=>{let u=new URL(location.href);u.search='';u.searchParams.set('room',code);try{await navigator.clipboard.writeText(u.href);say('참여 링크를 복사했어요.')}catch{prompt('이 주소를 복사해 주세요.',u.href)}};
async function boot(){let config=window.FIREBASE_CONFIG||{};if(!['apiKey','databaseURL','projectId','appId'].every(k=>config[k])){$('setup').hidden=false;$('connection').textContent='Firebase 연결 설정이 필요해요.';return}try{const base='https://www.gstatic.com/firebasejs/12.5.0/';let [a,b,c]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-database.js')]);api=c;let app=a.initializeApp(config),auth=b.getAuth(app);await auth.authStateReady();uid=(auth.currentUser||(await b.signInAnonymously(auth)).user).uid;db=api.getDatabase(app);api.onValue(api.ref(db,'.info/connected'),s=>{online=s.val()===true;render()});$('lobby').hidden=false;let link=new URLSearchParams(location.search).get('room');if(/^\d{6}$/.test(link||''))$('codeInput').value=link;let saved;try{saved=localStorage.getItem('set-auto-room')}catch{}if(saved&&(!link||saved===link)){let s=await api.get(api.ref(db,'rooms/'+saved));if(s.exists()&&s.val().version===3&&(s.val().owner===uid||s.val().members?.[uid]))await enter(saved);else remember(null)}}catch(e){$('setup').hidden=false;$('connection').textContent=friendly(e)}}
boot();

document.addEventListener('DOMContentLoaded', () => {
  const display = document.getElementById('display');
  const sliderBox = document.getElementById('sliderBox');
  const slider = document.getElementById('sliderHours');
  const labelHours = document.getElementById('labelHours');
  const labelLeft = document.getElementById('labelLeft');

  const tabClock = document.getElementById('tabClock');
  const tabStopwatch = document.getElementById('tabStopwatch');
  const tabAlarm = document.getElementById('tabAlarm');
  const tabSettings = document.getElementById('tabSettings');

  const langSelect = document.getElementById('langSelect');
  const langSelectSettings = document.getElementById('langSelectSettings');

  const stopwatchArea = document.getElementById('stopwatchArea');
  const swStart = document.getElementById('swStart');
  const swLap = document.getElementById('swLap');
  const swReset = document.getElementById('swReset');
  const lapList = document.getElementById('lapList');

  const alarmArea = document.getElementById('alarmArea');
  const alarmTimeInput = document.getElementById('alarmTime');
  const alarmSetBtn = document.getElementById('alarmSetBtn');
  const alarmsContainer = document.getElementById('alarmsContainer');

  const settingsArea = document.getElementById('settingsArea');
  const secondsToggle = document.getElementById('secondsToggle');
  const secondsLabel = document.getElementById('secondsLabel');
  const footer = document.querySelector('.footer');

  const L = {
    ja: { 'tab.clock':'時計','tab.stopwatch':'ストップウォッチ','tab.alarm':'アラーム','tab.settings':'設定',
      'btn.start':'Start','btn.stop':'Stop','btn.lap':'Lap','btn.reset':'Reset','btn.addAlarm':'アラーム追加',
      'label.hours':'1日の長さ','settings.showSeconds':'秒数表示','settings.language':'言語','footer':'設定は自動で保存されます。',
      'msg.pickTime':'時刻を選択してください','msg.invalidTime':'不正な時刻です','msg.alarmSound':'アラームが鳴りました'},
    en: { 'tab.clock':'Clock','tab.stopwatch':'Stopwatch','tab.alarm':'Alarm','tab.settings':'Settings',
      'btn.start':'Start','btn.stop':'Stop','btn.lap':'Lap','btn.reset':'Reset','btn.addAlarm':'Add Alarm',
      'label.hours':'Day length','settings.showSeconds':'Show seconds','settings.language':'Language','footer':'Settings are saved automatically.',
      'msg.pickTime':'Please pick a time','msg.invalidTime':'Invalid time','msg.alarmSound':'Alarm'}
  };

  // 状態
  let customHours = Number(localStorage.getItem('nclock_hours')) || 24;
  slider.value = customHours;
  let showSeconds = (localStorage.getItem('nclock_show_seconds')==='true') || true;
  secondsToggle.checked = showSeconds;
  let lang = localStorage.getItem('nclock_lang') || 'ja';
  let mode = localStorage.getItem('nclock_mode') || 'clock';
  let lastFrame = performance.now();
  let running = false;
  let elapsedMs = Number(localStorage.getItem('nclock_sw_elapsed')) || 0;
  let laps = JSON.parse(localStorage.getItem('nclock_sw_laps') || '[]');
  let alarms = JSON.parse(localStorage.getItem('nclock_alarms') || '[]');
  let lastTriggered = localStorage.getItem('nclock_last_triggered') || '';

  function t(key){ return (L[lang] && L[lang][key]) ? L[lang][key] : key; }
  function saveAll(){
    localStorage.setItem('nclock_hours',customHours);
    localStorage.setItem('nclock_mode',mode);
    localStorage.setItem('nclock_sw_elapsed',elapsedMs);
    localStorage.setItem('nclock_sw_laps',JSON.stringify(laps));
    localStorage.setItem('nclock_alarms',JSON.stringify(alarms));
    localStorage.setItem('nclock_show_seconds',showSeconds);
    localStorage.setItem('nclock_lang',lang);
    localStorage.setItem('nclock_last_triggered',lastTriggered);
  }

  function applyLocalization(){
    tabClock.textContent=t('tab.clock');
    tabStopwatch.textContent=t('tab.stopwatch');
    tabAlarm.textContent=t('tab.alarm');
    tabSettings.textContent=t('tab.settings');
    labelLeft.textContent=t('label.hours');
    labelHours.textContent=(lang==='en')?`${customHours} h`:`${customHours} 時間`;
    footer.textContent=t('footer');
    secondsLabel.textContent=showSeconds?(lang==='en'?'On':'表示'):(lang==='en'?'Off':'非表示');
    document.querySelectorAll('[data-key]').forEach(el=>{ const k=el.getAttribute('data-key'); if(k) el.textContent=t(k); });
    document.querySelectorAll('[data-key-start]').forEach(el=>{ el.textContent=running?t('btn.stop'):t('btn.start'); });
  }

  function setMode(m){
    mode=m;
    [tabClock,tabStopwatch,tabAlarm,tabSettings].forEach(t=>t.classList.remove('active'));
    if(m==='clock') tabClock.classList.add('active');
    if(m==='stopwatch') tabStopwatch.classList.add('active');
    if(m==='alarm') tabAlarm.classList.add('active');
    if(m==='settings') tabSettings.classList.add('active');
    // モードごとに表示
    sliderBox.style.display=(m==='clock')?'block':'none';
    stopwatchArea.style.display=(m==='stopwatch')?'flex':'none';
    alarmArea.style.display=(m==='alarm')?'block':'none';
    settingsArea.style.display=(m==='settings')?'block':'none';
    saveAll();
    applyLocalization();
  }

  setMode(mode);

  slider.addEventListener('input',e=>{ customHours=Number(e.target.value); labelHours.textContent=(lang==='en')?`${customHours} h`:`${customHours} 時間`; saveAll(); });
  tabClock.addEventListener('click',()=>setMode('clock'));
  tabStopwatch.addEventListener('click',()=>setMode('stopwatch'));
  tabAlarm.addEventListener('click',()=>setMode('alarm'));
  tabSettings.addEventListener('click',()=>setMode('settings'));
  langSelect.addEventListener('change',()=>{ lang=langSelect.value; langSelectSettings.value=lang; applyLocalization(); saveAll(); });
  langSelectSettings.addEventListener('change',()=>{ lang=langSelectSettings.value; langSelect.value=lang; applyLocalization(); saveAll(); });
  secondsToggle.addEventListener('change',()=>{ showSeconds=secondsToggle.checked; secondsLabel.textContent=showSeconds?(lang==='en'?'On':'表示'):(lang==='en'?'Off':'非表示'); saveAll(); });

  function formatStopwatch(ms){ const t=Math.floor(ms/1000); const h=Math.floor(t/3600); const m=Math.floor(t/60)%60; const s=t%60; return h>0?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
  function renderLaps(){ lapList.innerHTML=''; if(laps.length===0){ lapList.innerHTML=`<div style="color:var(--muted);padding:8px">${lang==='en'?'No laps':'ラップなし'}</div>`; return; } laps.forEach((t,i)=>{ const n=document.createElement('div'); n.className='lap-item'; n.innerHTML=`<div>${lang==='en'?'Lap':'Lap'} ${laps.length-i}</div><div>${t}</div>`; lapList.appendChild(n); }); }
  renderLaps();

  swStart.addEventListener('click',()=>{ running=!running; if(running){ lastFrame=performance.now(); swStart.textContent=t('btn.stop'); swStart.classList.remove('btn-start'); swStart.classList.add('btn-stop'); swLap.disabled=false; swReset.disabled=true; } else { swStart.textContent=t('btn.start'); swStart.classList.remove('btn-stop'); swStart.classList.add('btn-start'); swLap.disabled=true; swReset.disabled=false; saveAll(); } });
  swLap.addEventListener('click',()=>{ laps.unshift(formatStopwatch(elapsedMs)); if(laps.length>5000) laps.pop(); renderLaps(); saveAll(); });
  swReset.addEventListener('click',()=>{ elapsedMs=0; laps=[]; renderLaps(); swReset.disabled=true; saveAll(); });

  function genId(){ return Math.floor(Math.random()*1e9).toString(36); }
  function renderAlarms(){ alarmsContainer.innerHTML=''; if(alarms.length===0){ alarmsContainer.innerHTML=`<div style="color:var(--muted);padding:8px">${lang==='en'?'No alarms':'アラームなし'}</div>`; return; } alarms.forEach((a,idx)=>{ const c=document.createElement('div'); c.className='alarm-card'; const timeDiv=document.createElement('
        div'); timeDiv.className='alarm-time'; timeDiv.textContent=`${String(a.hour).padStart(2,'0')}:${String(a.min).padStart(2,'0')}`; 
    const actions=document.createElement('div'); actions.className='alarm-actions';
    const toggle=document.createElement('div'); toggle.className='toggle'+(a.enabled?' on':''); 
    const thumb=document.createElement('div'); thumb.className='thumb'; toggle.appendChild(thumb);
    toggle.addEventListener('click',()=>{ a.enabled=!a.enabled; saveAll(); renderAlarms(); });
    const del=document.createElement('button'); del.className='del-btn'; del.textContent=lang==='en'?'Delete':'削除';
    del.addEventListener('click',()=>{ alarms.splice(idx,1); saveAll(); renderAlarms(); });
    actions.appendChild(toggle); actions.appendChild(del); c.appendChild(timeDiv); c.appendChild(actions); alarmsContainer.appendChild(c);
  }); }
  renderAlarms();

  alarmSetBtn.addEventListener('click',()=>{
    const val=alarmTimeInput.value; if(!val){ alert(t('msg.pickTime')); return; }
    const [hh,mm]=val.split(':').map(n=>Number(n)); if(isNaN(hh)||isNaN(mm)){ alert(t('msg.invalidTime')); return; }
    alarms.push({id:genId(), hour:hh, min:mm, enabled:true}); saveAll(); renderAlarms(); alarmTimeInput.value='';
  });

  function playAlarmSound(){ try{ const ctx=new (window.AudioContext||window.webkitAudioContext)(); const gain=ctx.createGain(); gain.connect(ctx.destination); gain.gain.value=0.0001; let t0=ctx.currentTime; for(let i=0;i<6;i++){ const o=ctx.createOscillator(); o.type='sine'; o.frequency.value=880-i*40; o.connect(gain); o.start(t0+i*0.5); o.stop(t0+i*0.5+0.35); } gain.gain.exponentialRampToValueAtTime(0.25,t0+0.02); gain.gain.exponentialRampToValueAtTime(0.0001,t0+3.2); setTimeout(()=>{ try{ ctx.close(); }catch(e){} },4000); }catch(e){} }

  if('Notification' in window && Notification.permission==='default'){ Notification.requestPermission().catch(()=>{}); }

  function tick(now){
    let dt=now-lastFrame; if(!isFinite(dt)||dt<=0) dt=16; lastFrame=now;
    const speed=24/customHours;
    if(running){ elapsedMs+=dt*speed; }
    if(mode==='clock'){
      const d=new Date();
      const secOfDay=d.getHours()*3600+d.getMinutes()*60+d.getSeconds()+d.getMilliseconds()/1000;
      const virtual=secOfDay*speed;
      const h=Math.floor(virtual/3600)%24;
      const m=Math.floor(virtual/60)%60;
      const s=Math.floor(virtual)%60;
      display.textContent=showSeconds?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    } else if(mode==='stopwatch'){ display.textContent=formatStopwatch(elapsedMs); }

    const nowReal=new Date();
    const keyNow=`${nowReal.getFullYear()}${String(nowReal.getMonth()+1).padStart(2,'0')}${String(nowReal.getDate()).padStart(2,'0')}${String(nowReal.getHours()).padStart(2,'0')}${String(nowReal.getMinutes()).padStart(2,'0')}`;
    if(nowReal.getSeconds()===0){
      alarms.forEach(a=>{ if(!a.enabled) return; if(a.hour===nowReal.getHours() && a.min===nowReal.getMinutes()){ if(lastTriggered!==keyNow){ lastTriggered=keyNow; saveAll(); try{ if(Notification.permission==='granted'){ new Notification('N Clock',{body:`${t('msg.alarmSound')}: ${String(a.hour).padStart(2,'0')}:${String(a.min).padStart(2,'0')}`}); } }catch(e){} playAlarmSound(); alert(`${t('msg.alarmSound')}: ${String(a.hour).padStart(2,'0')}:${String(a.min).padStart(2,'0')}`); } } }); 
    }
    requestAnimationFrame(tick);
  }

  lastFrame=performance.now();
  requestAnimationFrame(tick);
  setInterval(saveAll,2000);
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
});                                                                                                                                                                                                                                                                                                                                     

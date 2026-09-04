
(() => {
  "use strict";

  const STORAGE_KEY = "dailyLiftState.v1";
  const APP_VERSION = 1;

  const defaultState = {
    version: APP_VERSION,
    completedWorkouts: 0,
    lifetimeVolume: 0,
    topWorkouts: [],
    bests: {},
    repBests: {},
    workouts: [
      {
        id: cryptoRandomId(),
        name: "Push",
        description: "",
        exercises: [
          {id:cryptoRandomId(), name:"Bench Press", icon:"🏋️", mode:"reps", sets:3, reps:6, repTargets:[6,6,6], seconds:30, trackBest:true},
          {id:cryptoRandomId(), name:"Incline DB Press", icon:"💪", mode:"reps", sets:3, reps:8, repTargets:[8,8,8], seconds:30, trackBest:true},
          {id:cryptoRandomId(), name:"Plank", icon:"⏱️", mode:"time", sets:3, reps:1, repTargets:[1,1,1], seconds:30, trackBest:false}
        ]
      },
      {
        id: cryptoRandomId(),
        name: "Pull",
        description: "",
        exercises: [
          {id:cryptoRandomId(), name:"Lat Pulldown", icon:"🧗", mode:"reps", sets:3, reps:8, repTargets:[8,8,8], seconds:30, trackBest:true},
          {id:cryptoRandomId(), name:"Seated Row", icon:"🚣", mode:"reps", sets:3, reps:8, repTargets:[8,8,8], seconds:30, trackBest:true},
          {id:cryptoRandomId(), name:"Dead Hang", icon:"⏱️", mode:"time", sets:3, reps:1, repTargets:[1,1,1], seconds:45, trackBest:false}
        ]
      },
      {
        id: cryptoRandomId(),
        name: "Legs",
        description: "",
        exercises: [
          {id:cryptoRandomId(), name:"Squat", icon:"🦵", mode:"reps", sets:3, reps:5, repTargets:[5,5,5], seconds:30, trackBest:true},
          {id:cryptoRandomId(), name:"Romanian Deadlift", icon:"🏋️", mode:"reps", sets:3, reps:8, repTargets:[8,8,8], seconds:30, trackBest:true},
          {id:cryptoRandomId(), name:"Wall Sit", icon:"⏱️", mode:"time", sets:3, reps:1, repTargets:[1,1,1], seconds:40, trackBest:false}
        ]
      }
    ]
  };

  let state = loadState();
  let screen = "home";
  let builderIndex = null;
  let builderDraft = null;

  let session = null;
  let sessionClock = null;
  let countdown = null;
  let factIndex = 0;

  const app = document.getElementById("app");
  app.className = "app";

  function cryptoRandomId(){
    if (globalThis.crypto && crypto.getRandomValues) {
      const a = new Uint32Array(2); crypto.getRandomValues(a);
      return [...a].map(x => x.toString(16)).join("-");
    }
    return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return normalizeState(structuredCloneSafe(defaultState));
      const parsed = JSON.parse(raw);
      if(!parsed || !Array.isArray(parsed.workouts)) return normalizeState(structuredCloneSafe(defaultState));
      return normalizeState({...structuredCloneSafe(defaultState), ...parsed});
    }catch{
      return normalizeState(structuredCloneSafe(defaultState));
    }
  }

  function normalizeState(next){
    if(!next.repBests || typeof next.repBests!=="object") next.repBests={};
    if(!next.bests || typeof next.bests!=="object") next.bests={};
    next.workouts.forEach(w=>{
      if(typeof w.description!=="string") w.description="";
      w.exercises.forEach(ex=>{
        ex.sets=Math.max(1,Math.min(20,Number(ex.sets)||1));
        const fallback=Math.max(1,Math.min(100,Number(ex.reps)||1));
        if(!Array.isArray(ex.repTargets)) ex.repTargets=Array(ex.sets).fill(fallback);
        ex.repTargets=Array.from({length:ex.sets},(_,i)=>Math.max(1,Math.min(100,Number(ex.repTargets[i])||fallback)));
        ex.reps=ex.repTargets[0]||fallback;
        const oldBest=Number(next.bests?.[ex.id])||0;
        if(oldBest>0){
          if(!next.repBests[ex.id] || typeof next.repBests[ex.id]!=="object") next.repBests[ex.id]={};
          const key=String(ex.reps);
          if(!Number(next.repBests[ex.id][key])) next.repBests[ex.id][key]=oldBest;
        }
      });
    });
    return next;
  }

  function saveState(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch{ toast("Could not save on this device."); }
  }

  function structuredCloneSafe(v){
    return JSON.parse(JSON.stringify(v));
  }

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function fmtTime(sec){
    sec = Math.max(0, Math.floor(sec));
    return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0");
  }

  function sessionElapsed(){
    return session?.startedAt ? Math.floor((Date.now()-session.startedAt)/1000) : 0;
  }

  function repTarget(ex,si){
    const fallback=Math.max(1,Number(ex.reps)||1);
    return Math.max(1,Number(ex.repTargets?.[si])||fallback);
  }

  function overallBest(exerciseId){
    return Number(state.bests[exerciseId])||0;
  }

  function bestForReps(exerciseId,reps){
    return Number(state.repBests?.[exerciseId]?.[String(reps)])||0;
  }

  function currentVolume(){
    if(!session) return 0;
    let total=0;
    session.workout.exercises.forEach((ex,ei)=>{
      if(ex.mode !== "reps") return;
      session.logs[ei].forEach((log,si)=>{
        if(log.done) total += (Number(log.weight)||0) * repTarget(ex,si);
      });
    });
    return total;
  }

  function render(){
    stopCountdown();
    if(screen==="home") renderHome();
    else if(screen==="choose") renderChoose();
    else if(screen==="workouts") renderWorkouts();
    else if(screen==="builder") renderBuilder();
    else if(screen==="board") renderBoard();
    else if(screen==="active") renderActive();
    else if(screen==="records") renderRecords();
    else if(screen==="complete") renderComplete();
  }

  function topThreeRows(){
    const rows = [...state.topWorkouts].sort((a,b)=>b.volume-a.volume).slice(0,3);
    if(!rows.length) return `<div class="item muted">Complete a workout to start your leaderboard.</div>`;
    return rows.map(x=>`<div class="item row"><span>${esc(x.name)}</span><strong>${Math.round(x.volume).toLocaleString()} lb</strong></div>`).join("");
  }

  function weightFact(){
    const x = state.lifetimeVolume;
    const facts = [
      {value:Math.round(x).toLocaleString(), label:"lb moved ↻", note:"Your lifetime training volume."},
      {value:(x/2000).toFixed(1), label:"US tons ↻", note:"Equivalent to 2,000 lb US tons."},
      {value:(x/3300).toFixed(1), label:"cars ↻", note:"Approx. 3,300 lb passenger cars."},
      {value:(x/12000).toFixed(1), label:"elephants ↻", note:"Approx. 12,000 lb adult elephants."},
      {value:(x/700).toFixed(0), label:"grand pianos ↻", note:"Approx. 700 lb grand pianos."},
      {value:(x/250).toFixed(0), label:"refrigerators ↻", note:"Approx. 250 lb refrigerators."}
    ];
    return facts[factIndex % facts.length];
  }

  function renderHome(){
    const fact = weightFact();
    app.innerHTML = `
      <div class="topbar">
        <div><div class="eyebrow">DAILY LIFT</div><div class="title">Ready to train?</div></div>
        <div class="icon">🏋️</div>
      </div>

      <section class="card">
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${state.completedWorkouts}</div>
            <div class="stat-label">completed workouts</div>
          </div>
          <div class="stat">
            <button id="weightFactBtn" type="button" aria-label="Cycle lifetime weight fun facts">
              <div class="stat-value">${esc(fact.value)}</div>
              <div class="stat-label">${esc(fact.label)}</div>
            </button>
          </div>
        </div>
        <button id="startBtn" class="btn primary block" type="button">Start Workout</button>
      </section>

      <section class="card">
        <div class="row"><strong>Top 3 Workouts</strong><span class="small">Most weight moved</span></div>
        <div class="list top3">${topThreeRows()}</div>
      </section>

      <div class="grid2">
        <button id="manageBtn" class="btn" type="button">Manage Workouts</button>
        <button id="recordsBtn" class="btn" type="button">Best Efforts</button>
      </div>
    `;
    document.getElementById("weightFactBtn").addEventListener("click",()=>{factIndex=(factIndex+1)%6;renderHome();});
    document.getElementById("startBtn").addEventListener("click",()=>{screen="choose";render();});
    document.getElementById("manageBtn").addEventListener("click",()=>{screen="workouts";render();});
    document.getElementById("recordsBtn").addEventListener("click",()=>{screen="records";render();});
  }

  function renderChoose(){
    app.innerHTML = `
      <div class="topbar"><button id="back" class="btn" type="button">← Home</button><div class="screen-title">Choose Workout</div><span></span></div>
      <div class="list">
      ${state.workouts.map((w,i)=>`
        <button class="item row" type="button" data-pick="${i}">
          <span><strong>${esc(w.name)}</strong><span class="small">${w.exercises.length} exercises</span></span><span>›</span>
        </button>`).join("")}
      </div>`;
    document.getElementById("back").addEventListener("click",()=>{screen="home";render();});
    app.querySelectorAll("[data-pick]").forEach(btn=>btn.addEventListener("click",()=>startSession(Number(btn.dataset.pick))));
  }

  function renderWorkouts(){
    app.innerHTML = `
      <div class="topbar"><button id="back" class="btn" type="button">← Home</button><div class="screen-title">My Workouts</div><button id="new" class="btn primary" type="button">+ New</button></div>
      <div class="list">
      ${state.workouts.map((w,i)=>`
        <div class="item row">
          <div><strong>${esc(w.name)}</strong><div class="small">${w.exercises.length} exercises</div></div>
          <button class="btn" type="button" data-edit="${i}">Edit</button>
        </div>`).join("")}
      </div>`;
    document.getElementById("back").addEventListener("click",()=>{screen="home";render();});
    document.getElementById("new").addEventListener("click",()=>openBuilder(null));
    app.querySelectorAll("[data-edit]").forEach(btn=>btn.addEventListener("click",()=>openBuilder(Number(btn.dataset.edit))));
  }

  function openBuilder(index){
    builderIndex = index;
    builderDraft = index===null ? {id:cryptoRandomId(),name:"New Workout",description:"",exercises:[]} : structuredCloneSafe(state.workouts[index]);
    screen="builder"; render();
  }

  function renderBuilder(){
    app.innerHTML = `
      <div class="topbar"><button id="back" class="btn" type="button">← Workouts</button><div class="screen-title">Workout Builder</div><button id="save" class="btn primary" type="button">Save</button></div>
      <section class="card">
        <label><span>Workout name</span><input id="workoutName" maxlength="40" value="${esc(builderDraft.name)}"></label>
        <label class="field-gap"><span>Workout description</span><textarea id="workoutDescription" maxlength="300" placeholder="Optional workout notes">${esc(builderDraft.description||"")}</textarea></label>
      </section>
      <div id="exerciseBuilder" class="list">
        ${builderDraft.exercises.map((e,i)=>exerciseEditor(e,i)).join("")}
      </div>
      <button id="addEx" class="btn block" type="button">+ Add Exercise</button>
    `;

    document.getElementById("back").addEventListener("click",()=>{screen="workouts";render();});
    document.getElementById("workoutName").addEventListener("input",e=>{builderDraft.name=e.target.value;});
    document.getElementById("workoutDescription").addEventListener("input",e=>{builderDraft.description=e.target.value;});
    document.getElementById("addEx").addEventListener("click",()=>{
      builderDraft.exercises.push({id:cryptoRandomId(),name:"New Exercise",icon:"🏋️",mode:"reps",sets:3,reps:8,repTargets:[8,8,8],seconds:30,trackBest:false});
      renderBuilder();
    });
    document.getElementById("save").addEventListener("click", saveBuilder);

    app.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{
      const i=Number(b.dataset.mode), val=b.dataset.value;
      builderDraft.exercises[i].mode=val;
      if(val==="time") builderDraft.exercises[i].trackBest=false;
      if(val==="reps" && !Array.isArray(builderDraft.exercises[i].repTargets)){
        builderDraft.exercises[i].repTargets=Array(builderDraft.exercises[i].sets).fill(builderDraft.exercises[i].reps||8);
      }
      renderBuilder();
    }));
    app.querySelectorAll("[data-remove]").forEach(b=>b.addEventListener("click",()=>{
      builderDraft.exercises.splice(Number(b.dataset.remove),1); renderBuilder();
    }));

    bindBuilderInputs();
  }

  function exerciseEditor(e,i){
    const targets=Array.from({length:e.sets},(_,si)=>repTarget(e,si));
    return `
      <section class="card">
        <div class="row start">
          <div><strong>Exercise ${i+1}</strong></div>
          <button class="btn danger" type="button" data-remove="${i}">Remove</button>
        </div>

        <div class="form-grid">
          <label><span>Name</span><input data-field="name" data-i="${i}" maxlength="50" value="${esc(e.name)}"></label>
          <label><span>Icon</span><input data-field="icon" data-i="${i}" maxlength="4" value="${esc(e.icon)}"></label>
        </div>

        <div class="small">Exercise type</div>
        <div class="segmented">
          <button type="button" class="btn ${e.mode==="reps"?"active":""}" data-mode="${i}" data-value="reps">Sets + Reps</button>
          <button type="button" class="btn ${e.mode==="time"?"active":""}" data-mode="${i}" data-value="time">Timed</button>
        </div>

        <div class="form-grid">
          <label><span>${e.mode==="reps"?"Sets":"Rounds"}</span><input data-field="sets" data-i="${i}" type="number" inputmode="numeric" min="1" max="20" value="${e.sets}"></label>
          ${e.mode==="time"
            ? `<label><span>Seconds</span><input data-field="seconds" data-i="${i}" type="number" inputmode="numeric" min="5" max="1800" value="${e.seconds}"></label>`
            : `<div></div>`}
        </div>

        ${e.mode==="reps" ? `
          <div class="set-reps-grid">
            ${targets.map((r,si)=>`<label><span>Set ${si+1} reps</span><input data-rep-target="${si}" data-i="${i}" type="number" inputmode="numeric" min="1" max="100" value="${r}"></label>`).join("")}
          </div>
          <label class="checkrow"><input data-field="trackBest" data-i="${i}" type="checkbox" ${e.trackBest?"checked":""}><span>Track best effort / highest weight</span></label>
        ` : ``}
      </section>`;
  }

  function bindBuilderInputs(){
    app.querySelectorAll("[data-field]").forEach(el=>{
      const event = (el.type==="checkbox" || el.dataset.field==="sets") ? "change" : "input";
      el.addEventListener(event,()=>{
        const i=Number(el.dataset.i), field=el.dataset.field, ex=builderDraft.exercises[i];
        if(field==="trackBest"){ ex[field]=el.checked; return; }
        if(["sets","seconds"].includes(field)){
          const min=field==="seconds"?5:1, max=field==="seconds"?1800:20;
          const next=Math.max(min,Math.min(max,Number(el.value)||min));
          ex[field]=next;
          if(field==="sets"){
            const fallback=repTarget(ex,Math.max(0,(ex.repTargets?.length||1)-1));
            ex.repTargets=Array.from({length:next},(_,si)=>Math.max(1,Number(ex.repTargets?.[si])||fallback));
            renderBuilder();
          }
        }else{
          ex[field]=el.value;
        }
      });
    });
    app.querySelectorAll("[data-rep-target]").forEach(el=>{
      el.addEventListener("input",()=>{
        const i=Number(el.dataset.i), si=Number(el.dataset.repTarget), ex=builderDraft.exercises[i];
        if(!Array.isArray(ex.repTargets)) ex.repTargets=Array(ex.sets).fill(ex.reps||8);
        ex.repTargets[si]=Math.max(1,Math.min(100,Number(el.value)||1));
        ex.reps=ex.repTargets[0];
      });
    });
  }

  function saveBuilder(){
    builderDraft.name=(document.getElementById("workoutName").value||"Workout").trim().slice(0,40) || "Workout";
    builderDraft.description=(document.getElementById("workoutDescription")?.value||"").trim().slice(0,300);
    if(!builderDraft.exercises.length){toast("Add at least one exercise.");return;}
    builderDraft.exercises.forEach(ex=>{
      ex.name=(ex.name||"Exercise").trim().slice(0,50)||"Exercise";
      ex.icon=(ex.icon||"🏋️").slice(0,4);
      ex.sets=Math.max(1,Math.min(20,Number(ex.sets)||1));
      if(ex.mode==="reps"){
        const fallback=Math.max(1,Math.min(100,Number(ex.reps)||8));
        ex.repTargets=Array.from({length:ex.sets},(_,si)=>Math.max(1,Math.min(100,Number(ex.repTargets?.[si])||fallback)));
        ex.reps=ex.repTargets[0];
      }else ex.seconds=Math.max(5,Math.min(1800,Number(ex.seconds)||30));
    });
    if(builderIndex===null) state.workouts.push(builderDraft);
    else state.workouts[builderIndex]=builderDraft;
    saveState();
    screen="workouts"; render();
  }

  function startSession(index){
    const workout = structuredCloneSafe(state.workouts[index]);
    session = {
      workoutIndex:index,
      workout,
      logs:workout.exercises.map(ex=>Array.from({length:ex.sets},()=>({done:false,weight:0}))),
      selected:[],
      group:[],
      groupPointer:0,
      startedAt:Date.now(),
      summary:null
    };
    screen="board";
    startSessionClock();
    render();
  }

  function startSessionClock(){
    if(sessionClock) clearInterval(sessionClock);
    sessionClock=setInterval(()=>{
      const el=document.getElementById("sessionClock");
      if(el) el.textContent=fmtTime(sessionElapsed());
    },1000);
  }

  function renderBoard(){
    const total=session.workout.exercises.reduce((n,e)=>n+e.sets,0);
    const done=session.logs.reduce((n,a)=>n+a.filter(x=>x.done).length,0);
    app.innerHTML=`
      <div class="topbar">
        <button id="exit" class="btn" type="button">← Exit</button>
        <div class="center"><div class="screen-title">${esc(session.workout.name)}</div><div id="sessionClock" class="small">${fmtTime(sessionElapsed())}</div></div>
        <button id="finish" class="btn" type="button">Finish</button>
      </div>
      <section class="card">
        <div class="row start"><div><strong>Exercise Board</strong></div><span class="badge">${session.selected.length} selected</span></div>
        <div class="small">${done} of ${total} sets / rounds complete</div>
        <div class="list">
          ${session.workout.exercises.map((e,i)=>boardExercise(e,i)).join("")}
        </div>
        <button id="doSelected" class="btn primary block" type="button" ${session.selected.length?"":"disabled"}>${session.selected.length?`Do ${session.selected.length} Selected Exercise${session.selected.length>1?"s":""}`:"Select Exercises First"}</button>
      </section>`;
    document.getElementById("exit").addEventListener("click",()=>{endSessionClock();session=null;screen="home";render();});
    document.getElementById("finish").addEventListener("click", finishSession);
    document.getElementById("doSelected").addEventListener("click", beginGroup);
    app.querySelectorAll("[data-board]").forEach(btn=>btn.addEventListener("click",()=>{
      const i=Number(btn.dataset.board);
      if(session.logs[i].every(x=>x.done)) return;
      const pos=session.selected.indexOf(i);
      if(pos>=0) session.selected.splice(pos,1); else session.selected.push(i);
      renderBoard();
    }));
  }

  function boardExercise(e,i){
    const completed=session.logs[i].filter(x=>x.done).length;
    const finished=completed===e.sets;
    const pos=session.selected.indexOf(i);
    const repsText=e.mode==="reps"?Array.from({length:e.sets},(_,si)=>repTarget(e,si)).join(" / "):"";
    const desc=e.mode==="reps"?`${e.sets} sets · ${repsText} reps`:`${e.sets} × ${e.seconds} sec`;
    const best=overallBest(e.id);
    return `
      <button class="item ${pos>=0?"selected":""} ${finished?"done":""}" type="button" data-board="${i}">
        <div class="row">
          <div class="row start">
            <span class="icon">${esc(e.icon)}</span>
            <div>
              <div class="exercise-title">${esc(e.name)} <span class="badge">${e.mode==="reps"?"REPS":"TIME"}</span></div>
              <div class="small">${completed}/${e.sets} complete · ${desc}${e.trackBest?` · Best ${best?best+" lb":"—"}`:""}</div>
            </div>
          </div>
          <div>${finished?"✅":pos>=0?`<span class="group-order">#${pos+1}</span>`:"○"}</div>
        </div>
      </button>`;
  }

  function nextIncomplete(ei){
    return session.logs[ei].findIndex(x=>!x.done);
  }

  function beginGroup(){
    session.group=session.selected.filter(i=>nextIncomplete(i)>=0);
    session.groupPointer=0;
    if(!session.group.length) return;
    screen="active"; render();
  }

  function renderActive(){
    session.group=session.group.filter(i=>nextIncomplete(i)>=0);
    if(!session.group.length){
      session.selected=[];
      screen="board";
      render();
      return;
    }
    if(session.groupPointer>=session.group.length) session.groupPointer=0;

    const ei=session.group[session.groupPointer];
    const e=session.workout.exercises[ei];
    const si=nextIncomplete(ei);
    const nextPointer=(session.groupPointer+1)%session.group.length;
    const nei=session.group[nextPointer];
    const ne=session.workout.exercises[nei];
    const nsi=nextIncomplete(nei);
    const currentReps=e.mode==="reps"?repTarget(e,si):0;
    const nextReps=ne.mode==="reps"?repTarget(ne,nsi):0;
    const repBest=e.mode==="reps"?bestForReps(e.id,currentReps):0;
    const workoutDescription=(session.workout.description||"").trim();
    app.innerHTML=`
      <div class="topbar"><button id="backBoard" class="btn" type="button">← Board</button><div class="small">${session.groupPointer+1} of ${session.group.length}</div><div id="sessionClock" class="small">${fmtTime(sessionElapsed())}</div></div>
      <section class="card center">
        <div class="hero-icon">${esc(e.icon)}</div>
        <div class="active-name">${esc(e.name)}</div>
        <div class="active-detail">${e.mode==="reps"?`Set ${si+1} of ${e.sets} · ${currentReps} reps`:`Round ${si+1} of ${e.sets} · ${e.seconds} seconds`}</div>

        ${e.mode==="reps"
          ? `<label class="center weight-entry"><span>Weight used</span><input id="weightInput" inputmode="decimal" min="0" max="5000" placeholder="Enter weight"></label>`
          : `<div><div id="timerDisplay" class="timer">${e.seconds}</div><div class="small">seconds</div><button id="timerBtn" class="btn block" type="button">Start Timer</button></div>`}

        <button id="completeSet" class="btn primary block complete-set-btn" type="button">${e.mode==="reps"?"Complete Set":"Complete Round"}</button>
      </section>

      ${workoutDescription?`<section class="card info-bubble"><div class="small">WORKOUT DESCRIPTION</div><div>${esc(workoutDescription)}</div></section>`:""}

      <section class="card info-bubble">
        <div class="small">UP NEXT</div>
        <div class="row start"><span class="icon">${esc(ne.icon)}</span><div><strong>${esc(ne.name)}</strong><div class="small">${ne.mode==="reps"?`Set ${nsi+1} · ${nextReps} reps`:`Round ${nsi+1} · ${ne.seconds} sec`}</div></div></div>
      </section>

      ${e.mode==="reps"&&e.trackBest?`<section class="card info-bubble"><div class="small">BEST FOR ${currentReps} REPS</div><strong>${repBest?repBest+" lb":"No best yet"}</strong></section>`:""}`;

    document.getElementById("backBoard").addEventListener("click",()=>{
      stopCountdown(); session.selected=[]; screen="board"; render();
    });
    document.getElementById("completeSet").addEventListener("click",()=>completeCurrent(ei,e,si));
    if(e.mode==="time") document.getElementById("timerBtn").addEventListener("click",()=>startCountdown(e.seconds));
  }

  function startCountdown(seconds){
    if(countdown) return;
    let left=seconds;
    const display=document.getElementById("timerDisplay");
    const btn=document.getElementById("timerBtn");
    btn.disabled=true; btn.textContent="Running…";
    countdown=setInterval(()=>{
      left--;
      if(display) display.textContent=Math.max(0,left);
      if(left<=0){
        stopCountdown();
        if(btn){btn.disabled=false;btn.textContent="Done ✓";}
      }
    },1000);
  }

  function stopCountdown(){
    if(countdown){clearInterval(countdown);countdown=null;}
  }

  function completeCurrent(ei,e,si){
    let weight=0;
    if(e.mode==="reps"){
      weight=Math.max(0,Math.min(5000,Number(document.getElementById("weightInput").value)||0));
    }
    session.logs[ei][si]={done:true,weight};

    if(e.mode==="reps" && e.trackBest && weight>0){
      const reps=repTarget(e,si);
      const current=overallBest(e.id);
      if(weight>current) state.bests[e.id]=weight;
      if(!state.repBests[e.id] || typeof state.repBests[e.id]!=="object") state.repBests[e.id]={};
      const repKey=String(reps);
      const currentRepBest=Number(state.repBests[e.id][repKey])||0;
      if(weight>currentRepBest) state.repBests[e.id][repKey]=weight;
    }

    if(nextIncomplete(ei)<0){
      session.group=session.group.filter(x=>x!==ei);
      if(session.groupPointer>=session.group.length) session.groupPointer=0;
    } else if(session.group.length){
      session.groupPointer=(session.groupPointer+1)%session.group.length;
    }

    if(!session.group.length){
      saveState();
      session.selected=[];
      screen="board";
      render();
      return;
    }
    saveState();
    renderActive();
  }

  function finishSession(){
    const duration=sessionElapsed();
    const sets=session.logs.reduce((n,a)=>n+a.filter(x=>x.done).length,0);
    const volume=currentVolume();

    state.completedWorkouts += 1;
    state.lifetimeVolume += volume;
    state.topWorkouts.push({name:session.workout.name,volume:Math.round(volume),completedAt:new Date().toISOString()});
    state.topWorkouts=state.topWorkouts.sort((a,b)=>b.volume-a.volume).slice(0,20);
    saveState();

    session.summary={name:session.workout.name,duration,sets,volume};
    endSessionClock();
    screen="complete";
    render();
  }

  function renderComplete(){
    const s=session.summary;
    app.innerHTML=`
      <section class="card center">
        <div class="hero-icon">🏆</div>
        <div class="title">Workout Complete</div>
        <div class="muted">${esc(s.name)}</div>
        <div class="summary-grid">
          <div class="stat"><div class="stat-value">${fmtTime(s.duration)}</div><div class="stat-label">duration</div></div>
          <div class="stat"><div class="stat-value">${s.sets}</div><div class="stat-label">sets / rounds</div></div>
          <div class="stat"><div class="stat-value">${Math.round(s.volume).toLocaleString()}</div><div class="stat-label">lb moved</div></div>
        </div>
        <button id="done" class="btn primary block" type="button">Back Home</button>
      </section>`;
    document.getElementById("done").addEventListener("click",()=>{session=null;screen="home";render();});
  }

  function renderRecords(){
    const rows=[];
    state.workouts.forEach(w=>w.exercises.forEach(e=>{
      if(e.mode==="reps" && e.trackBest) rows.push({workout:w.name,exercise:e,best:overallBest(e.id)});
    }));
    app.innerHTML=`
      <div class="topbar"><button id="back" class="btn" type="button">← Home</button><div class="screen-title">Best Efforts</div><span></span></div>
      <div class="list">${rows.length?rows.map(r=>`
        <div class="item row">
          <div><strong>${esc(r.exercise.icon)} ${esc(r.exercise.name)}</strong><div class="small">${esc(r.workout)}</div></div>
          <strong>${r.best?r.best+" lb":"—"}</strong>
        </div>`).join(""):`<div class="item muted">No exercises are set to track best effort yet.</div>`}</div>`;
    document.getElementById("back").addEventListener("click",()=>{screen="home";render();});
  }

  function endSessionClock(){
    if(sessionClock){clearInterval(sessionClock);sessionClock=null;}
    stopCountdown();
  }

  function toast(message){
    const old=app.querySelector(".toast"); if(old) old.remove();
    const el=document.createElement("div"); el.className="toast"; el.textContent=message; app.appendChild(el);
    setTimeout(()=>el.remove(),2200);
  }

  // iOS Safari gesture suppression, in addition to the non-zoom viewport.
  ["gesturestart","gesturechange","gestureend"].forEach(type=>{
    document.addEventListener(type,e=>e.preventDefault(),{passive:false});
  });

  // Prevent double-tap zoom while preserving normal single-tap controls.
  let lastTouchEnd=0;
  document.addEventListener("touchend",e=>{
    const now=Date.now();
    if(now-lastTouchEnd<=300) e.preventDefault();
    lastTouchEnd=now;
  },{passive:false});

  window.addEventListener("beforeunload",()=>endSessionClock());

  render();
})();


if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

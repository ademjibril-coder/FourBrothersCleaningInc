/* Shared storage + auth helpers for the Four Brothers dashboard.
   Data lives in this browser's localStorage only — it does not sync
   between different devices or browsers. */

const DASH_KEY = 'fb_dashboard_v1';

function loadDashboard(){
  const raw = localStorage.getItem(DASH_KEY);
  if(raw){
    try{ return JSON.parse(raw); }catch(e){ /* fall through to reseed */ }
  }
  const seed = { jobs: [], notes: [] };
  localStorage.setItem(DASH_KEY, JSON.stringify(seed));
  return seed;
}

function saveDashboard(data){
  localStorage.setItem(DASH_KEY, JSON.stringify(data));
}

function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

function fmtDate(d){
  if(!d) return '';
  const dt = new Date(d + 'T00:00:00');
  if(isNaN(dt)) return d;
  return dt.toLocaleDateString('en-CA', { weekday:'short', month:'short', day:'numeric' });
}

/* Redirects to login.html if the current tab isn't signed in with `role`. */
function requireRole(role){
  const current = sessionStorage.getItem('fb_role');
  if(current !== role){
    window.location.href = 'login.html';
  }
}

function logout(){
  sessionStorage.removeItem('fb_role');
  window.location.href = 'login.html';
}

/* Firestore + Auth helpers shared by login.html, admin.html, staff.html.
   Requires firebase-config.js to be loaded first. */

function fmtDate(d){
  if(!d) return '';
  const dt = new Date(d + 'T00:00:00');
  if(isNaN(dt)) return d;
  return dt.toLocaleDateString('en-CA', { weekday:'short', month:'short', day:'numeric' });
}

/* Looks up this user's role from the /roles/{uid} document.
   Returns a Promise resolving to 'admin', 'staff', or null. */
function getUserRole(uid){
  return db.collection('roles').doc(uid).get().then(doc => doc.exists ? doc.data().role : null);
}

/* Confirms the signed-in user has `expectedRole`, then calls onReady(user).
   Sends anyone not signed in, or signed in with the wrong role, to login.html. */
function requireRole(expectedRole, onReady){
  auth.onAuthStateChanged(user => {
    if(!user){
      window.location.href = 'login.html';
      return;
    }
    getUserRole(user.uid).then(role => {
      if(role !== expectedRole){
        window.location.href = 'login.html';
        return;
      }
      onReady(user, role);
    });
  });
}

function logout(){
  auth.signOut().then(() => { window.location.href = 'login.html'; });
}

/* Change the signed-in user's password. Re-authenticates with their
   current password first, as Firebase requires a recent sign-in
   before allowing a password change. Returns a rejected promise with
   a friendly message on failure. */
function changePassword(currentPassword, newPassword){
  const user = auth.currentUser;
  if(!user) return Promise.reject(new Error('You need to be signed in to do that.'));
  const cred = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
  return user.reauthenticateWithCredential(cred)
    .catch(() => { throw new Error('Current password is incorrect.'); })
    .then(() => user.updatePassword(newPassword))
    .catch(err => {
      if(err.message === 'Current password is incorrect.') throw err;
      throw new Error('Could not update password. Try a longer password and try again.');
    });
}

/* ---------- gallery: photos & videos ---------- */
/* Requires firebase-storage-compat.js to be loaded alongside the
   other Firebase SDK scripts, in addition to app/auth/firestore. */
const storage = firebase.storage();

function watchMedia(callback){
  return db.collection('media').orderBy('order').onSnapshot(snap => {
    const media = [];
    snap.forEach(doc => media.push({ id: doc.id, ...doc.data() }));
    callback(media);
  });
}

/* Uploads a photo or video file to Storage, then records it in the
   'media' collection so it shows up in the site's gallery slider.
   onProgress(percent) is called as the upload advances. */
function uploadMedia(file, onProgress){
  const type = file.type.startsWith('video') ? 'video' : 'image';
  const path = 'media/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const ref = storage.ref().child(path);
  const task = ref.put(file);
  return new Promise((resolve, reject) => {
    task.on('state_changed',
      snap => { if(onProgress) onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)); },
      reject,
      () => {
        task.snapshot.ref.getDownloadURL().then(url => {
          db.collection('media').add({
            url, type, path,
            order: Date.now(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }).then(resolve).catch(reject);
        }).catch(reject);
      }
    );
  });
}

function deleteMedia(id, path){
  const jobs = [db.collection('media').doc(id).delete()];
  if(path) jobs.push(storage.ref().child(path).delete().catch(() => {}));
  return Promise.all(jobs);
}

/* ---------- quote requests (from the public site) ---------- */

function watchQuotes(callback){
  return db.collection('quotes').orderBy('createdAt', 'desc').onSnapshot(snap => {
    const quotes = [];
    snap.forEach(doc => quotes.push({ id: doc.id, ...doc.data() }));
    callback(quotes);
  });
}

/* Called from index.html's quote form. Every new quote starts unread
   so the admin dashboard can badge it as a notification. */
function addQuote(quote){
  return db.collection('quotes').add({
    ...quote,
    read: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}
function markQuoteRead(id, read){
  return db.collection('quotes').doc(id).update({ read: read !== false });
}
function deleteQuote(id){ return db.collection('quotes').doc(id).delete(); }

/* ---------- jobs ---------- */

function watchJobs(callback){
  return db.collection('jobs').orderBy('date').onSnapshot(snap => {
    const jobs = [];
    snap.forEach(doc => jobs.push({ id: doc.id, ...doc.data() }));
    callback(jobs);
  });
}
function addJob(job){ return db.collection('jobs').add(job); }
function updateJob(id, changes){ return db.collection('jobs').doc(id).update(changes); }
function deleteJob(id){ return db.collection('jobs').doc(id).delete(); }

/* ---------- team notes ---------- */

function watchNotes(callback){
  return db.collection('notes').orderBy('date', 'desc').onSnapshot(snap => {
    const notes = [];
    snap.forEach(doc => notes.push({ id: doc.id, ...doc.data() }));
    callback(notes);
  });
}
function addNote(note){ return db.collection('notes').add(note); }
function deleteNote(id){ return db.collection('notes').doc(id).delete(); }

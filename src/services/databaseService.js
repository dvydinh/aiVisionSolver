import { db } from '../config/firebaseConfig'
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore'

export async function createSession(sessionId, creatorRole) {
  await setDoc(doc(db, 'sessions', sessionId), {
    creatorRole,
    status: 'idle',
    result: '',
    timestamp: 0,
  })
}

export async function getSession(sessionId) {
  const snapshot = await getDoc(doc(db, 'sessions', sessionId))
  if (snapshot.exists()) return snapshot.data()
  return null
}

export async function updateStatus(sessionId, status) {
  await setDoc(
    doc(db, 'sessions', sessionId),
    { status },
    { merge: true }
  )
}

export async function pushAnswer(sessionId, { result, timestamp }) {
  await setDoc(
    doc(db, 'sessions', sessionId),
    { status: 'done', result, timestamp },
    { merge: true }
  )
}

export function subscribeToSession(sessionId, callback) {
  return onSnapshot(doc(db, 'sessions', sessionId), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data())
    }
  })
}

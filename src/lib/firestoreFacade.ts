// Drop-in replacement for 'firebase/firestore' imports across this app's
// service files. Every function here checks isDemoMode() and routes to
// either the real Firebase SDK or the local browser-only mock in
// demoFirestore.ts. This is the ONLY thing that decides where a read/write
// actually goes — service files themselves are unaware of demo mode.
import * as real from 'firebase/firestore';
import * as demo from './demoFirestore';
import { isDemoMode } from './demoMode';

export function collection(db: any, path: string): any {
  return isDemoMode() ? demo.collection(db, path) : real.collection(db, path);
}

export function doc(...args: any[]): any {
  return isDemoMode() ? (demo.doc as any)(...args) : (real.doc as any)(...args);
}

export function getDocs(q: any): any {
  return isDemoMode() ? demo.getDocs(q) : real.getDocs(q);
}

export function getDoc(ref: any): any {
  return isDemoMode() ? demo.getDoc(ref) : real.getDoc(ref);
}

export function addDoc(colRef: any, data: any): any {
  return isDemoMode() ? demo.addDoc(colRef, data) : real.addDoc(colRef, data);
}

export function updateDoc(ref: any, data: any): any {
  return isDemoMode() ? demo.updateDoc(ref, data) : real.updateDoc(ref, data);
}

export function deleteDoc(ref: any): any {
  return isDemoMode() ? demo.deleteDoc(ref) : real.deleteDoc(ref);
}

export function query(base: any, ...clauses: any[]): any {
  return isDemoMode() ? (demo.query as any)(base, ...clauses) : (real.query as any)(base, ...clauses);
}

export function where(field: string, op: any, value: any): any {
  return isDemoMode() ? demo.where(field, op, value) : real.where(field, op, value);
}

export function orderBy(field: string, dir?: 'asc' | 'desc'): any {
  return isDemoMode() ? demo.orderBy(field, dir) : real.orderBy(field, dir as any);
}

export function limit(n: number): any {
  return isDemoMode() ? demo.limit(n) : real.limit(n);
}

export function serverTimestamp(): any {
  return isDemoMode() ? demo.serverTimestamp() : real.serverTimestamp();
}

export function runTransaction(db: any, fn: any): any {
  return isDemoMode() ? demo.runTransaction(db, fn) : real.runTransaction(db, fn);
}

export function writeBatch(db: any): any {
  return isDemoMode() ? demo.writeBatch(db) : real.writeBatch(db);
}
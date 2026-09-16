import { collection, addDoc, serverTimestamp } from '../lib/firestoreFacade';
import { db } from '../firebase/config';
import { AuditLog } from '../types';

export async function logAuditEvent(
  user: { uid?: string; displayName?: string; email?: string } | null,
  action: string,
  module: AuditLog['module'],
  description: string,
  recordId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const logsRef = collection(db, 'auditLogs');
    await addDoc(logsRef, {
      userId: user?.uid || 'system',
      userName: user?.displayName || user?.email || 'System User',
      action,
      module,
      description,
      recordId: recordId || '',
      metadata: metadata || {},
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Non-blocking for primary UX, but logged for diagnostic tracking
    console.error('Failed to log audit event:', err);
  }
}
